//! Authentication module — public endpoints for account lifecycle management.
//!
//! NOTE: Redis-dependent features (OTP, token refresh, rate limiting) are
//! temporarily disabled due to an upstream `redis` crate TLS bug (0.29-0.31).
//! Registration and login work, but OTP verification and token refresh return 503.

use crate::error::{AppError, Result};
use crate::middleware::auth::AuthUser;
use crate::state::AppState;
use crate::utils::{hash::hash_password, jwt::generate_access_token};
use axum::{extract::State, http::StatusCode, Json};
use serde::{Deserialize, Serialize};
use uuid::Uuid;
use validator::Validate;

// ── Request / Response DTOs ──────────────────────────────────────────────────

/// Input for POST /auth/register.
#[derive(Debug, Deserialize, Validate, utoipa::ToSchema)]
pub struct RegisterRequest {
    #[validate(email)]
    pub email: String,
    #[validate(length(min = 8))]
    pub password: String,
    pub name: String,
}

/// Input for POST /auth/login.
#[derive(Debug, Deserialize, Validate, utoipa::ToSchema)]
pub struct LoginRequest {
    #[validate(email)]
    pub email: String,
    pub password: String,
}

/// Returned on successful login.
#[derive(Debug, Serialize, utoipa::ToSchema)]
pub struct AuthResponse {
    pub access_token: String,
    pub refresh_token: String,
    pub user_id: Uuid,
    pub email: String,
}

/// Generic success message envelope.
#[derive(Debug, Serialize, utoipa::ToSchema)]
pub struct MessageResponse {
    pub message: String,
}

// ── Handlers ─────────────────────────────────────────────────────────────────

/// Registers a new user (auto-verified since OTP is disabled).
#[utoipa::path(
    post,
    path = "/auth/register",
    request_body = RegisterRequest,
    responses(
        (status = 201, description = "User registered successfully", body = MessageResponse),
        (status = 400, description = "Invalid input"),
        (status = 409, description = "Email already exists"),
    )
)]
pub async fn register(
    State(state): State<AppState>,
    Json(req): Json<RegisterRequest>,
) -> Result<(StatusCode, Json<MessageResponse>)> {
    req.validate()?;

    let existing_user =
        sqlx::query_scalar::<_, bool>("SELECT EXISTS(SELECT 1 FROM users WHERE email = $1)")
            .bind(&req.email)
            .fetch_one(&state.db)
            .await?;

    if existing_user {
        return Err(AppError::EmailAlreadyExists);
    }

    let password_hash = hash_password(&req.password)?;
    let account_number = crate::utils::account_number::generate_account_number();

    let user_id = sqlx::query_scalar::<_, Uuid>(
        r#"
        INSERT INTO users (email, password_hash, role, is_verified, full_name)
        VALUES ($1, $2, 'user', TRUE, $3)
        RETURNING id
        "#,
    )
    .bind(&req.email)
    .bind(&password_hash)
    .bind(&req.name)
    .fetch_one(&state.db)
    .await?;

    sqlx::query(
        r#"
        INSERT INTO wallets (user_id, balance_kobo, account_number, is_frozen)
        VALUES ($1, 0, $2, FALSE)
        "#,
    )
    .bind(user_id)
    .bind(&account_number)
    .execute(&state.db)
    .await?;

    // Auto-verify since OTP is disabled
    tracing::info!("User registered (auto-verified): {}", req.email);

    Ok((
        StatusCode::CREATED,
        Json(MessageResponse {
            message: "User registered successfully.".to_string(),
        }),
    ))
}

/// Authenticates a user and issues a JWT access token.
#[utoipa::path(
    post,
    path = "/auth/login",
    request_body = LoginRequest,
    responses(
        (status = 200, description = "Login successful", body = AuthResponse),
        (status = 401, description = "Invalid credentials"),
    )
)]
pub async fn login(
    State(state): State<AppState>,
    Json(req): Json<LoginRequest>,
) -> Result<Json<AuthResponse>> {
    req.validate()?;

    let (user_id, password_hash, role, _is_verified) =
        sqlx::query_as::<_, (Uuid, String, String, bool)>(
            "SELECT id, password_hash, role, is_verified FROM users WHERE email = $1",
        )
        .bind(&req.email)
        .fetch_optional(&state.db)
        .await?
        .ok_or(AppError::InvalidCredentials)?;

    if !crate::utils::hash::verify_password(&req.password, &password_hash)? {
        return Err(AppError::InvalidCredentials);
    }

    let access_token = generate_access_token(user_id, &req.email, &role, &state.config)?;
    // Refresh token is a placeholder since Redis is disabled
    let refresh_token = format!("refresh_disabled_{}", user_id);

    Ok(Json(AuthResponse {
        access_token,
        refresh_token,
        user_id,
        email: req.email,
    }))
}

/// Token refresh disabled — Redis is unavailable.
#[utoipa::path(
    post,
    path = "/auth/refresh",
    responses(
        (status = 503, description = "Service unavailable — Redis disabled"),
    )
)]
pub async fn refresh_token(
    _state: State<AppState>,
    _auth_user: AuthUser,
) -> Result<Json<serde_json::Value>> {
    Err(AppError::Internal)
}

/// Email verification disabled — Redis is unavailable.
pub async fn verify_email(
    _state: State<AppState>,
    _auth_user: AuthUser,
    _body: Json<serde_json::Value>,
) -> Result<Json<serde_json::Value>> {
    Err(AppError::Internal)
}

/// Password reset disabled — Redis is unavailable.
pub async fn forgot_password(
    _state: State<AppState>,
    _body: Json<serde_json::Value>,
) -> Result<Json<MessageResponse>> {
    Err(AppError::Internal)
}

/// Password reset disabled — Redis is unavailable.
pub async fn reset_password(
    _state: State<AppState>,
    _auth_user: AuthUser,
    _body: Json<serde_json::Value>,
) -> Result<Json<MessageResponse>> {
    Err(AppError::Internal)
}
