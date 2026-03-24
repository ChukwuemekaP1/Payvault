//! Email utilities — SMTP delivery via lettre's async transport.
//!
//! All functions accept a pre-built `AsyncSmtpTransport` so the SMTP
//! connection pool is created once at startup and reused across calls.
//!
//! The `_config` parameter is kept in signatures for future use (e.g.
//! reading a dynamic `smtp_from` address or enabling/disabling emails
//! per environment) without breaking call sites.

use crate::config::AppConfig;
use crate::error::Result;
use lettre::{
    message::{Mailbox, Message},
    AsyncSmtpTransport, AsyncTransport, Tokio1Executor,
};

/// Low-level send helper — builds a plain-text `Message` and dispatches it
/// via the provided SMTP transport.
///
/// `from_name` is used as the human-readable sender display name;
/// the sender address is hardcoded to `noreply@payvault.com`.
///
/// SMTP errors are mapped to `AppError::Internal` and logged server-side
/// so that sensitive transport details are never exposed to callers.
pub async fn send_email(
    mailer: &AsyncSmtpTransport<Tokio1Executor>,
    to: &str,
    subject: &str,
    body: &str,
    from_name: &str,
) -> Result<()> {
    // Build the RFC 5322 message — lettre validates headers at build time.
    let email = Message::builder()
        .from(Mailbox::new(
            Some(from_name.to_string()),
            "noreply@payvault.com".parse()?,
        ))
        .to(to.parse()?)
        .subject(subject)
        .body(body.to_string())?;

    // Dispatch via the async SMTP transport; log and surface as Internal on failure.
    mailer.send(email).await.map_err(|e| {
        tracing::error!("Failed to send email via SMTP: {}", e);
        crate::error::AppError::Internal
    })?;

    Ok(())
}

/// Sends a 6-digit OTP verification email to a newly registered user.
///
/// Called immediately after registration; the OTP has a 15-minute TTL in Redis.
/// Email delivery failure is intentionally non-fatal at the call site — the
/// user can request a resend rather than failing the entire registration flow.
pub async fn send_otp_email(
    mailer: &AsyncSmtpTransport<Tokio1Executor>,
    to: &str,
    otp: &str,
    _config: &AppConfig, // reserved for per-env toggles (e.g. skip emails in test)
) -> Result<()> {
    let subject = "Your PayVault Verification Code";

    // Plain-text body — simple and universally readable across email clients.
    let body = format!(
        r#"
Welcome to PayVault!

Your verification code is: {}

This code will expire in 15 minutes.

If you didn't request this code, please ignore this email.

Best regards,
The PayVault Team
        "#,
        otp
    );

    send_email(mailer, to, subject, &body, "PayVault").await?;
    Ok(())
}

/// Sends a transaction receipt to the sender after a successful transfer.
///
/// Fired in a detached `tokio::spawn` so SMTP latency does not block the
/// transfer API response.  Delivery failures are logged but do not roll
/// back the already-committed transaction.
pub async fn send_transaction_receipt(
    mailer: &AsyncSmtpTransport<Tokio1Executor>,
    to: &str,
    amount_kobo: i64,
    recipient_account: &str,
    reference: &str,
    _config: &AppConfig, // reserved for future dynamic from-address or template switching
) -> Result<()> {
    // Convert kobo → naira for the human-readable receipt amount.
    let naira_amount = amount_kobo as f64 / 100.0;

    let subject = "Transaction Receipt";
    let body = format!(
        r#"
Transaction Successful!

Amount: ₦{:.2}
Recipient Account: {}
Reference: {}

Thank you for using PayVault.

Best regards,
The PayVault Team
        "#,
        naira_amount, recipient_account, reference
    );

    send_email(mailer, to, subject, &body, "PayVault").await?;
    Ok(())
}
