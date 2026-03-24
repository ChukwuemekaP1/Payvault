use axum::{
    body::Body,
    http::{Request, StatusCode},
    Router,
};
use deadpool_redis::Config as RedisConfig;
use lettre::AsyncSmtpTransport;
use payvault::config::AppConfig;
use payvault::state::AppState;
use serde_json::json;
use sqlx::postgres::PgPoolOptions;
use std::sync::Arc;
use tower::ServiceExt;

async fn setup_app() -> (Router, AppState) {
    // Load test configuration
    dotenvy::dotenv().ok();

    let config = AppConfig {
        database_url: std::env::var("TEST_DATABASE_URL").unwrap_or_else(|_| {
            "postgresql://postgres:password@localhost:5432/payvault_test".to_string()
        }),
        redis_url: std::env::var("TEST_REDIS_URL")
            .unwrap_or_else(|_| "redis://localhost:6379".to_string()),
        jwt_secret: "test-secret-key-for-testing-purposes-only".to_string(),
        jwt_access_ttl: 15,
        jwt_refresh_ttl: 10080,
        app_env: payvault::config::AppEnv::Test,
        app_port: 8001,
        smtp_host: "smtp.gmail.com".to_string(),
        smtp_port: 587,
        smtp_username: "test@gmail.com".to_string(),
        smtp_password: "test-password".to_string(),
        smtp_from: "noreply@payvault.com".to_string(),
        paystack_secret_key: "sk_test_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx".to_string(),
        paystack_webhook_secret: "whsec_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx".to_string(),
        admin_email: "admin@test.com".to_string(),
        admin_password: "TestPassword123!".to_string(),
    };

    let config_arc = Arc::new(config);

    let db_pool = PgPoolOptions::new()
        .max_connections(5)
        .connect(&config_arc.database_url)
        .await
        .expect("Failed to create database pool");

    // Run migrations
    sqlx::migrate!("./src/db/migrations")
        .run(&db_pool)
        .await
        .expect("Failed to run migrations");

    let redis_config = RedisConfig::from_url(&config_arc.redis_url);
    let redis_pool = redis_config
        .create_pool(Some(deadpool::Runtime::Tokio1))
        .expect("Failed to create Redis pool");

    let mailer =
        AsyncSmtpTransport::<lettre::Tokio1Executor>::starttls_relay(&config_arc.smtp_host)
            .expect("Failed to create mailer")
            .credentials(lettre::transport::smtp::authentication::Credentials::new(
                config_arc.smtp_username.clone(),
                config_arc.smtp_password.clone(),
            ))
            .build();

    let state = AppState::new(db_pool, redis_pool, config_arc.clone(), mailer);
    let router = payvault::router::create_router(state.clone());

    (router, state)
}

#[tokio::test]
async fn test_register_user() {
    let (_router, _state) = setup_app().await;

    let response = _router
        .oneshot(
            Request::builder()
                .method("POST")
                .uri("/auth/register")
                .header("Content-Type", "application/json")
                .body(Body::from(
                    json!({
                        "email": "testuser@example.com",
                        "password": "securepassword123"
                    })
                    .to_string(),
                ))
                .unwrap(),
        )
        .await
        .unwrap();

    assert_eq!(response.status(), StatusCode::CREATED);
}

#[tokio::test]
async fn test_login() {
    let (_router, _state) = setup_app().await;

    // First register a user
    let register_response = _router
        .clone()
        .oneshot(
            Request::builder()
                .method("POST")
                .uri("/auth/register")
                .header("Content-Type", "application/json")
                .body(Body::from(
                    json!({
                        "email": "loginuser@example.com",
                        "password": "securepassword123"
                    })
                    .to_string(),
                ))
                .unwrap(),
        )
        .await
        .unwrap();

    assert_eq!(register_response.status(), StatusCode::CREATED);

    // Then try to login
    let response = _router
        .oneshot(
            Request::builder()
                .method("POST")
                .uri("/auth/login")
                .header("Content-Type", "application/json")
                .body(Body::from(
                    json!({
                        "email": "loginuser@example.com",
                        "password": "securepassword123"
                    })
                    .to_string(),
                ))
                .unwrap(),
        )
        .await
        .unwrap();

    assert_eq!(response.status(), StatusCode::OK);
}

