//! Sliding-window rate limiter middleware.
//!
//! Limits each unique client IP to 100 requests per 60-second window.
//! Implemented with a Redis sorted-set (ZADD / ZREMRANGEBYSCORE / ZCARD)
//! where each member is the request timestamp and the score is also the
//! timestamp — entries older than the window are pruned on every request.

use crate::state::AppState;
use axum::{
    extract::State,
    http::{Request, StatusCode},
    middleware::Next,
    response::Response,
};

/// Tower middleware — enforces per-IP rate limiting using a Redis sorted set.
///
/// Flow per request:
/// 1. Extract client IP from `ConnectInfo` extension (falls back to "unknown").
/// 2. Remove sorted-set members older than `now - 60 s` (sliding window).
/// 3. Count remaining members — if ≥ 100 → 429 Too Many Requests.
/// 4. Add current timestamp as a new member with a unique string member name.
/// 5. Set a 60-second TTL on the key so idle-client keys self-expire.
pub async fn rate_limit_middleware(
    State(state): State<AppState>,
    req: Request<axum::body::Body>,
    next: Next,
) -> Result<Response, StatusCode> {
    // Prefer the real remote IP; fall back to "unknown" for requests without
    // ConnectInfo (e.g. in unit tests or behind certain proxies).
    let client_ip = req
        .extensions()
        .get::<axum::extract::ConnectInfo<std::net::SocketAddr>>()
        .map(|ci| ci.0.ip().to_string())
        .unwrap_or_else(|| "unknown".to_string());

    // If Redis is not configured, allow the request through
    let mut redis = match state.redis().await {
        Ok(conn) => conn,
        Err(_) => return Ok(next.run(req).await),
    };

    // Namespace the key per IP to isolate each client's counter.
    let key = format!("rate_limit:{}", client_ip);

    let now = std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?
        .as_secs();

    // Anything older than this timestamp falls outside the current window.
    let window_start = now - 60; // 1-minute sliding window

    // Remove expired entries — keeps the sorted set from growing unboundedly.
    // Uses raw Redis command because ZREMRANGEBYSCORE is not always surfaced
    // through the AsyncCommands trait in older redis-rs versions.
    let _: () = deadpool_redis::redis::cmd("ZREMRANGEBYSCORE")
        .arg(&key)
        .arg(0i64)
        .arg(window_start as i64)
        .query_async(&mut *redis)
        .await
        .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;

    // Count how many requests are within the current 60-second window.
    let count: usize = deadpool_redis::redis::cmd("ZCARD")
        .arg(&key)
        .query_async(&mut *redis)
        .await
        .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;

    if count >= 100 {
        // Limit exceeded — return 429 without calling the next handler.
        return Err(StatusCode::TOO_MANY_REQUESTS);
    }

    // Record this request: member name is "timestamp-count" to ensure
    // uniqueness when multiple requests arrive in the same second.
    let member = format!("{}-{}", now, count);
    let _: () = deadpool_redis::redis::cmd("ZADD")
        .arg(&key)
        .arg(now as i64)
        .arg(&member)
        .query_async(&mut *redis)
        .await
        .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;

    // Set / refresh a 60-second TTL so the key is cleaned up automatically
    // after the window expires for inactive clients.
    let _: () = deadpool_redis::redis::cmd("EXPIRE")
        .arg(&key)
        .arg(60i64)
        .query_async(&mut *redis)
        .await
        .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;

    Ok(next.run(req).await)
}
