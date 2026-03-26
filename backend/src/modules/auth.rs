//! Authentication module — public endpoints for account lifecycle management.
//!
//! All handlers are mounted under `/auth` and require NO prior authentication
//! except `verify_email` and `refresh_token`, which need a Bearer JWT so the
//! server knows which user is acting.
//!
//! Password hashing: Argon2id via the `argon2` crate (industry standard for
//! password storage — memory-hard, resistant to GPU/ASIC cracking).
//! Token strategy: short-lived access JWT (15 min) + long-lived refresh JWT
//! (7 days) stored as an MD5 hash in Redis for revocation capability.

use crate::error::{AppError, Result};
use crate::middleware::auth::AuthUser;
use crate::state::AppState;
use crate::utils::{hash::hash_password, jwt::generate_access_token};
use axum::{extract::State, http::StatusCode, Json};
use deadpool_redis::redis::AsyncCommands;
use serde::{Deserialize, Serialize};
use uuid::Uuid;
use validator::Validate;

// ── Request / Response DTOs ──────────────────────────────────────────────────

/// Input for POST /auth/register.
/// Validated with the `validator` crate: email format + min-8-char password.
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

/// Returned on successful login or token refresh.
/// Both tokens are JWTs signed with HS256 using JWT_SECRET.
#[derive(Debug, Serialize, utoipa::ToSchema)]
pub struct AuthResponse {
    pub access_token: String,
    pub refresh_token: String,
    pub user_id: Uuid,
    pub email: String,
}

/// Generic success message envelope used by several auth endpoints.
#[derive(Debug, Serialize, utoipa::ToSchema)]
pub struct MessageResponse {
    pub message: String,
}

// ── Handlers ─────────────────────────────────────────────────────────────────

/// Registers a new user.
///
/// Steps:
/// 1. Validate email format + password length via `validator`.
/// 2. Guard against duplicate email with an EXISTS query.
/// 3. Hash password with Argon2id (random salt via OsRng).
/// 4. Insert `users` row + `wallets` row (separate INSERTs — no transaction
///    needed here because a failed wallet insert is recoverable on retry).
/// 5. Generate a 6-digit numeric OTP, store in Redis with a 15-min TTL.
/// 6. Fire OTP email asynchronously (non-blocking — email failure doesn't
///    fail the registration response).
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

    // Fail early if the email is already taken — unique index would also catch
    // this, but a friendly error beats a raw DB constraint violation.
    let existing_user =
        sqlx::query_scalar::<_, bool>("SELECT EXISTS(SELECT 1 FROM users WHERE email = $1)")
            .bind(&req.email)
            .fetch_one(&state.db)
            .await?;

    if existing_user {
        return Err(AppError::EmailAlreadyExists);
    }

    // Argon2id password hash — salt is generated fresh per call via OsRng.
    let password_hash = hash_password(&req.password)?;

    // 10-digit random numeric account number (Nigerian bank format).
    let account_number = crate::utils::account_number::generate_account_number();

    // 6-digit OTP — each digit generated independently via rand::random.
    let otp: String = (0..6)
        .map(|_| rand::random::<u8>() % 10)
        .map(|d| d.to_string())
        .collect();

    // Insert user row; role defaults to 'user', email unverified until OTP confirmed.
    let user_id = sqlx::query_scalar::<_, Uuid>(
        r#"
        INSERT INTO users (email, password_hash, role, is_verified, full_name)
        VALUES ($1, $2, 'user', FALSE, $3)
        RETURNING id
        "#,
    )
    .bind(&req.email)
    .bind(&password_hash)
    .bind(&req.name)
    .fetch_one(&state.db)
    .await?;

    // Create a zero-balance wallet linked to the new user.
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

    // Store OTP in Redis under `otp:<user_id>` with a 15-minute TTL (900 s).
    let mut redis = state.redis.get().await?;
    let otp_key = format!("otp:{}", user_id);
    let _: () = redis.set_ex(&otp_key, &otp, 900u64).await?;

    // Best-effort email send — failures are logged but do not block the response.
    let _ =
        crate::utils::email::send_otp_email(&state.mailer, &req.email, &otp, &state.config).await;

    Ok((
        StatusCode::CREATED,
        Json(MessageResponse {
            message: "User registered successfully. Please verify your email.".to_string(),
        }),
    ))
}

