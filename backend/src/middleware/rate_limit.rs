//! Rate limiter middleware — currently disabled.
//!
//! NOTE: Redis is temporarily disabled due to an upstream crate TLS bug (0.29-0.31).
//! This middleware now passes all requests through without rate limiting.

use crate::state::AppState;
use axum::{
    extract::State,
    http::{Request, StatusCode},
    middleware::Next,
    response::Response,
};

pub async fn rate_limit_middleware(
    _state: State<AppState>,
    req: Request<axum::body::Body>,
    next: Next,
) -> Result<Response, StatusCode> {
    // Rate limiting disabled — pass through
    Ok(next.run(req).await)
}
