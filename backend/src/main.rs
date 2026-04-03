//! PayVault API — entry point.
//! Bootstraps config, DB pool, Redis pool, mailer, app state, then starts
//! the Axum HTTP server with graceful shutdown on SIGINT / SIGTERM.

mod config;
mod error;
mod middleware;
mod modules;
mod router;
mod state;
mod utils;

use crate::config::AppConfig;
use crate::error::Result;
use crate::router::create_router;
use crate::state::AppState;
use axum::Router;
use deadpool_redis::Config as RedisConfig;
use lettre::AsyncSmtpTransport;
use sqlx::postgres::PgPoolOptions;
use std::sync::Arc;
use tokio::signal;
use tower_http::compression::CompressionLayer;
use tower_http::cors::{Any, CorsLayer};

#[tokio::main]
async fn main() -> Result<()> {
    // Structured JSON logging via tracing-subscriber; level driven by RUST_LOG env var.
    tracing_subscriber::fmt()
        .with_env_filter(
            tracing_subscriber::EnvFilter::from_default_env()
                .add_directive(tracing::Level::INFO.into()),
        )
        .init();

    tracing::info!("Starting PayVault API server...");

    // Load all settings from environment variables (via dotenvy + config crate).
    dotenvy::dotenv().ok();
    let config = AppConfig::from_env().expect("Failed to load configuration");
    let config_arc = Arc::new(config);

    // SQLx connection pool — max 10 connections, 30 s acquire timeout.
    let db_pool = PgPoolOptions::new()
        .max_connections(10)
        .acquire_timeout(std::time::Duration::from_secs(30))
        .connect(&config_arc.database_url)
        .await
        .expect("Failed to create database pool");

    // Run embedded SQL migrations from src/db/migrations/ on every startup.
    // SQLx tracks applied migrations in a _sqlx_migrations table automatically.
    sqlx::migrate!("./src/db/migrations")
        .run(&db_pool)
        .await
        .expect("Failed to run migrations");

    tracing::info!("Database migrations completed successfully");

    // deadpool-redis pool — optional; if REDIS_URL is not set, Redis is skipped.
    let redis_pool = if let Some(ref redis_url) = config_arc.redis_url {
        let redis_config = RedisConfig::from_url(redis_url);
        Some(
            redis_config
                .create_pool(Some(deadpool::Runtime::Tokio1))
                .expect("Failed to create Redis pool"),
        )
    } else {
        tracing::warn!("REDIS_URL not set — Redis is disabled");
        None
    };

    // SMTP mailer using lettre's async STARTTLS transport.
    // Credentials are injected at build time; the connection is lazy (connects on first send).
    let mailer =
        AsyncSmtpTransport::<lettre::Tokio1Executor>::starttls_relay(&config_arc.smtp_host)
            .expect("Failed to create mailer")
            .credentials(lettre::transport::smtp::authentication::Credentials::new(
                config_arc.smtp_username.clone(),
                config_arc.smtp_password.clone(),
            ))
            .build();

    // Single shared state object cloned cheaply into every handler via Arc.
    let state = AppState::new(db_pool, redis_pool, config_arc.clone(), mailer);

    // Seed the admin account from env vars if it doesn't exist yet.
    create_admin_user(&state, &config_arc).await?;

    // CORS: production-restricted or wide-open for development.
    let cors = if config_arc.is_production() {
        // In production, restrict CORS to specific allowed origins.
        // Set ALLOWED_ORIGINS env var to comma-separated URLs (e.g. "https://myapp.com,https://api.myapp.com")
        let allowed_origins = std::env::var("ALLOWED_ORIGINS")
            .unwrap_or_else(|_| "*".to_string());
        if allowed_origins == "*" {
            CorsLayer::new()
                .allow_origin(Any)
                .allow_methods(Any)
                .allow_headers(Any)
                .expose_headers([axum::http::header::CONTENT_TYPE])
        } else {
            let origins: Vec<_> = allowed_origins
                .split(',')
                .map(|s| s.trim().parse().expect("Invalid origin in ALLOWED_ORIGINS"))
                .collect();
            CorsLayer::new()
                .allow_origin(origins)
                .allow_methods(Any)
                .allow_headers(Any)
                .expose_headers([axum::http::header::CONTENT_TYPE])
        }
    } else {
        CorsLayer::new()
            .allow_origin(Any)
            .allow_methods(Any)
            .allow_headers(Any)
            .expose_headers([axum::http::header::CONTENT_TYPE])
    };

    // Layer order (outermost applied last): CORS → Gzip compression → per-route middleware.
    let app: Router = create_router(state)
        .layer(cors)
        .layer(CompressionLayer::new());

    let addr = format!("0.0.0.0:{}", config_arc.app_port);
    let listener = tokio::net::TcpListener::bind(&addr)
        .await
        .expect("Failed to bind to address");

    tracing::info!("Server listening on {}", addr);

    // axum's graceful shutdown: drains in-flight requests before exiting.
    axum::serve(listener, app)
        .with_graceful_shutdown(shutdown_signal())
        .await
        .expect("Server failed to start");

    Ok(())
}

/// Seeds a default admin user (email + wallet) on first boot.
/// Uses a plain EXISTS check so it is idempotent across restarts.
async fn create_admin_user(state: &AppState, config: &AppConfig) -> Result<()> {
    use crate::utils::hash::hash_password;
    use uuid::Uuid;

    let exists =
        sqlx::query_scalar::<_, bool>("SELECT EXISTS(SELECT 1 FROM users WHERE email = $1)")
            .bind(&config.admin_email)
            .fetch_one(&state.db)
            .await?;

    if !exists {
        let password_hash = hash_password(&config.admin_password)?;
        let admin_id = Uuid::new_v4();

        // Insert admin user with role = 'admin' and pre-verified email.
        sqlx::query(
            "INSERT INTO users (id, email, password_hash, role, is_verified) \
             VALUES ($1, $2, $3, 'admin', TRUE)",
        )
        .bind(admin_id)
        .bind(&config.admin_email)
        .bind(&password_hash)
        .execute(&state.db)
        .await?;

        // Every user (including admin) gets a wallet with a random 10-digit account number.
        let account_number = crate::utils::account_number::generate_account_number();
        sqlx::query(
            "INSERT INTO wallets (user_id, balance_kobo, account_number) VALUES ($1, 0, $2)",
        )
        .bind(admin_id)
        .bind(&account_number)
        .execute(&state.db)
        .await?;

        tracing::info!("Admin user created: {}", config.admin_email);
    }

    Ok(())
}

/// Waits for Ctrl-C (all platforms) or SIGTERM (Unix).
/// Returning from this future triggers Axum's graceful drain.
async fn shutdown_signal() {
    let ctrl_c = async {
        signal::ctrl_c()
            .await
            .expect("failed to install Ctrl+C handler");
    };

    #[cfg(unix)]
    let terminate = async {
        signal::unix::signal(signal::unix::SignalKind::terminate())
            .expect("failed to install signal handler")
            .recv()
            .await;
    };

    #[cfg(not(unix))]
    let terminate = std::future::pending::<()>();

    tokio::select! {
        _ = ctrl_c => {},
        _ = terminate => {},
    }

    tracing::info!("Shutdown signal received, shutting down gracefully...");
}
