//! JWT utilities — token generation and verification.
//!
//! Both access and refresh tokens are HS256 JWTs signed with the same
//! JWT_SECRET. They differ only in their expiry (`exp` claim):
//! - Access token:  short-lived (JWT_ACCESS_TTL minutes, default 15 min).
//! - Refresh token: long-lived  (JWT_REFRESH_TTL minutes, default 7 days).
//!
//! Claims are minimal: subject (user_id UUID as string), email, role,
//! issued-at (`iat`), and expiry (`exp`).  No JTI — revocation is handled
//! by storing refresh-token hashes in Redis rather than a token block-list.

use crate::config::AppConfig;
use crate::error::Result;
use jsonwebtoken::{decode, encode, DecodingKey, EncodingKey, Header, Validation};
use serde::{Deserialize, Serialize};
use uuid::Uuid;

/// Claims embedded inside every JWT (both access and refresh tokens).
/// `sub` holds the user UUID as a string to comply with the JWT spec.
#[derive(Debug, Serialize, Deserialize)]
pub struct Claims {
    /// Subject — the user's UUID serialised as a hyphenated string.
    pub sub: String,
    pub email: String,
    pub role: String,
    /// Expiry timestamp (Unix seconds) — validated automatically by jsonwebtoken.
    pub exp: usize,
    /// Issued-at timestamp (Unix seconds) — informational, not validated.
    pub iat: usize,
}

/// Mints a short-lived access token for the given user identity.
///
/// TTL is read from `config.jwt_access_ttl` (in minutes).
/// Signed with HS256 using `config.jwt_secret`.
pub fn generate_access_token(
    user_id: Uuid,
    email: &str,
    role: &str,
    config: &AppConfig,
) -> Result<String> {
    let now = chrono::Utc::now();
    // Add the configured TTL in minutes to the current time.
    let exp = now + chrono::Duration::minutes(config.jwt_access_ttl);

    let claims = Claims {
        sub: user_id.to_string(),
        email: email.to_string(),
        role: role.to_string(),
        exp: exp.timestamp() as usize,
        iat: now.timestamp() as usize,
    };

    // encode() signs the header + claims with the HS256 algorithm.
    encode(
        &Header::default(), // default = HS256
        &claims,
        &EncodingKey::from_secret(config.jwt_secret.as_bytes()),
    )
    .map_err(|e| e.into())
}

/// Mints a long-lived refresh token for the given user identity.
///
/// Structurally identical to the access token but uses `config.jwt_refresh_ttl`
/// (typically 7 days) so the client can obtain new access tokens without
/// re-entering credentials.
pub fn generate_refresh_token(
    user_id: Uuid,
    email: &str,
    role: &str,
    config: &AppConfig,
) -> Result<String> {
    let now = chrono::Utc::now();
    let exp = now + chrono::Duration::minutes(config.jwt_refresh_ttl);

    let claims = Claims {
        sub: user_id.to_string(),
        email: email.to_string(),
        role: role.to_string(),
        exp: exp.timestamp() as usize,
        iat: now.timestamp() as usize,
    };

    encode(
        &Header::default(),
        &claims,
        &EncodingKey::from_secret(config.jwt_secret.as_bytes()),
    )
    .map_err(|e| e.into())
}

/// Verifies the token's HS256 signature and expiry, then returns the decoded claims.
///
/// Returns `AppError::Jwt` (→ 401) on any failure: wrong signature, expired,
/// malformed header, or unknown algorithm.
pub fn verify_token(token: &str, config: &AppConfig) -> Result<Claims> {
    // Validation::default() checks signature + exp automatically.
    decode::<Claims>(
        token,
        &DecodingKey::from_secret(config.jwt_secret.as_bytes()),
        &Validation::default(),
    )
    .map(|data| data.claims)
    .map_err(|e| e.into())
}