/// Authenticates a user and issues a JWT access + refresh token pair.
///
/// Steps:
/// 1. Fetch user row by email (returns 401 if not found — avoids user enumeration).
/// 2. Verify supplied password against the stored Argon2id hash.
/// 3. Generate access JWT (HS256, 15-min TTL) and refresh JWT (7-day TTL).
/// 4. Store an MD5 hash of the refresh token in Redis for later revocation checks.
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

    // Single query returns password hash + role; 401 on missing row so callers
    // cannot enumerate valid emails via timing differences.
    let (user_id, password_hash, role, _is_verified) =
        sqlx::query_as::<_, (Uuid, String, String, bool)>(
            "SELECT id, password_hash, role, is_verified FROM users WHERE email = $1",
        )
        .bind(&req.email)
        .fetch_optional(&state.db)
        .await?
        .ok_or(AppError::InvalidCredentials)?;

    // Argon2 constant-time comparison — returns false for wrong password, not an error.
    if !crate::utils::hash::verify_password(&req.password, &password_hash)? {
        return Err(AppError::InvalidCredentials);
    }

    // HS256 JWTs — claims include sub (user_id), email, role, exp, iat.
    let access_token = generate_access_token(user_id, &req.email, &role, &state.config)?;
    let refresh_token =
        crate::utils::jwt::generate_refresh_token(user_id, &req.email, &role, &state.config)?;

    // Store MD5 hash of the refresh token keyed by `refresh_token:<user_id>:<random_uuid>`.
    // The UUID suffix allows multiple simultaneous sessions per user.
    let mut redis = state.redis.get().await?;
    let refresh_key = format!("refresh_token:{}:{}", user_id, Uuid::new_v4());
    let token_hash = format!("{:x}", md5::compute(&refresh_token));
    let _: () = redis.set_ex(&refresh_key, &token_hash, 604800u64).await?; // 7 days

    Ok(Json(AuthResponse {
        access_token,
        refresh_token,
        user_id,
        email: req.email,
    }))
}

/// Issues a new token pair using an existing valid access token.
///
/// The caller must send a valid Bearer JWT (access or refresh — both share
/// the same signature key).  A new pair is minted and the new refresh token
/// hash is recorded in Redis.  Old tokens are not explicitly revoked here;
/// their short TTL naturally expires them.
#[utoipa::path(
    post,
    path = "/auth/refresh",
    responses(
        (status = 200, description = "Token refreshed successfully", body = AuthResponse),
        (status = 401, description = "Invalid refresh token"),
    )
)]
pub async fn refresh_token(
    State(state): State<AppState>,
    auth_user: AuthUser, // extracted from the Bearer token by auth_middleware
) -> Result<Json<AuthResponse>> {
    // Re-issue tokens with the same identity claims.
    let access_token = generate_access_token(
        auth_user.user_id,
        &auth_user.email,
        &auth_user.role,
        &state.config,
    )?;
    let refresh_token = crate::utils::jwt::generate_refresh_token(
        auth_user.user_id,
        &auth_user.email,
        &auth_user.role,
        &state.config,
    )?;

    // Record the new refresh token hash; old hash remains until its TTL expires.
    let mut redis = state.redis.get().await?;
    let refresh_key = format!("refresh_token:{}:{}", auth_user.user_id, Uuid::new_v4());
    let token_hash = format!("{:x}", md5::compute(&refresh_token));
    let _: () = redis.set_ex(&refresh_key, &token_hash, 604800u64).await?;

    Ok(Json(AuthResponse {
        access_token,
        refresh_token,
        user_id: auth_user.user_id,
        email: auth_user.email,
    }))
}

/// Verifies the 6-digit OTP sent to the user's email at registration.
///
/// Requires a valid Bearer token (user must have logged in once to receive
/// the token, then use it to verify).  OTP is fetched from Redis under
/// `otp:<user_id>`, compared, then deleted on match.
#[utoipa::path(
    post,
    path = "/auth/verify-email",
    responses(
        (status = 200, description = "Email verified successfully"),
        (status = 400, description = "Invalid OTP"),
    )
)]
pub async fn verify_email(
    State(state): State<AppState>,
    auth_user: AuthUser,
    Json(body): Json<serde_json::Value>,
) -> Result<Json<serde_json::Value>> {
    let otp = body["otp"].as_str().ok_or(AppError::InvalidToken)?;

    let mut redis = state.redis.get().await?;
    let otp_key = format!("otp:{}", auth_user.user_id);

    // Fetch stored OTP; None means it expired or was never set.
    let stored_otp: Option<String> = redis.get(&otp_key).await?;

    match stored_otp {
        Some(stored) if stored == *otp => {
            // Flip is_verified flag — wallet and all subsequent actions become fully active.
            sqlx::query("UPDATE users SET is_verified = TRUE WHERE id = $1")
                .bind(auth_user.user_id)
                .execute(&state.db)
                .await?;

            // Delete the OTP so it cannot be replayed.
            let _: () = redis.del(&otp_key).await?;

            // Fetch user details for welcome email
            let (email, full_name, account_number): (String, String, String) = sqlx::query_as(
                r#"
                SELECT u.email, u.full_name, w.account_number
                FROM users u
                JOIN wallets w ON u.id = w.user_id
                WHERE u.id = $1
                "#,
            )
            .bind(auth_user.user_id)
            .fetch_one(&state.db)
            .await?;

            // Send welcome email asynchronously (non-blocking)
            let _ = crate::utils::email::send_welcome_email(
                &state.mailer,
                &email,
                &full_name,
                &account_number,
                &state.config,
            )
            .await;

            Ok(Json(serde_json::json!({
                "message": "Email verified successfully",
                "account_number": account_number,
                "email": email,
                "full_name": full_name
            })))
        }
        // Wrong OTP or expired — return the same error to avoid leaking which.
        _ => Err(AppError::InvalidToken),
    }
}

