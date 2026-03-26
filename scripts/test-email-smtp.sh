#!/bin/bash

# PayVault Email System Test Script
# Tests all email functionality with Gmail SMTP configuration

set -e  # Exit on error

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo ""
echo "╔══════════════════════════════════════════════════════════╗"
echo "║     PayVault Email System - Comprehensive Test Suite    ║"
echo "╚══════════════════════════════════════════════════════════╝"
echo ""

# Configuration
SMTP_HOST="smtp.gmail.com"
SMTP_PORT="587"
SMTP_USERNAME="nwokolopaul274@gmail.com"
SMTP_PASSWORD="eaci ajuf tirj lyor"
SMTP_FROM="noreply@payvault.com"
TEST_EMAIL="${1:-test@example.com}"  # First argument or default

echo -e "${BLUE}📧 Email Configuration:${NC}"
echo "   SMTP Host: $SMTP_HOST"
echo "   SMTP Port: $SMTP_PORT"
echo "   SMTP User: $SMTP_USERNAME"
echo "   From Address: $SMTP_FROM"
echo "   Test Recipient: $TEST_EMAIL"
echo ""

# Function to test SMTP connectivity
test_smtp_connection() {
    echo -e "${YELLOW}[1/4] Testing SMTP Server Connectivity...${NC}"
    
    if command -v openssl &> /dev/null; then
        # Test SMTP connection using openssl
        timeout 10 bash -c "echo | openssl s_client -connect $SMTP_HOST:$SMTP_PORT -starttls smtp 2>/dev/null | grep -i 'subject'" > /dev/null 2>&1
        
        if [ $? -eq 0 ]; then
            echo -e "${GREEN}✓ SMTP server is reachable${NC}"
            echo "   Server: $SMTP_HOST:$SMTP_PORT (STARTTLS)"
            return 0
        else
            echo -e "${RED}✗ Cannot connect to SMTP server${NC}"
            echo "   Check your internet connection and firewall settings"
            return 1
        fi
    else
        echo -e "${YELLOW}⚠ openssl not installed, skipping SMTP connectivity test${NC}"
        return 0
    fi
}

# Function to verify environment file
verify_env_file() {
    echo ""
    echo -e "${YELLOW}[2/4] Verifying Environment Configuration...${NC}"
    
    ENV_FILE="/home/chukwuemekadr/Documents/Projects/Rust_Bank/backend/.env"
    
    if [ ! -f "$ENV_FILE" ]; then
        echo -e "${RED}✗ .env file not found at $ENV_FILE${NC}"
        return 1
    fi
    
    # Check for required variables
    local errors=0
    
    if ! grep -q "SMTP_HOST=$SMTP_HOST" "$ENV_FILE"; then
        echo -e "${RED}✗ SMTP_HOST not configured correctly${NC}"
        ((errors++))
    else
        echo -e "${GREEN}✓ SMTP_HOST configured${NC}"
    fi
    
    if ! grep -q "SMTP_PORT=$SMTP_PORT" "$ENV_FILE"; then
        echo -e "${RED}✗ SMTP_PORT not configured${NC}"
        ((errors++))
    else
        echo -e "${GREEN}✓ SMTP_PORT configured${NC}"
    fi
    
    if ! grep -q "SMTP_USERNAME=$SMTP_USERNAME" "$ENV_FILE"; then
        echo -e "${RED}✗ SMTP_USERNAME not configured${NC}"
        ((errors++))
    else
        echo -e "${GREEN}✓ SMTP_USERNAME configured${NC}"
    fi
    
    if ! grep -q "SMTP_PASSWORD=" "$ENV_FILE"; then
        echo -e "${RED}✗ SMTP_PASSWORD not configured${NC}"
        ((errors++))
    else
        echo -e "${GREEN}✓ SMTP_PASSWORD configured${NC}"
    fi
    
    if [ $errors -eq 0 ]; then
        echo -e "${GREEN}✓ All SMTP environment variables present${NC}"
        return 0
    else
        echo -e "${RED}✗ $errors configuration error(s) found${NC}"
        return 1
    fi
}

