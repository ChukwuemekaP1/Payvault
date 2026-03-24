//! Centralised error type for the entire API.
//! Every handler returns `Result<T, AppError>`. The `IntoResponse` impl
//! converts each variant into the correct HTTP status code + JSON body.
//! `#[from]` on each variant lets the `?` operator auto-convert library errors.

use axum::{
    http::StatusCode,
    response::{IntoResponse, Response},
    Json,
};
use serde_json::json;
use thiserror::Error;
use validator::ValidationErrors;

/// All error conditions the API can surface to callers.
/// Variants with `#[from]` are auto-converted via the `?` operator.
#[derive(Error, Debug)]
#[allow(dead_code)]
pub enum AppError {
    // ── Infrastructure errors ─────────────────────────────────────────────────
    /// Wraps sqlx query/pool errors; logs the detail, returns 500.
    #[error("Database error: {0}")]
    Database(#[from] sqlx::Error),

    /// Wraps redis command errors (e.g. GET/SET failures).
    #[error("Redis error: {0}")]
    Redis(#[from] deadpool_redis::redis::RedisError),

    /// Wraps deadpool pool-acquisition errors (pool exhausted / timeout).
    #[error("Redis pool error: {0}")]
    RedisPool(#[from] deadpool_redis::PoolError),

    /// Wraps jsonwebtoken encode/decode errors.
    #[error("JWT error: {0}")]
    Jwt(#[from] jsonwebtoken::errors::Error),

    /// Wraps validator field-level validation errors; returns 400 + details map.
    #[error("Validation error: {0}")]
    Validation(#[from] ValidationErrors),

    /// Wraps lettre message-build errors (bad headers, encoding).
    #[error("Email error: {0}")]
    Email(#[from] lettre::error::Error),

    /// Wraps lettre address-parse errors (malformed `To:` / `From:` strings).
    #[error("Email address error: {0}")]
    EmailAddress(#[from] lettre::address::AddressError),

    /// Wraps serde_json (de)serialisation errors, e.g. malformed webhook body.
    #[error("Serialization error: {0}")]
    Serialization(#[from] serde_json::Error),

    /// Wraps config-crate read errors surfaced only during startup.
    #[error("Configuration error: {0}")]
    Config(#[from] config::ConfigError),

    // ── Domain / business-logic errors ───────────────────────────────────────
    /// Queried a user that does not exist in `users`.
    #[error("User not found")]
    UserNotFound,

    /// Queried a wallet that does not exist in `wallets`.
    #[error("Wallet not found")]
    WalletNotFound,

    /// Transfer amount exceeds the sender's `balance_kobo`.
    #[error("Insufficient funds")]
    InsufficientFunds,

    /// Transfer attempted on a wallet where `is_frozen = TRUE`.
    #[error("Wallet is frozen")]
    WalletFrozen,

    /// Wrong email / password combination on login.
    #[error("Invalid credentials")]
    InvalidCredentials,

    /// JWT signature valid but `exp` claim has passed.
    #[error("Token expired")]
    TokenExpired,

    /// JWT could not be decoded (bad signature, wrong format, missing).
    #[error("Invalid token")]
    InvalidToken,

    /// Registration attempted with an email already in `users`.
    #[error("Email already exists")]
    EmailAlreadyExists,

    /// Fetched a transaction by ID that does not belong to the caller.
    #[error("Transaction not found")]
    TransactionNotFound,

    /// Amount field is zero, negative, or below the minimum (100 kobo).
    #[error("Invalid amount")]
    InvalidAmount,

    /// POST /wallet/transfer called without an `Idempotency-Key` header.
    #[error("Idempotency key required")]
    IdempotencyKeyRequired,

    /// Redis already holds a cached response for the supplied idempotency key.
    #[error("Duplicate request")]
    DuplicateRequest,

    /// Paystack webhook arrived with a signature that failed HMAC-SHA512 check.
    #[error("Webhook signature invalid")]
    InvalidWebhookSignature,

    /// Sliding-window rate limiter: caller exceeded 100 req / min.
    #[error("Rate limit exceeded")]
    RateLimitExceeded,

    /// Catch-all for unexpected conditions; detail is logged server-side only.
    #[error("Internal server error")]
    Internal,
}

/// Converts `AppError` into an Axum `Response` so handlers can use `?` freely.
/// Validation errors return a structured `{ error, details }` body.
/// All other errors return `{ error: "<message>" }` with the matching status.
impl IntoResponse for AppError {
    fn into_response(self) -> Response {
        let (status, message) = match &self {
            AppError::Database(e) => {
                tracing::error!("Database error: {}", e);
                (
                    StatusCode::INTERNAL_SERVER_ERROR,
                    "Database error occurred".to_string(),
                )
            }
            AppError::Redis(e) => {
                tracing::error!("Redis error: {}", e);
                (
                    StatusCode::INTERNAL_SERVER_ERROR,
                    "Cache service unavailable".to_string(),
                )
            }
            AppError::RedisPool(e) => {
                tracing::error!("Redis pool error: {}", e);
                (
                    StatusCode::INTERNAL_SERVER_ERROR,
                    "Cache service unavailable".to_string(),
                )
            }
            AppError::Jwt(e) => {
                tracing::warn!("JWT error: {}", e);
                (
                    StatusCode::UNAUTHORIZED,
                    "Invalid or expired token".to_string(),
                )
            }
            // Validation errors: build a field→[code] map so clients can render
            // per-field messages without parsing a string.
            AppError::Validation(e) => {
                let errors = e
                    .field_errors()
                    .iter()
                    .map(|(k, v)| (*k, v.iter().map(|e| e.code.to_string()).collect::<Vec<_>>()))
                    .collect::<std::collections::HashMap<_, _>>();
                return (
                    StatusCode::BAD_REQUEST,
                    Json(json!({
                        "error": "validation_error",
                        "details": errors
                    })),
                )
                    .into_response();
            }
            AppError::Email(e) => {
                tracing::error!("Email error: {}", e);
                (
                    StatusCode::INTERNAL_SERVER_ERROR,
                    "Failed to send email".to_string(),
                )
            }
            AppError::EmailAddress(e) => {
                tracing::error!("Email address error: {}", e);
                (
                    StatusCode::INTERNAL_SERVER_ERROR,
                    "Invalid email address".to_string(),
                )
            }
            AppError::Serialization(e) => {
                tracing::error!("Serialization error: {}", e);
                (
                    StatusCode::INTERNAL_SERVER_ERROR,
                    "Serialization error".to_string(),
                )
            }
            AppError::Config(e) => {
                tracing::error!("Configuration error: {}", e);
                (
                    StatusCode::INTERNAL_SERVER_ERROR,
                    "Server misconfiguration".to_string(),
                )
            }
            AppError::UserNotFound => (StatusCode::NOT_FOUND, "User not found".to_string()),
            AppError::WalletNotFound => (StatusCode::NOT_FOUND, "Wallet not found".to_string()),
            AppError::InsufficientFunds => {
                (StatusCode::BAD_REQUEST, "Insufficient funds".to_string())
            }
            AppError::WalletFrozen => (StatusCode::FORBIDDEN, "Wallet is frozen".to_string()),
            AppError::InvalidCredentials => {
                (StatusCode::UNAUTHORIZED, "Invalid credentials".to_string())
            }
            AppError::TokenExpired => (StatusCode::UNAUTHORIZED, "Token expired".to_string()),
            AppError::InvalidToken => (StatusCode::UNAUTHORIZED, "Invalid token".to_string()),
            AppError::EmailAlreadyExists => {
                (StatusCode::CONFLICT, "Email already registered".to_string())
            }
            AppError::TransactionNotFound => {
                (StatusCode::NOT_FOUND, "Transaction not found".to_string())
            }
            AppError::InvalidAmount => (StatusCode::BAD_REQUEST, "Invalid amount".to_string()),
            AppError::IdempotencyKeyRequired => (
                StatusCode::BAD_REQUEST,
                "Idempotency-Key header required".to_string(),
            ),
            AppError::DuplicateRequest => (
                StatusCode::CONFLICT,
                "Duplicate request detected".to_string(),
            ),
            AppError::InvalidWebhookSignature => (
                StatusCode::BAD_REQUEST,
                "Invalid webhook signature".to_string(),
            ),
            AppError::RateLimitExceeded => (
                StatusCode::TOO_MANY_REQUESTS,
                "Rate limit exceeded".to_string(),
            ),
            AppError::Internal => (
                StatusCode::INTERNAL_SERVER_ERROR,
                "Internal server error".to_string(),
            ),
        };

        (status, Json(json!({ "error": message }))).into_response()
    }
}

/// Type alias so every handler can write `Result<T>` instead of
/// `Result<T, AppError>` — keeps signatures concise.
pub type Result<T> = std::result::Result<T, AppError>;
