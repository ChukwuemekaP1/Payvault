//! Password hashing utilities using Argon2id.
//!
//! Argon2id is the winner of the Password Hashing Competition (PHC) and the
//! current OWASP-recommended algorithm for password storage.  It is:
//! - Memory-hard (resistant to GPU/ASIC brute-force attacks)
//! - Side-channel resistant (the "id" variant combines Argon2i + Argon2d)
//!
//! Each hash includes the salt, parameters, and algorithm version so the
//! stored string is fully self-contained and portable across library versions.

use crate::error::{AppError, Result};
use argon2::{
    password_hash::{rand_core::OsRng, PasswordHash, PasswordHasher, SaltString},
    Argon2, PasswordVerifier,
};

/// Hashes a plaintext password with Argon2id using a cryptographically
/// random salt generated via `OsRng`.
///
/// Returns a PHC-format string:
/// `$argon2id$v=19$m=19456,t=2,p=1$<salt>$<hash>`
/// which is stored verbatim in `users.password_hash`.
pub fn hash_password(password: &str) -> Result<String> {
    // Generate a fresh 16-byte random salt — unique per password.
    let salt = SaltString::generate(&mut OsRng);

    // Argon2::default() uses Argon2id with OWASP-recommended parameters:
    // memory = 19 456 KiB, iterations = 2, parallelism = 1.
    let argon2 = Argon2::default();

    let password_hash = argon2
        .hash_password(password.as_bytes(), &salt)
        .map_err(|e| {
            tracing::error!("Password hashing failed: {}", e);
            AppError::Internal
        })?;

    // to_string() serialises the full PHC string (algorithm + params + salt + hash).
    Ok(password_hash.to_string())
}

/// Verifies a plaintext password against a stored PHC-format Argon2id hash.
///
/// Returns:
/// - `Ok(true)`  — password matches.
/// - `Ok(false)` — password is wrong (no error; caller should return 401).
/// - `Err(_)`    — hash string is malformed or an unexpected internal error occurred.
///
/// Constant-time comparison is guaranteed by the argon2 crate to prevent
/// timing-based attacks that could reveal whether a hash was close to matching.
pub fn verify_password(password: &str, hash: &str) -> Result<bool> {
    // Parse the PHC string back into a structured PasswordHash — fails if malformed.
    let parsed_hash = PasswordHash::new(hash).map_err(|e| {
        tracing::error!("Failed to parse password hash: {}", e);
        AppError::Internal
    })?;

    match Argon2::default().verify_password(password.as_bytes(), &parsed_hash) {
        Ok(_) => Ok(true),
        // Password mismatch is a normal condition — not an error, just false.
        Err(argon2::password_hash::Error::Password) => Ok(false),
        // Any other error (e.g. unsupported algorithm version) is unexpected.
        Err(e) => {
            tracing::error!("Password verification error: {}", e);
            Err(AppError::Internal)
        }
    }
}
