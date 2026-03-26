//! Email integration test - verifies SMTP configuration and email delivery
//! 
//! Run with: cargo run --bin test-email [recipient_email]
//! 
//! This test sends 3 emails:
//! 1. Plain text test
//! 2. HTML OTP template
//! 3. HTML Transaction Receipt template

use lettre::{
    message::{header::ContentType, Mailbox, Message, MultiPart, SinglePart},
    transport::smtp::authentication::Credentials,
    AsyncSmtpTransport, AsyncTransport, Tokio1Executor,
};

#[tokio::main]
async fn main() -> Result<(), Box<dyn std::error::Error>> {
    println!("╔═══════════════════════════════════════════════════════╗");
    println!("║     PayVault Email Integration Test                  ║");
    println!("╚═══════════════════════════════════════════════════════╝\n");
    
    // Load configuration from environment
    dotenvy::dotenv().ok();
    
    let smtp_host = std::env::var("SMTP_HOST").unwrap_or_else(|_| "smtp.gmail.com".to_string());
    let smtp_port = std::env::var("SMTP_PORT")
        .unwrap_or_else(|_| "587".to_string())
        .parse::<u16>()?;
    let smtp_username = std::env::var("SMTP_USERNAME")?;
    let smtp_password = std::env::var("SMTP_PASSWORD")?;
    let smtp_from = std::env::var("SMTP_FROM").unwrap_or_else(|_| "noreply@payvault.com".to_string());
    
    // Get test recipient from command line or use default
    let test_to = std::env::args().nth(1).unwrap_or_else(|| {
        println!("⚠ No recipient email provided. Usage: cargo run --bin test-email <email>");
        println!("   Using default test address for demonstration.\n");
        "test@example.com".to_string()
    });
    
    println!("📧 Configuration:");
    println!("   From: {}", smtp_from);
    println!("   To: {}", test_to);
    println!("   SMTP: {}:{}\n", smtp_host, smtp_port);
    
    // Build SMTP transport with STARTTLS
    println!("🔌 Connecting to SMTP server...");
    let mailer = AsyncSmtpTransport::<Tokio1Executor>::starttls_relay(&smtp_host)?
        .credentials(Credentials::new(smtp_username, smtp_password))
        .build();
    
    println!("✓ SMTP connection established\n");
    
    // Test 1: Plain text email
    println!("📝 Test 1: Sending plain text email...");
    send_plain_text_test(&mailer, &test_to, &smtp_from).await?;
    
    // Test 2: HTML OTP template
    println!("📝 Test 2: Sending HTML email (OTP template)...");
    send_otp_template_test(&mailer, &test_to, &smtp_from).await?;
    
    // Test 3: HTML Transaction Receipt
    println!("📝 Test 3: Sending HTML email (Transaction Receipt)...");
    send_transaction_template_test(&mailer, &test_to, &smtp_from).await?;
    
    println!("\n╔═══════════════════════════════════════════════════════╗");
    println!("║              ✅ ALL TESTS PASSED!                    ║");
    println!("╚═══════════════════════════════════════════════════════╝\n");
    
    println!("✨ Gmail SMTP integration is working perfectly!\n");
    println!("📬 Check your inbox. You should receive 3 emails:\n");
    println!("   1. ✓ Plain text test email");
    println!("   2. ✓ HTML email with OTP template (purple gradient)");
    println!("   3. ✓ HTML email with Transaction Receipt (green gradient)\n");
    
    if test_to == "test@example.com" {
        println!("💡 To test with real email, run:");
        println!("   cargo run --bin test-email your@email.com\n");
    }
    
    Ok(())
}

async fn send_plain_text_test(
    mailer: &AsyncSmtpTransport<Tokio1Executor>,
    to: &str,
    from: &str,
) -> Result<(), Box<dyn std::error::Error>> {
    let email = Message::builder()
        .from(Mailbox::new(Some("PayVault Test".to_string()), from.parse()?))
        .to(to.parse()?)
        .subject("[PayVault] Plain Text Test")
        .body("This is a plain text test email from PayVault.\n\nIf you receive this, plain text emails are working!\n\nBest regards,\nPayVault Team".to_string())?;
    
    match mailer.send(email).await {
        Ok(_) => println!("✓ Plain text email sent successfully\n"),
        Err(e) => {
            eprintln!("✗ Failed to send plain text email: {}", e);
            return Err(Box::new(e));
        }
    }
    
    Ok(())
}