#[tokio::test]
async fn test_atomic_transfer() {
    let (_router, state) = setup_app().await;

    // Create two users
    let user1_email = "sender@example.com";
    let user2_email = "receiver@example.com";

    // Register both users and get their tokens
    let token1 = get_auth_token(&_router, user1_email, "password123").await;
    let _token2 = get_auth_token(&_router, user2_email, "password123").await;

    // Fund sender's wallet directly in DB for testing
    fund_wallet(&state, user1_email, 10000).await; // 100 naira in kobo

    // Get recipient account number
    let recipient_account = get_account_number(&state, user2_email).await;

    // Perform transfer
    let response = _router
        .clone()
        .oneshot(
            Request::builder()
                .method("POST")
                .uri("/wallet/transfer")
                .header("Content-Type", "application/json")
                .header("Authorization", format!("Bearer {}", token1))
                .header("Idempotency-Key", "test-transfer-1")
                .body(Body::from(
                    json!({
                        "recipient_account": recipient_account,
                        "amount_kobo": 5000, // 50 naira
                        "reference": "TEST-TXN-001"
                    })
                    .to_string(),
                ))
                .unwrap(),
        )
        .await
        .unwrap();

    assert_eq!(response.status(), StatusCode::OK);
}

#[tokio::test]
async fn test_duplicate_idempotency() {
    let (_router, _state) = setup_app().await;

    let token = get_auth_token(&_router, "sender2@example.com", "password123").await;
    let recipient_account = get_account_number(&_state, "receiver2@example.com").await;

    // First request
    let response1 = _router
        .clone()
        .oneshot(
            Request::builder()
                .method("POST")
                .uri("/wallet/transfer")
                .header("Content-Type", "application/json")
                .header("Authorization", format!("Bearer {}", token))
                .header("Idempotency-Key", "duplicate-test-1")
                .body(Body::from(
                    json!({
                        "recipient_account": recipient_account,
                        "amount_kobo": 1000,
                        "reference": "TEST-TXN-002"
                    })
                    .to_string(),
                ))
                .unwrap(),
        )
        .await
        .unwrap();

    assert_eq!(response1.status(), StatusCode::OK);

    // Duplicate request with same idempotency key
    let response2 = _router
        .clone()
        .oneshot(
            Request::builder()
                .method("POST")
                .uri("/wallet/transfer")
                .header("Content-Type", "application/json")
                .header("Authorization", format!("Bearer {}", token))
                .header("Idempotency-Key", "duplicate-test-1")
                .body(Body::from(
                    json!({
                        "recipient_account": recipient_account,
                        "amount_kobo": 1000,
                        "reference": "TEST-TXN-002"
                    })
                    .to_string(),
                ))
                .unwrap(),
        )
        .await
        .unwrap();

    assert_eq!(response2.status(), StatusCode::OK);
}

#[tokio::test]
async fn test_insufficient_funds() {
    let (_router, _state) = setup_app().await;

    let token = get_auth_token(&_router, "poor@example.com", "password123").await;
    let recipient_account = get_account_number(&_state, "rich@example.com").await;

    // Try to transfer more than available balance
    let response = _router
        .clone()
        .oneshot(
            Request::builder()
                .method("POST")
                .uri("/wallet/transfer")
                .header("Content-Type", "application/json")
                .header("Authorization", format!("Bearer {}", token))
                .header("Idempotency-Key", "insufficient-funds-test")
                .body(Body::from(
                    json!({
                        "recipient_account": recipient_account,
                        "amount_kobo": 999999999, // Very large amount
                    })
                    .to_string(),
                ))
                .unwrap(),
        )
        .await
        .unwrap();

    assert_eq!(response.status(), StatusCode::BAD_REQUEST);
}

