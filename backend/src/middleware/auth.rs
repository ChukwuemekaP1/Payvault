//! Authentication middleware and extractor.
//!
//! `auth_middleware`  — validates a Bearer JWT and injects `AuthUser` into
//!                      request extensions for every protected route.
//! `admin_middleware` — does the same JWT check PLUS enforces role == "admin".
//! `AuthUser`         — lightweight extractor that pulls the injected struct
//!                      out of extensions; any handler can declare it as a param.

use crate::error::AppError;
use crate::state::AppState;
use crate::utils::jwt::verify_token;
use axum::{
    extract::{FromRequestParts, State},
    http::{request::Parts, Request, StatusCode},
    middleware::Next,
    response::Response,
};
use uuid::Uuid;

/// Slim user identity injected into request extensions after JWT validation.
/// Handlers declare `auth_user: AuthUser` as a parameter to receive it.
#[derive(Clone)]
pub struct AuthUser {
    pub user_id: Uuid,
    pub email: String,
    pub role: String,
}

/// Axum extractor impl — pulls `AuthUser` from request extensions.
/// Returns `AppError::InvalidToken` (→ 401) if the middleware never ran
/// or the extension is otherwise absent.
impl<S> FromRequestParts<S> for AuthUser
where
    S: Send + Sync,
{
    type Rejection = AppError;

    async fn from_request_parts(parts: &mut Parts, _state: &S) -> Result<Self, Self::Rejection> {
        parts
            .extensions
            .get::<AuthUser>()
            .cloned()
            .ok_or(AppError::InvalidToken)
    }
}

/// Tower middleware for protected routes.
///
/// Flow: extract `Authorization: Bearer <token>` → verify JWT signature +
/// expiry → parse `sub` as UUID → insert `AuthUser` into extensions →
/// call the next handler.  Any failure short-circuits with 401.
pub async fn auth_middleware(
    State(state): State<AppState>,
    mut req: Request<axum::body::Body>,
    next: Next,
) -> Result<Response, (StatusCode, String)> {
    let auth_header = req
        .headers()
        .get(axum::http::header::AUTHORIZATION)
        .and_then(|h| h.to_str().ok());

    match auth_header {
        Some(header) if header.starts_with("Bearer ") => {
            let token = &header[7..];
            match verify_token(token, &state.config) {
                Ok(claims) => {
                    let user_id = Uuid::parse_str(&claims.sub)
                        .map_err(|_| (StatusCode::UNAUTHORIZED, "Invalid user ID".to_string()))?;

                    // Inject the resolved identity so downstream handlers can extract it.
                    req.extensions_mut().insert(AuthUser {
                        user_id,
                        email: claims.email,
                        role: claims.role,
                    });

                    Ok(next.run(req).await)
                }
                Err(_) => Err((
                    StatusCode::UNAUTHORIZED,
                    "Invalid or expired token".to_string(),
                )),
            }
        }
        _ => Err((
            StatusCode::UNAUTHORIZED,
            "Missing authorization header".to_string(),
        )),
    }
}

/// Tower middleware for admin-only routes.
///
/// Self-contained: performs the same JWT verification as `auth_middleware`
/// so admin routes don't need to stack both layers.  After auth succeeds,
/// checks `role == "admin"` — returns 403 if the user is authenticated but
/// lacks the admin role.
pub async fn admin_middleware(
    State(state): State<AppState>,
    mut req: Request<axum::body::Body>,
    next: Next,
) -> Result<Response, (StatusCode, String)> {
    // If AuthUser was already inserted by a prior layer, skip re-verification.
    if req.extensions().get::<AuthUser>().is_none() {
        let auth_header = req
            .headers()
            .get(axum::http::header::AUTHORIZATION)
            .and_then(|h| h.to_str().ok());

        match auth_header {
            Some(header) if header.starts_with("Bearer ") => {
                let token = &header[7..];
                match verify_token(token, &state.config) {
                    Ok(claims) => {
                        let user_id = Uuid::parse_str(&claims.sub).map_err(|_| {
                            (StatusCode::UNAUTHORIZED, "Invalid user ID".to_string())
                        })?;

                        req.extensions_mut().insert(AuthUser {
                            user_id,
                            email: claims.email,
                            role: claims.role,
                        });
                    }
                    Err(_) => {
                        return Err((
                            StatusCode::UNAUTHORIZED,
                            "Invalid or expired token".to_string(),
                        ));
                    }
                }
            }
            _ => {
                return Err((
                    StatusCode::UNAUTHORIZED,
                    "Missing authorization header".to_string(),
                ));
            }
        }
    }

    // Role gate — only "admin" users proceed.
    match req.extensions().get::<AuthUser>().cloned() {
        Some(auth_user) if auth_user.role == "admin" => Ok(next.run(req).await),
        Some(_) => Err((StatusCode::FORBIDDEN, "Admin access required".to_string())),
        None => Err((
            StatusCode::UNAUTHORIZED,
            "Authentication required".to_string(),
        )),
    }
}