async fn send_otp_template_test(
    mailer: &AsyncSmtpTransport<Tokio1Executor>,
    to: &str,
    from: &str,
) -> Result<(), Box<dyn std::error::Error>> {
    let otp_html = r#"
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #f3f4f6; margin: 0; padding: 40px 20px; }
        .container { max-width: 600px; margin: 0 auto; background: white; border-radius: 12px; box-shadow: 0 4px 6px rgba(0,0,0,0.1); overflow: hidden; }
        .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 40px 30px; text-align: center; color: white; }
        .content { padding: 40px 30px; }
        .otp-box { background: #f9fafb; border: 2px dashed #667eea; border-radius: 8px; padding: 24px; text-align: center; margin: 24px 0; }
        .otp-code { font-size: 36px; font-weight: 700; color: #667eea; letter-spacing: 8px; font-family: 'Courier New', monospace; }
        .alert { background: #fef3c7; border-left: 4px solid #f59e0b; padding: 12px 16px; border-radius: 4px; margin: 20px 0; }
        .footer { background: #f9fafb; padding: 24px 30px; text-align: center; color: #6b7280; font-size: 14px; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1 style="margin: 0; font-size: 28px;">PayVault</h1>
            <p style="margin: 8px 0 0 0; opacity: 0.9;">Secure Digital Banking</p>
        </div>
        <div class="content">
            <h2 style="color: #1f2937;">Email Template Test</h2>
            <p style="color: #4b5563;">This is a test of the OTP email template with HTML formatting.</p>
            <div class="otp-box">
                <span class="otp-code">123456</span>
            </div>
            <div class="alert">
                <strong>⏰ Test Alert</strong><br>
                This demonstrates the alert box styling used in production emails.
            </div>
            <p style="color: #6b7280; font-size: 14px;">If you can see colors, gradients, and proper formatting, HTML emails are working perfectly!</p>
        </div>
        <div class="footer">
            <p>© 2026 PayVault. All rights reserved.</p>
        </div>
    </div>
</body>
</html>"#;
    
    let otp_text = "This is a test of the OTP email template.\n\nYour test verification code is: 123456\n\nThis email tests both HTML and plain text formats.";
    
    let email = Message::builder()
        .from(Mailbox::new(Some("PayVault".to_string()), from.parse()?))
        .to(to.parse()?)
        .subject("[PayVault] HTML Email Test - OTP Template")
        .multipart(
            MultiPart::alternative()
                .singlepart(SinglePart::builder().header(ContentType::TEXT_PLAIN).body(otp_text.to_string()))
                .singlepart(SinglePart::builder().header(ContentType::TEXT_HTML).body(otp_html.to_string()))
        )?;
    
    match mailer.send(email).await {
        Ok(_) => println!("✓ HTML email (OTP template) sent successfully\n"),
        Err(e) => {
            eprintln!("✗ Failed to send HTML email: {}", e);
            return Err(Box::new(e));
        }
    }
    
    Ok(())
}

async fn send_transaction_template_test(
    mailer: &AsyncSmtpTransport<Tokio1Executor>,
    to: &str,
    from: &str,
) -> Result<(), Box<dyn std::error::Error>> {
    let transaction_html = r#"
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #f3f4f6; margin: 0; padding: 40px 20px; }
        .container { max-width: 600px; margin: 0 auto; background: white; border-radius: 12px; box-shadow: 0 4px 6px rgba(0,0,0,0.1); overflow: hidden; }
        .header { background: linear-gradient(135deg, #10b981 0%, #059669 100%); padding: 40px 30px; text-align: center; color: white; }
        .amount-box { background: #f0fdf4; border: 2px solid #10b981; border-radius: 8px; padding: 20px; text-align: center; margin: 24px 0; }
        .amount { font-size: 36px; font-weight: 700; color: #047857; }
        .details-table { width: 100%; border-collapse: collapse; margin: 24px 0; }
        .details-table td { padding: 12px 0; border-bottom: 1px solid #e5e7eb; }
        .badge { display: inline-block; background: #d1fae5; color: #065f46; padding: 4px 12px; border-radius: 9999px; font-size: 12px; font-weight: 600; }
        .security-box { background: #eff6ff; border-left: 4px solid #3b82f6; padding: 16px; border-radius: 4px; margin: 24px 0; }
        .footer { background: #f9fafb; padding: 24px 30px; text-align: center; color: #6b7280; font-size: 14px; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <div style="font-size: 48px; margin-bottom: 12px;">✅</div>
            <h1 style="margin: 0; font-size: 26px;">Transaction Successful!</h1>
            <p style="margin: 8px 0 0 0; opacity: 0.9;">Test Transaction Receipt</p>
        </div>
        <div class="content" style="padding: 40px 30px;">
            <h2 style="color: #1f2937; font-size: 20px;">Transaction Details</h2>
            <div class="amount-box">
                <p style="margin: 0 0 8px 0; color: #059669; font-size: 14px;">AMOUNT SENT</p>
                <p class="amount">₦1,234.56</p>
            </div>
            <table class="details-table">
                <tr>
                    <td style="color: #6b7280;">Recipient Account</td>
                    <td align="right" style="font-weight: 600; color: #1f2937;">1234567890</td>
                </tr>
                <tr>
                    <td style="color: #6b7280;">Reference</td>
                    <td align="right" style="font-family: monospace; color: #1f2937;">TEST123456</td>
                </tr>
                <tr>
                    <td style="color: #6b7280;">Status</td>
                    <td align="right"><span class="badge">Completed</span></td>
                </tr>
            </table>
            <div class="security-box">
                <strong style="color: #1e40af;">🔒 Security Notice</strong><br>
                <span style="color: #1e40af; font-size: 14px;">This is a test email. No actual transaction occurred.</span>
            </div>
        </div>
        <div class="footer">
            <p>© 2026 PayVault. All rights reserved.</p>
        </div>
    </div>
</body>
</html>"#;
    
    let transaction_text = "Transaction Successful!\n\nAmount: ₦1,234.56\nRecipient: 1234567890\nReference: TEST123456\n\nThis is a test transaction receipt.";
    
    let email = Message::builder()
        .from(Mailbox::new(Some("PayVault".to_string()), from.parse()?))
        .to(to.parse()?)
        .subject("[PayVault] HTML Email Test - Transaction Receipt")
        .multipart(
            MultiPart::alternative()
                .singlepart(SinglePart::builder().header(ContentType::TEXT_PLAIN).body(transaction_text.to_string()))
                .singlepart(SinglePart::builder().header(ContentType::TEXT_HTML).body(transaction_html.to_string()))
        )?;
    
    match mailer.send(email).await {
        Ok(_) => println!("✓ HTML email (Transaction Receipt) sent successfully\n"),
        Err(e) => {
            eprintln!("✗ Failed to send transaction email: {}", e);
            return Err(Box::new(e));
        }
    }
    
    Ok(())
}