#[tokio::test]
async fn test_frozen_wallet_block() {
    let (_router, state) = setup_app().await;

    let email = "frozen@example.com";
    let token = get_auth_token(&_router, email, "password123").await;

    // Freeze the wallet
    freeze_wallet(&state, email).await;

    let recipient_account = get_account_number(&state, "target@example.com").await;

    // Try to transfer from frozen wallet
    let response = _router
        .clone()
        .oneshot(
            Request::builder()
                .method("POST")
                .uri("/wallet/transfer")
                .header("Content-Type", "application/json")
                .header("Authorization", format!("Bearer {}", token))
                .header("Idempotency-Key", "frozen-wallet-test")
                .body(Body::from(
                    json!({
                        "recipient_account": recipient_account,
                        "amount_kobo": 1000,
                    })
                    .to_string(),
                ))
                .unwrap(),
        )
        .await
        .unwrap();

    assert_eq!(response.status(), StatusCode::FORBIDDEN);
}

#[tokio::test]
async fn test_bad_webhook_signature() {
    let (_router, _state) = setup_app().await;

    let response = _router
        .clone()
        .oneshot(
            Request::builder()
                .method("POST")
                .uri("/webhooks/paystack")
                .header("Content-Type", "application/json")
                .header("x-paystack-signature", "invalid-signature")
                .body(Body::from(
                    json!({
                        "event": "charge.success",
                        "data": {
                            "status": "success",
                            "reference": "TEST-WEBHOOK-001",
                            "amount": 10000,
                            "customer": {
                                "email": "webhook@test.com"
                            }
                        }
                    })
                    .to_string(),
                ))
                .unwrap(),
        )
        .await
        .unwrap();

    assert_eq!(response.status(), StatusCode::BAD_REQUEST);
}

// Helper functions
async fn get_auth_token(router: &Router, email: &str, password: &str) -> String {
    // Register first if needed
    let _ = router
        .clone()
        .oneshot(
            Request::builder()
                .method("POST")
                .uri("/auth/register")
                .header("Content-Type", "application/json")
                .body(Body::from(
                    json!({
                        "email": email,
                        "password": password
                    })
                    .to_string(),
                ))
                .unwrap(),
        )
        .await;

    // Login
    let response = router
        .clone()
        .oneshot(
            Request::builder()
                .method("POST")
                .uri("/auth/login")
                .header("Content-Type", "application/json")
                .body(Body::from(
                    json!({
                        "email": email,
                        "password": password
                    })
                    .to_string(),
                ))
                .unwrap(),
        )
        .await
        .unwrap();

    let body = axum::body::to_bytes(response.into_body(), usize::MAX)
        .await
        .unwrap();
    let json: serde_json::Value = serde_json::from_slice(&body).unwrap();
    json["access_token"].as_str().unwrap().to_string()
}

async fn fund_wallet(state: &AppState, email: &str, amount_kobo: i64) {
    sqlx::query(
        "UPDATE wallets SET balance_kobo = $1 WHERE user_id = (SELECT id FROM users WHERE email = $2)",
    )
    .bind(amount_kobo)
    .bind(email)
    .execute(&state.db)
    .await
    .unwrap();
}

async fn get_account_number(state: &AppState, email: &str) -> String {
    sqlx::query_scalar::<_, String>(
        "SELECT account_number FROM wallets WHERE user_id = (SELECT id FROM users WHERE email = $1)",
    )
    .bind(email)
    .fetch_one(&state.db)
    .await
    .unwrap()
}

async fn freeze_wallet(state: &AppState, email: &str) {
    sqlx::query(
        "UPDATE wallets SET is_frozen = TRUE WHERE user_id = (SELECT id FROM users WHERE email = $1)",
    )
    .bind(email)
    .execute(&state.db)
    .await
    .unwrap();
}
