//! Idempotency middleware for POST /wallet/transfer.
//!
//! Clients supply an `Idempotency-Key` UUID header with every transfer request.
//! On the first call the response is executed normally, then cached in Redis for
//! 24 hours keyed by that UUID.  Any repeat request with the same key within
//! that window receives the cached response immediately — the transfer is NOT
//! executed a second time.  This protects against network retries double-spending.

use crate::state::AppState;
use axum::{
    extract::State,
    http::{Request, StatusCode},
    middleware::Next,
    response::Response,
};
use deadpool_redis::redis::AsyncCommands;

/// Tower middleware — enforces idempotency on POST requests.
///
/// Flow:
/// 1. Require `Idempotency-Key` header → 400 if absent.
/// 2. Check Redis for a cached response under `idempotency:<key>`.
/// 3. Cache hit  → return cached JSON immediately (no handler called).
/// 4. Cache miss → run handler; on 2xx, serialise body → cache for 24 h.
pub async fn idempotency_middleware(
    State(state): State<AppState>,
    req: Request<axum::body::Body>,
    next: Next,
) -> Result<Response, (StatusCode, String)> {
    // Only POST requests carry idempotency semantics.
    if req.method() != axum::http::Method::POST {
        return Ok(next.run(req).await);
    }

    // Require the header — return 400 if the client omitted it.
    let idempotency_key = req
        .headers()
        .get("Idempotency-Key")
        .and_then(|h| h.to_str().ok())
        .map(|s| s.to_string())
        .ok_or_else(|| {
            (
                StatusCode::BAD_REQUEST,
                "Idempotency-Key header required".to_string(),
            )
        })?;

    // Namespace the Redis key to avoid collisions with other key spaces.
    let redis_key = format!("idempotency:{}", idempotency_key);

    let mut redis = state
        .redis
        .get()
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

    // Cache hit — return the stored response body without calling the handler.
    let cached_response: Option<String> = redis
        .get(&redis_key)
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

    if let Some(cached) = cached_response {
        return Ok(axum::response::Response::builder()
            .status(StatusCode::OK)
            .header("Content-Type", "application/json")
            // Echo the key back so the client knows this was a cached reply.
            .header("X-Idempotency-Key", &idempotency_key)
            .body(axum::body::Body::from(cached))
            .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?);
    }

    // Cache miss — execute the actual handler.
    let response = next.run(req).await;

    // Only cache successful (2xx) responses; errors must not be replayed.
    if response.status().is_success() {
        let (parts, body) = response.into_parts();

        // Drain the response body into memory so we can both cache and return it.
        let body_bytes = axum::body::to_bytes(body, usize::MAX)
            .await
            .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

        let body_string = String::from_utf8_lossy(&body_bytes).to_string();

        // Store in Redis with a 24-hour TTL (86 400 seconds).
        let _: () = redis
            .set_ex(&redis_key, &body_string, 86400u64)
            .await
            .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

        // Reconstruct the response from the buffered bytes.
        return Ok(axum::response::Response::from_parts(
            parts,
            axum::body::Body::from(body_bytes),
        ));
    }

    Ok(response)
}
