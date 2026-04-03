//! Idempotency middleware — currently disabled.
//!
//! NOTE: Redis is temporarily disabled due to an upstream crate TLS bug (0.29-0.31).
//! This middleware now passes all requests through without idempotency checks.

use axum::{
    http::{Request, StatusCode},
    middleware::Next,
    response::Response,
};

pub async fn idempotency_middleware(
    req: Request<axum::body::Body>,
    next: Next,
) -> Result<Response, (StatusCode, String)> {
    // Idempotency disabled — pass through
    Ok(next.run(req).await)
}