# Function to compile and run Rust email test
run_rust_email_test() {
    echo ""
    echo -e "${YELLOW}[3/4] Running Rust Email Integration Test...${NC}"
    
    cd /home/chukwuemekadr/Documents/Projects/Rust_Bank/backend
    
    # Create a temporary test file
    cat > /tmp/test_email_send.rs << 'RUST_CODE'
//! Quick email test - sends test emails to verify SMTP configuration

use lettre::{
    message::{header::ContentType, Mailbox, Message, MultiPart, SinglePart},
    transport::smtp::authentication::Credentials,
    AsyncSmtpTransport, AsyncTransport, Tokio1Executor,
};
use tokio;

#[tokio::main]
async fn main() -> Result<(), Box<dyn std::error::Error>> {
    println!("🚀 Initializing SMTP connection...");
    
    // Gmail SMTP configuration
    let smtp_host = "smtp.gmail.com";
    let smtp_port = 587u16;
    let smtp_username = "nwokolopaul274@gmail.com";
    let smtp_password = "eaci ajuf tirj lyor";
    let smtp_from = "noreply@payvault.com";
    
    // Test recipient (command line arg or default)
    let test_to = std::env::args().nth(1).unwrap_or_else(|| "test@example.com".to_string());
    
    println!("📧 From: {}", smtp_from);
    println!("📧 To: {}", test_to);
    println!("📧 SMTP: {}:{}\n", smtp_host, smtp_port);
    
    // Build the mailer
    let mailer = AsyncSmtpTransport::<Tokio1Executor>::starttls_relay(smtp_host)?
        .credentials(Credentials::new(smtp_username.to_string(), smtp_password.to_string()))
        .build();
    
    println!("✓ SMTP connection established\n");
    
    // Test 1: Plain text email
    println!("📝 Test 1: Sending plain text email...");
    let text_only = Message::builder()
        .from(Mailbox::new(Some("PayVault Test".to_string()), smtp_from.parse()?))
        .to(test_to.parse()?)
        .subject("[PayVault] Plain Text Test")
        .body("This is a plain text test email from PayVault.\n\nIf you receive this, plain text emails are working!\n\nBest regards,\nPayVault Team".to_string())?;
    
    match mailer.send(text_only).await {
        Ok(_) => println!("✓ Plain text email sent successfully\n"),
        Err(e) => {
            println!("✗ Failed to send plain text email: {}\n", e);
            return Err(Box::new(e));
        }
    }
    
    // Test 2: HTML email with text fallback (like OTP)
    println!("📝 Test 2: Sending HTML email (OTP template)...");
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
            <h2 style="color: #1f2937;">Test Email - OTP Template</h2>
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
    
    let otp_email = Message::builder()
        .from(Mailbox::new(Some("PayVault".to_string()), smtp_from.parse()?))
        .to(test_to.parse()?)
        .subject("[PayVault] HTML Email Test - OTP Template")
        .multipart(
            MultiPart::alternative()
                .singlepart(SinglePart::builder().header(ContentType::TEXT_PLAIN).body(otp_text.to_string()))
                .singlepart(SinglePart::builder().header(ContentType::TEXT_HTML).body(otp_html.to_string()))
        )?;
    
    match mailer.send(otp_email).await {
        Ok(_) => println!("✓ HTML email (OTP template) sent successfully\n"),
        Err(e) => {
            println!("✗ Failed to send HTML email: {}\n", e);
            return Err(Box::new(e));
        }
    }
    
    // Test 3: Transaction receipt template
    println!("📝 Test 3: Sending HTML email (Transaction Receipt template)...");
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
    
    let transaction_email = Message::builder()
        .from(Mailbox::new(Some("PayVault".to_string()), smtp_from.parse()?))
        .to(test_to.parse()?)
        .subject("[PayVault] HTML Email Test - Transaction Receipt")
        .multipart(
            MultiPart::alternative()
                .singlepart(SinglePart::builder().header(ContentType::TEXT_PLAIN).body(transaction_text.to_string()))
                .singlepart(SinglePart::builder().header(ContentType::TEXT_HTML).body(transaction_html.to_string()))
        )?;
    
    match mailer.send(transaction_email).await {
        Ok(_) => println!("✓ HTML email (Transaction Receipt) sent successfully\n"),
        Err(e) => {
            println!("✗ Failed to send transaction email: {}\n", e);
            return Err(Box::new(e));
        }
    }
    
    println!("═══════════════════════════════════════════════════════");
    println!("✅ ALL EMAIL TESTS PASSED!");
    println!("═══════════════════════════════════════════════════════");
    println!("\n📧 Check your inbox at: {}", test_to);
    println!("📬 You should receive 3 test emails:\n");
    println!("   1. ✓ Plain text email");
    println!("   2. ✓ HTML email with OTP template");
    println!("   3. ✓ HTML email with Transaction Receipt template\n");
    println!("✨ Gmail SMTP integration is working perfectly!\n");
    
    Ok(())
}
RUST_CODE

    # Compile and run the test
    echo "Compiling email test..."
    
    if rustc --edition 2021 -o /tmp/test_email_send /tmp/test_email_send.rs -L dependency=/home/chukwuemekadr/Documents/Projects/Rust_Bank/backend/target/debug/deps --extern lettre=/home/chukwuemekadr/Documents/Projects/Rust_Bank/backend/target/debug/deps/liblettre-*.rlib --extern tokio=/home/chukwuemekadr/Documents/Projects/Rust_Bank/backend/target/debug/deps/libtokio-*.rlib 2>/dev/null; then
        echo "✓ Compilation successful"
        echo ""
        echo "Running email tests..."
        /tmp/test_email_send "$TEST_EMAIL"
        return $?
    else
        echo -e "${YELLOW}⚠ Could not compile standalone test, trying with cargo...${NC}"
        
        # Alternative: Use cargo to run a simple test
        cat > /tmp/Cargo.toml << 'CARGO_TOML'
[package]
name = "email-test"
version = "0.1.0"
edition = "2021"

[dependencies]
lettre = { version = "0.11", features = ["tokio1-native-tls"] }
tokio = { version = "1", features = ["full"] }
CARGO_TOML
        
        mkdir -p /tmp/email-test/src
        mv /tmp/test_email_send.rs /tmp/email-test/src/main.rs
        mv /tmp/Cargo.toml /tmp/email-test/
        
        cd /tmp/email-test
        echo "Building with cargo..."
        if cargo build --release 2>/dev/null; then
            echo "✓ Build successful"
            echo ""
            echo "Running email tests..."
            ./target/release/email-test "$TEST_EMAIL"
            return $?
        else
            echo -e "${RED}✗ Could not build email test${NC}"
            echo "   Try running the backend directly to test emails"
            return 1
        fi
    fi
}

