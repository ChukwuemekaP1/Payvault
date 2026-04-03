//! Email utilities — SMTP delivery via lettre's async transport with HTML support.
//!
//! All functions accept a pre-built `AsyncSmtpTransport` so the SMTP
//! connection pool is created once at startup and reused across calls.
//!
//! The `_config` parameter is kept in signatures for future use (e.g.
//! reading a dynamic `smtp_from` address or enabling/disabling emails
//! per environment) without breaking call sites.
//!
//! Features:
//! - Multi-part emails (HTML + plain text fallback)
//! - Professional HTML templates with branding
//! - Responsive email design
//! - Inline CSS styling

use crate::config::AppConfig;
use crate::error::Result;
use lettre::{
    message::{header::ContentType, Mailbox, Message, MultiPart, SinglePart},
    AsyncSmtpTransport, AsyncTransport, Tokio1Executor,
};

/// Enhanced send helper — supports both plain text and multi-part (HTML + text) emails.
///
/// This function automatically detects if HTML content is provided and creates
/// a multi-part MIME message. If only plain text is provided, it sends as
/// a simple text email for maximum compatibility.
///
/// # Arguments
/// * `mailer` - Pre-configured SMTP transport
/// * `to` - Recipient email address
/// * `subject` - Email subject line
/// * `body_text` - Plain text version (fallback for email clients that don't support HTML)
/// * `body_html` - Optional HTML version (if Some, creates multi-part email)
/// * `from_name` - Human-readable sender display name
///
/// # Returns
/// * `Ok(())` on successful send
/// * `Err(AppError)` on failure (SMTP errors logged internally)
///
/// # Example
/// ```rust,no_run
/// // Plain text email
/// send_email(&mailer, "user@example.com", "Subject", "Text body", None, "PayVault").await?;
///
/// // HTML email with text fallback
/// send_email(&mailer, "user@example.com", "Subject", "Text body", Some("<h1>HTML</h1>"), "PayVault").await?;
/// ```
pub async fn send_email(
    mailer: &AsyncSmtpTransport<Tokio1Executor>,
    to: &str,
    subject: &str,
    body_text: &str,
    body_html: Option<&str>,
    from_name: &str,
) -> Result<()> {
    let from_mailbox = Mailbox::new(
        Some(from_name.to_string()),
        "noreply@payvault.com".parse()?,
    );
    let to_mailbox = to.parse()?;

    // Build the message based on whether HTML content is provided
    let email = if let Some(html) = body_html {
        // Multi-part email: Both HTML and plain text versions
        Message::builder()
            .from(from_mailbox)
            .to(to_mailbox)
            .subject(subject)
            .multipart(
                MultiPart::alternative()
                    .singlepart(
                        SinglePart::builder()
                            .header(ContentType::TEXT_PLAIN)
                            .body(body_text.to_string()),
                    )
                    .singlepart(
                        SinglePart::builder()
                            .header(ContentType::TEXT_HTML)
                            .body(html.to_string()),
                    ),
            )?
    } else {
        // Plain text email only
        Message::builder()
            .from(from_mailbox)
            .to(to_mailbox)
            .subject(subject)
            .body(body_text.to_string())?
    };

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
///
/// Features:
/// - Professional HTML template with PayVault branding
/// - Plain text fallback for accessibility
/// - Responsive design for mobile/desktop
/// - Clear call-to-action styling
#[allow(dead_code)]
pub async fn send_otp_email(
    mailer: &AsyncSmtpTransport<Tokio1Executor>,
    to: &str,
    otp: &str,
    _config: &AppConfig, // reserved for per-env toggles (e.g. skip emails in test)
) -> Result<()> {
    let subject = "Your PayVault Verification Code";

    // Plain text version (fallback)
    let body_text = format!(
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

    // Professional HTML version with branding
    let body_html = format!(
        r#"
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Verification Code</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f3f4f6;">
    <table role="presentation" style="width: 100%; border-collapse: collapse; background-color: #f3f4f6;">
        <tr>
            <td align="center" style="padding: 40px 20px;">
                <table role="presentation" style="max-width: 600px; width: 100%; border-collapse: collapse; background-color: #ffffff; border-radius: 12px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1); overflow: hidden;">
                    <!-- Header -->
                    <tr>
                        <td style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 40px 30px; text-align: center;">
                            <h1 style="margin: 0; color: #ffffff; font-size: 28px; font-weight: 600;">PayVault</h1>
                            <p style="margin: 8px 0 0 0; color: rgba(255, 255, 255, 0.9); font-size: 14px;">Secure Digital Banking</p>
                        </td>
                    </tr>
                    
                    <!-- Content -->
                    <tr>
                        <td style="padding: 40px 30px;">
                            <h2 style="margin: 0 0 16px 0; color: #1f2937; font-size: 24px; font-weight: 600;">Welcome to PayVault!</h2>
                            <p style="margin: 0 0 24px 0; color: #4b5563; font-size: 16px; line-height: 1.6;">Thank you for registering. Your verification code is:</p>
                            
                            <!-- OTP Code Box -->
                            <table role="presentation" style="width: 100%; margin: 24px 0; border-collapse: collapse;">
                                <tr>
                                    <td align="center" style="background-color: #f9fafb; border: 2px dashed #667eea; border-radius: 8px; padding: 24px;">
                                        <span style="display: inline-block; font-size: 36px; font-weight: 700; color: #667eea; letter-spacing: 8px; font-family: 'Courier New', monospace;">{}</span>
                                    </td>
                                </tr>
                            </table>
                            
                            <!-- Expiry Notice -->
                            <table role="presentation" style="width: 100%; margin: 20px 0; border-collapse: collapse; background-color: #fef3c7; border-left: 4px solid #f59e0b; border-radius: 4px;">
                                <tr>
                                    <td style="padding: 12px 16px;">
                                        <p style="margin: 0; color: #92400e; font-size: 14px;">
                                            <strong>⏰ Expires in 15 minutes</strong><br>
                                            This code will expire after 15 minutes for your security.
                                        </p>
                                    </td>
                                </tr>
                            </table>
                            
                            <p style="margin: 24px 0 0 0; color: #6b7280; font-size: 14px; line-height: 1.6;">
                                If you didn't request this verification code, please ignore this email. Your account remains secure.
                            </p>
                        </td>
                    </tr>
                    
                    <!-- Footer -->
                    <tr>
                        <td style="background-color: #f9fafb; padding: 24px 30px; border-top: 1px solid #e5e7eb; text-align: center;">
                            <p style="margin: 0 0 8px 0; color: #6b7280; font-size: 14px;">Best regards,<br><strong style="color: #374151;">The PayVault Team</strong></p>
                            <p style="margin: 0; color: #9ca3af; font-size: 12px;">© 2026 PayVault. All rights reserved.</p>
                        </td>
                    </tr>
                </table>
            </td>
        </tr>
    </table>
</body>
</html>
        "#,
        otp
    );

    send_email(mailer, to, subject, &body_text, Some(&body_html), "PayVault").await?;
    Ok(())
}

/// Sends a transaction receipt to the sender after a successful transfer.
///
/// Fired in a detached `tokio::spawn` so SMTP latency does not block the
/// transfer API response.  Delivery failures are logged but do not roll
/// back the already-committed transaction.
///
/// Features:
/// - Professional transaction receipt with full details
/// - Clean tabular layout for amount and recipient info
/// - Reference number for tracking
/// - Branded footer with security notice
pub async fn send_transaction_receipt(
    mailer: &AsyncSmtpTransport<Tokio1Executor>,
    to: &str,
    amount_kobo: i64,
    recipient_account: &str,
    reference: &str,
    _config: &AppConfig, // reserved for future dynamic from-address or template switching
) -> Result<()> {
    // Convert kobo → naira for the human-readable amount.
    let naira_amount = amount_kobo as f64 / 100.0;

    let subject = "Transaction Receipt - PayVault";

    // Plain text version (fallback)
    let body_text = format!(
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

    // Professional HTML version with transaction details
    let body_html = format!(
        r#"
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Transaction Receipt</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f3f4f6;">
    <table role="presentation" style="width: 100%; border-collapse: collapse; background-color: #f3f4f6;">
        <tr>
            <td align="center" style="padding: 40px 20px;">
                <table role="presentation" style="max-width: 600px; width: 100%; border-collapse: collapse; background-color: #ffffff; border-radius: 12px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1); overflow: hidden;">
                    <!-- Header with Success Icon -->
                    <tr>
                        <td style="background: linear-gradient(135deg, #10b981 0%, #059669 100%); padding: 40px 30px; text-align: center;">
                            <div style="font-size: 48px; margin-bottom: 12px;">✅</div>
                            <h1 style="margin: 0; color: #ffffff; font-size: 26px; font-weight: 600;">Transaction Successful!</h1>
                            <p style="margin: 8px 0 0 0; color: rgba(255, 255, 255, 0.9); font-size: 14px;">Your transfer has been completed</p>
                        </td>
                    </tr>
                    
                    <!-- Transaction Details -->
                    <tr>
                        <td style="padding: 40px 30px;">
                            <h2 style="margin: 0 0 24px 0; color: #1f2937; font-size: 20px; font-weight: 600;">Transaction Details</h2>
                            
                            <!-- Amount Display -->
                            <table role="presentation" style="width: 100%; margin-bottom: 24px; border-collapse: collapse; background-color: #f0fdf4; border: 2px solid #10b981; border-radius: 8px;">
                                <tr>
                                    <td style="padding: 20px; text-align: center;">
                                        <p style="margin: 0 0 8px 0; color: #059669; font-size: 14px; font-weight: 500;">AMOUNT SENT</p>
                                        <p style="margin: 0; color: #047857; font-size: 36px; font-weight: 700;">₦{:.2}</p>
                                    </td>
                                </tr>
                            </table>
                            
                            <!-- Transaction Info Table -->
                            <table role="presentation" style="width: 100%; border-collapse: collapse; margin-bottom: 24px;">
                                <tr>
                                    <td style="padding: 12px 0; border-bottom: 1px solid #e5e7eb;">
                                        <span style="color: #6b7280; font-size: 14px;">Recipient Account</span>
                                    </td>
                                    <td align="right" style="padding: 12px 0; border-bottom: 1px solid #e5e7eb;">
                                        <span style="color: #1f2937; font-size: 14px; font-weight: 600;">{}</span>
                                    </td>
                                </tr>
                                <tr>
                                    <td style="padding: 12px 0; border-bottom: 1px solid #e5e7eb;">
                                        <span style="color: #6b7280; font-size: 14px;">Reference Number</span>
                                    </td>
                                    <td align="right" style="padding: 12px 0; border-bottom: 1px solid #e5e7eb;">
                                        <span style="color: #1f2937; font-size: 14px; font-family: 'Courier New', monospace;">{}</span>
                                    </td>
                                </tr>
                                <tr>
                                    <td style="padding: 12px 0;">
                                        <span style="color: #6b7280; font-size: 14px;">Status</span>
                                    </td>
                                    <td align="right" style="padding: 12px 0;">
                                        <span style="display: inline-block; background-color: #d1fae5; color: #065f46; font-size: 12px; font-weight: 600; padding: 4px 12px; border-radius: 9999px;">Completed</span>
                                    </td>
                                </tr>
                            </table>
                            
                            <!-- Security Notice -->
                            <table role="presentation" style="width: 100%; margin: 24px 0; border-collapse: collapse; background-color: #eff6ff; border-left: 4px solid #3b82f6; border-radius: 4px;">
                                <tr>
                                    <td style="padding: 16px;">
                                        <p style="margin: 0; color: #1e40af; font-size: 14px;">
                                            <strong>🔒 Security Notice</strong><br>
                                            If you did not initiate this transaction, please contact our support team immediately at <a href="mailto:support@payvault.com" style="color: #2563eb;">support@payvault.com</a>
                                        </p>
                                    </td>
                                </tr>
                            </table>
                            
                            <p style="margin: 24px 0 0 0; color: #6b7280; font-size: 14px; line-height: 1.6;">
                                Thank you for using PayVault for your banking needs. We appreciate your trust in our services.
                            </p>
                        </td>
                    </tr>
                    
                    <!-- Footer -->
                    <tr>
                        <td style="background-color: #f9fafb; padding: 24px 30px; border-top: 1px solid #e5e7eb; text-align: center;">
                            <p style="margin: 0 0 8px 0; color: #6b7280; font-size: 14px;">Best regards,<br><strong style="color: #374151;">The PayVault Team</strong></p>
                            <p style="margin: 0 0 16px 0; color: #9ca3af; font-size: 12px;">© 2026 PayVault. All rights reserved.</p>
                            <p style="margin: 0; color: #9ca3af; font-size: 11px;">This is an automated message. Please do not reply to this email.</p>
                        </td>
                    </tr>
                </table>
            </td>
        </tr>
    </table>
</body>
</html>
        "#,
        naira_amount, recipient_account, reference
    );

    send_email(mailer, to, subject, &body_text, Some(&body_html), "PayVault").await?;
    Ok(())
}

/// Sends a welcome email after successful account verification.
///
/// Called immediately after user verifies their email; includes full account details.
/// Features:
/// - Professional welcome message with PayVault branding
/// - Complete account information (account number, name, email)
/// - Getting started guide
/// - Security tips
#[allow(dead_code)]
pub async fn send_welcome_email(
    mailer: &AsyncSmtpTransport<Tokio1Executor>,
    to: &str,
    full_name: &str,
    account_number: &str,
    _config: &AppConfig,
) -> Result<()> {
    let subject = "Welcome to PayVault - Your Account is Ready!";

    // Plain text version
    let body_text = format!(
        r#"
Welcome to PayVault, {}!

Your account has been successfully verified and is now active.

ACCOUNT DETAILS:
================
Account Number: {}
Account Name: {}
Email: {}

GETTING STARTED:
================
1. Log in to your dashboard at https://payvault.com
2. Fund your wallet to start making transfers
3. Use the "Receive Money" feature to share your account details
4. Make instant transfers to any bank account in Nigeria

SECURITY TIPS:
==============
- Never share your password or OTP with anyone
- PayVault will never ask for your password via email
- Enable two-factor authentication for extra security
- Always log out when using shared devices

NEED HELP?
==========
Visit our Help Center or contact support at support@payvault.com

Thank you for choosing PayVault!

Best regards,
The PayVault Team
        "#,
        full_name, account_number, full_name, to
    );

    // Professional HTML version
    let body_html = format!(
        r#"
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Welcome to PayVault</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f3f4f6;">
    <table role="presentation" style="width: 100%; border-collapse: collapse; background-color: #f3f4f6;">
        <tr>
            <td align="center" style="padding: 40px 20px;">
                <table role="presentation" style="max-width: 600px; width: 100%; border-collapse: collapse; background-color: #ffffff; border-radius: 12px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1); overflow: hidden;">
                    <!-- Header -->
                    <tr>
                        <td style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 50px 30px; text-align: center;">
                            <h1 style="margin: 0; color: #ffffff; font-size: 32px; font-weight: 700;">Welcome to PayVault!</h1>
                            <p style="margin: 12px 0 0 0; color: rgba(255, 255, 255, 0.95); font-size: 16px;">Your secure digital banking experience starts here</p>
                        </td>
                    </tr>
                    
                    <!-- Welcome Message -->
                    <tr>
                        <td style="padding: 40px 30px;">
                            <h2 style="margin: 0 0 20px 0; color: #1f2937; font-size: 24px; font-weight: 600;">Hello, {}!</h2>
                            <p style="margin: 0 0 24px 0; color: #4b5563; font-size: 16px; line-height: 1.6;">Congratulations! Your account has been successfully verified and is now active. You can now enjoy seamless digital banking with PayVault.</p>
                            
                            <!-- Account Details Box -->
                            <table role="presentation" style="width: 100%; margin: 30px 0; border-collapse: collapse; background-color: #f9fafb; border: 2px solid #667eea; border-radius: 8px;">
                                <tr>
                                    <td style="padding: 24px;">
                                        <h3 style="margin: 0 0 16px 0; color: #667eea; font-size: 16px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px;">Your Account Details</h3>
                                        
                                        <!-- Account Number -->
                                        <table role="presentation" style="width: 100%; margin-bottom: 16px; border-collapse: collapse;">
                                            <tr>
                                                <td style="padding: 8px 0; border-bottom: 1px solid #e5e7eb;">
                                                    <span style="color: #6b7280; font-size: 13px; font-weight: 500;">ACCOUNT NUMBER</span>
                                                </td>
                                            </tr>
                                            <tr>
                                                <td style="padding: 12px 0;">
                                                    <span style="display: inline-block; background-color: #ffffff; color: #1f2937; font-size: 24px; font-weight: 700; font-family: 'Courier New', monospace; padding: 12px 20px; border-radius: 6px; border: 2px dashed #667eea; letter-spacing: 2px;">{}</span>
                                                </td>
                                            </tr>
                                        </table>
                                        
                                        <!-- Account Name -->
                                        <table role="presentation" style="width: 100%; margin-bottom: 16px; border-collapse: collapse;">
                                            <tr>
                                                <td style="padding: 8px 0;">
                                                    <span style="color: #6b7280; font-size: 13px; font-weight: 500;">ACCOUNT NAME</span><br>
                                                    <span style="color: #1f2937; font-size: 16px; font-weight: 600;">{}</span>
                                                </td>
                                            </tr>
                                        </table>
                                        
                                        <!-- Email -->
                                        <table role="presentation" style="width: 100%; border-collapse: collapse;">
                                            <tr>
                                                <td style="padding: 8px 0;">
                                                    <span style="color: #6b7280; font-size: 13px; font-weight: 500;">EMAIL ADDRESS</span><br>
                                                    <span style="color: #1f2937; font-size: 14px;">{}</span>
                                                </td>
                                            </tr>
                                        </table>
                                    </td>
                                </tr>
                            </table>
                            
                            <!-- Getting Started Guide -->
                            <h3 style="margin: 30px 0 16px 0; color: #1f2937; font-size: 18px; font-weight: 600;">Getting Started</h3>
                            
                            <table role="presentation" style="width: 100%; border-collapse: collapse;">
                                <tr>
                                    <td style="padding: 12px 0; vertical-align: top;">
                                        <span style="display: inline-flex; align-items-center; justify-content: center; width: 28px; height: 28px; background-color: #667eea; color: #ffffff; border-radius: 50%; font-size: 14px; font-weight: 700; margin-right: 12px;">1</span>
                                    </td>
                                    <td style="padding: 12px 0;">
                                        <span style="color: #4b5563; font-size: 15px; line-height: 1.6;"><strong>Log in to your dashboard</strong> at payvault.com to access all features</span>
                                    </td>
                                </tr>
                                <tr>
                                    <td style="padding: 12px 0; vertical-align: top;">
                                        <span style="display: inline-flex; align-items-center; justify-content: center; width: 28px; height: 28px; background-color: #667eea; color: #ffffff; border-radius: 50%; font-size: 14px; font-weight: 700; margin-right: 12px;">2</span>
                                    </td>
                                    <td style="padding: 12px 0;">
                                        <span style="color: #4b5563; font-size: 15px; line-height: 1.6;"><strong>Fund your wallet</strong> to start making instant transfers</span>
                                    </td>
                                </tr>
                                <tr>
                                    <td style="padding: 12px 0; vertical-align: top;">
                                        <span style="display: inline-flex; align-items-center; justify-content: center; width: 28px; height: 28px; background-color: #667eea; color: #ffffff; border-radius: 50%; font-size: 14px; font-weight: 700; margin-right: 12px;">3</span>
                                    </td>
                                    <td style="padding: 12px 0;">
                                        <span style="color: #4b5563; font-size: 15px; line-height: 1.6;"><strong>Use "Receive Money"</strong> to share your account details with others</span>
                                    </td>
                                </tr>
                                <tr>
                                    <td style="padding: 12px 0; vertical-align: top;">
                                        <span style="display: inline-flex; align-items-center; justify-content: center; width: 28px; height: 28px; background-color: #667eea; color: #ffffff; border-radius: 50%; font-size: 14px; font-weight: 700; margin-right: 12px;">4</span>
                                    </td>
                                    <td style="padding: 12px 0;">
                                        <span style="color: #4b5563; font-size: 15px; line-height: 1.6;"><strong>Make instant transfers</strong> to any bank account in Nigeria</span>
                                    </td>
                                </tr>
                            </table>
                            
                            <!-- Security Tips -->
                            <table role="presentation" style="width: 100%; margin: 30px 0; border-collapse: collapse; background-color: #eff6ff; border-left: 4px solid #3b82f6; border-radius: 4px;">
                                <tr>
                                    <td style="padding: 20px;">
                                        <h4 style="margin: 0 0 12px 0; color: #1e40af; font-size: 16px; font-weight: 600;">🔒 Security Tips</h4>
                                        <ul style="margin: 0; padding-left: 20px; color: #1e40af; font-size: 14px; line-height: 1.8;">
                                            <li>Never share your password or OTP with anyone</li>
                                            <li>PayVault will never ask for your password via email</li>
                                            <li>Enable two-factor authentication for extra security</li>
                                            <li>Always log out when using shared devices</li>
                                        </ul>
                                    </td>
                                </tr>
                            </table>
                            
                            <!-- Support CTA -->
                            <table role="presentation" style="width: 100%; margin: 30px 0; border-collapse: collapse; background-color: #fef3c7; border-left: 4px solid #f59e0b; border-radius: 4px;">
                                <tr>
                                    <td style="padding: 20px; text-align: center;">
                                        <p style="margin: 0 0 12px 0; color: #92400e; font-size: 15px; font-weight: 600;">Need Help Getting Started?</p>
                                        <p style="margin: 0; color: #78350f; font-size: 14px; line-height: 1.6;">Visit our Help Center or contact our support team at <a href="mailto:support@payvault.com" style="color: #2563eb; text-decoration: none; font-weight: 600;">support@payvault.com</a></p>
                                    </td>
                                </tr>
                            </table>
                            
                            <p style="margin: 30px 0 0 0; color: #6b7280; font-size: 15px; line-height: 1.6;">Thank you for choosing PayVault for your banking needs. We're excited to have you on board!</p>
                        </td>
                    </tr>
                    
                    <!-- Footer -->
                    <tr>
                        <td style="background-color: #f9fafb; padding: 30px; border-top: 1px solid #e5e7eb; text-align: center;">
                            <p style="margin: 0 0 12px 0; color: #6b7280; font-size: 15px;">Best regards,<br><strong style="color: #374151; font-size: 16px;">The PayVault Team</strong></p>
                            <p style="margin: 0 0 20px 0; color: #9ca3af; font-size: 13px;">© 2026 PayVault. All rights reserved.</p>
                            <p style="margin: 0; color: #9ca3af; font-size: 12px;">This is an automated message. Please do not reply to this email.</p>
                        </td>
                    </tr>
                </table>
            </td>
        </tr>
    </table>
</body>
</html>
        "#,
        full_name, account_number, full_name, to
    );

    send_email(mailer, to, subject, &body_text, Some(&body_html), "PayVault").await?;
    Ok(())
}

/// Sends a password reset email with a verification code.
///
/// Called when user requests password reset; includes 6-digit OTP code.
/// Features:
/// - Professional HTML template with PayVault branding
/// - Clear verification code display
/// - Security warnings and expiry notice
/// - Support contact information
#[allow(dead_code)]
pub async fn send_password_reset_email(
    mailer: &AsyncSmtpTransport<Tokio1Executor>,
    to: &str,
    otp: &str,
    _config: &AppConfig,
) -> Result<()> {
    let subject = "Password Reset Request - PayVault";

    // Plain text version
    let body_text = format!(
        r#"
Password Reset Request

You requested to reset your PayVault password.

Your verification code is: {}

This code will expire in 15 minutes.

If you didn't request this password reset, please ignore this email.
Your account remains secure.

Best regards,
The PayVault Team
        "#,
        otp
    );

    // Professional HTML version
    let body_html = format!(
        r#"
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Password Reset Request</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f3f4f6;">
    <table role="presentation" style="width: 100%; border-collapse: collapse; background-color: #f3f4f6;">
        <tr>
            <td align="center" style="padding: 40px 20px;">
                <table role="presentation" style="max-width: 600px; width: 100%; border-collapse: collapse; background-color: #ffffff; border-radius: 12px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1); overflow: hidden;">
                    <!-- Header -->
                    <tr>
                        <td style="background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%); padding: 40px 30px; text-align: center;">
                            <h1 style="margin: 0; color: #ffffff; font-size: 28px; font-weight: 600;">Password Reset Request</h1>
                            <p style="margin: 12px 0 0 0; color: rgba(255, 255, 255, 0.95); font-size: 15px;">Secure your PayVault account</p>
                        </td>
                    </tr>
                    
                    <!-- Content -->
                    <tr>
                        <td style="padding: 40px 30px;">
                            <p style="margin: 0 0 24px 0; color: #4b5563; font-size: 16px; line-height: 1.6;">You requested to reset your PayVault password. Use the verification code below to proceed:</p>
                            
                            <!-- OTP Code Box -->
                            <table role="presentation" style="width: 100%; margin: 24px 0; border-collapse: collapse;">
                                <tr>
                                    <td align="center" style="background-color: #fef3c7; border: 2px dashed #f59e0b; border-radius: 8px; padding: 24px;">
                                        <span style="display: inline-block; font-size: 36px; font-weight: 700; color: #d97706; letter-spacing: 8px; font-family: 'Courier New', monospace;">{}</span>
                                    </td>
                                </tr>
                            </table>
                            
                            <!-- Expiry Notice -->
                            <table role="presentation" style="width: 100%; margin: 20px 0; border-collapse: collapse; background-color: #fef3c7; border-left: 4px solid #f59e0b; border-radius: 4px;">
                                <tr>
                                    <td style="padding: 12px 16px;">
                                        <p style="margin: 0; color: #92400e; font-size: 14px;">
                                            <strong>⏰ Expires in 15 minutes</strong><br>
                                            This code will expire after 15 minutes for your security.
                                        </p>
                                    </td>
                                </tr>
                            </table>
                            
                            <!-- Security Notice -->
                            <table role="presentation" style="width: 100%; margin: 24px 0; border-collapse: collapse; background-color: #eff6ff; border-left: 4px solid #3b82f6; border-radius: 4px;">
                                <tr>
                                    <td style="padding: 16px;">
                                        <h4 style="margin: 0 0 8px 0; color: #1e40af; font-size: 15px; font-weight: 600;">🔒 Didn't request this?</h4>
                                        <p style="margin: 0; color: #1e40af; font-size: 14px; line-height: 1.6;">
                                            If you didn't request this password reset, you can safely ignore this email. Your account remains secure and no changes have been made.
                                        </p>
                                    </td>
                                </tr>
                            </table>
                            
                            <p style="margin: 24px 0 0 0; color: #6b7280; font-size: 14px; line-height: 1.6;">
                                For security reasons, never share this verification code with anyone. PayVault staff will never ask for this code.
                            </p>
                        </td>
                    </tr>
                    
                    <!-- Footer -->
                    <tr>
                        <td style="background-color: #f9fafb; padding: 24px 30px; border-top: 1px solid #e5e7eb; text-align: center;">
                            <p style="margin: 0 0 12px 0; color: #6b7280; font-size: 14px;">Best regards,<br><strong style="color: #374151; font-size: 15px;">The PayVault Security Team</strong></p>
                            <p style="margin: 0 0 16px 0; color: #9ca3af; font-size: 12px;">© 2026 PayVault. All rights reserved.</p>
                            <p style="margin: 0; color: #9ca3af; font-size: 11px;">This is an automated message. Please do not reply to this email.</p>
                        </td>
                    </tr>
                </table>
            </td>
        </tr>
    </table>
</body>
</html>
        "#,
        otp
    );

    send_email(mailer, to, subject, &body_text, Some(&body_html), "PayVault").await?;
    Ok(())
}