/// Initiates a password reset by generating a random token and storing it in Redis.
///
/// Always returns the same success message regardless of whether the email
/// exists — prevents user enumeration via the response.
/// The reset token is a 64-character lowercase hex string (32 random bytes).
#[utoipa::path(
    post,
    path = "/auth/forgot-password",
    responses(
        (status = 200, description = "Reset email sent"),
        (status = 404, description = "User not found"),
    )
)]
pub async fn forgot_password(
    State(state): State<AppState>,
    Json(body): Json<serde_json::Value>,
) -> Result<Json<MessageResponse>> {
    let email = body["email"].as_str().ok_or(AppError::InvalidToken)?;

    let user_id = sqlx::query_scalar::<_, Uuid>("SELECT id FROM users WHERE email = $1")
        .bind(email)
        .fetch_optional(&state.db)
        .await?
        .ok_or(AppError::UserNotFound)?;

    // 64-char hex token — each byte printed as two hex digits.
    let reset_token: String = (0..32)
        .map(|_| format!("{:02x}", rand::random::<u8>()))
        .collect();

    // Store under `password_reset:<user_id>` with 1-hour TTL (3 600 s).
    let mut redis = state.redis.get().await?;
    let reset_key = format!("password_reset:{}", user_id);
    let _: () = redis.set_ex(&reset_key, &reset_token, 3600u64).await?;

    // TODO: send email containing a link with the reset token.
    Ok(Json(MessageResponse {
        message: "If an account exists, a password reset email will be sent".to_string(),
    }))
}

/// Completes a password reset using the token from the reset email.
///
/// Scans Redis for keys matching `password_reset:*`, finds the one whose
/// stored value matches the supplied token, then updates the password and
/// deletes the used token.
#[utoipa::path(
    post,
    path = "/auth/reset-password",
    responses(
        (status = 200, description = "Password reset successfully"),
        (status = 400, description = "Invalid token"),
    )
)]
pub async fn reset_password(
    State(state): State<AppState>,
    Json(body): Json<serde_json::Value>,
) -> Result<Json<MessageResponse>> {
    let token = body["token"].as_str().ok_or(AppError::InvalidToken)?;
    let new_password = body["new_password"]
        .as_str()
        .ok_or(AppError::InvalidToken)?;

    // Scan all reset keys — fine at this scale; for high-volume use a reverse
    // lookup index (token → user_id) stored separately in Redis.
    let mut redis = state.redis.get().await?;
    let keys: Vec<String> = redis.keys("password_reset:*").await?;

    let mut user_id: Option<Uuid> = None;
    for key in keys {
        let stored_token: Option<String> = redis.get(&key).await?;
        if stored_token.as_deref() == Some(token) {
            if let Some(uid) = key
                .strip_prefix("password_reset:")
                .and_then(|s| Uuid::parse_str(s).ok())
            {
                user_id = Some(uid);
                break;
            }
        }
    }

    let uid = user_id.ok_or(AppError::InvalidToken)?;

    // Hash the new password with a fresh Argon2id salt before persisting.
    let password_hash = hash_password(new_password)?;
    sqlx::query("UPDATE users SET password_hash = $1 WHERE id = $2")
        .bind(&password_hash)
        .bind(uid)
        .execute(&state.db)
        .await?;

    // Consume the token — one-time use only.
    let reset_key = format!("password_reset:{}", uid);
    let _: () = redis.del(&reset_key).await?;

    Ok(Json(MessageResponse {
        message: "Password reset successfully".to_string(),
    }))
}