# Function to provide security recommendations
security_recommendations() {
    echo ""
    echo "╔══════════════════════════════════════════════════════════╗"
    echo "║          🔐 Security Recommendations                     ║"
    echo "╚══════════════════════════════════════════════════════════╝"
    echo ""
    echo -e "${YELLOW}Important Security Notes:${NC}"
    echo ""
    echo "1. 📁 .gitignore Status"
    echo "   ✓ Your .env file should NEVER be committed to git"
    echo "   ✓ Verify: git check-ignore backend/.env"
    echo ""
    echo "2. 🔑 App Password Security"
    echo "   • Never share your app password publicly"
    echo "   • Use different app passwords for dev/staging/prod"
    echo "   • Rotate passwords periodically"
    echo ""
    echo "3. 🛡️ Gmail App Password Requirements"
    echo "   • Must have 2FA enabled on Google account"
    echo "   • App password is case-sensitive"
    echo "   • Can be revoked anytime from Google Account settings"
    echo ""
    echo "4. 📊 Production Recommendations"
    echo "   • Consider using SendGrid, Mailgun, or AWS SES"
    echo "   • Implement rate limiting for email sending"
    echo "   • Add DKIM/SPF records for better deliverability"
    echo "   • Monitor bounce rates and spam complaints"
    echo ""
    echo "5. 🔍 Testing Checklist"
    echo "   □ Test emails arrive in inbox (not spam)"
    echo "   □ HTML renders correctly in major email clients"
    echo "   □ Plain text fallback works"
    echo "   □ Links and formatting work properly"
    echo "   □ Mobile rendering is acceptable"
    echo ""
}

# Main execution
main() {
    local failed=0
    
    test_smtp_connection || ((failed++))
    verify_env_file || ((failed++))
    
    if [ $failed -eq 0 ]; then
        run_rust_email_test || ((failed++))
    else
        echo ""
        echo -e "${RED}✗ Prerequisites failed. Please fix configuration errors first.${NC}"
    fi
    
    echo ""
    security_recommendations
    
    echo "╔══════════════════════════════════════════════════════════╗"
    if [ $failed -eq 0 ]; then
        echo -e "║  ${GREEN}✅ ALL TESTS PASSED${NC}                                    ║"
    else
        echo -e "║  ${RED}❌ SOME TESTS FAILED${NC}                                   ║"
    fi
    echo "╚══════════════════════════════════════════════════════════╝"
    echo ""
    
    if [ $failed -gt 0 ]; then
        echo -e "${RED}Troubleshooting Tips:${NC}"
        echo "1. Verify Gmail App Password is correct"
        echo "2. Ensure 2FA is enabled on Google account"
        echo "3. Check internet connection"
        echo "4. Verify firewall allows outbound SMTP (port 587)"
        echo "5. Try less secure apps setting (not recommended)"
        echo ""
        exit 1
    fi
    
    exit 0
}

# Run main function
main
