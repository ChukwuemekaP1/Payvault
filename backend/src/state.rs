//! Shared application state.
//! A single `AppState` is created at startup and cloned cheaply into every
//! Axum handler via `Arc` — all inner fields are already `Arc`-wrapped.

use crate::config::AppConfig;
use sqlx::postgres::PgPool;
use std::sync::Arc;

/// Lettre's async SMTP transport specialised for Tokio.
pub type Mailer = lettre::AsyncSmtpTransport<lettre::Tokio1Executor>;

/// Central state injected into every handler via `State<AppState>`.
/// Clone cost is O(1) — all heavy resources sit behind Arc.
#[derive(Clone)]
pub struct AppState {
    /// SQLx async Postgres connection pool (max 10 connections).
    pub db: PgPool,

    /// Immutable config loaded once at startup; shared read-only everywhere.
    pub config: Arc<AppConfig>,

    /// Lettre SMTP transport for sending OTP and receipt emails.
    pub mailer: Arc<Mailer>,
}

impl AppState {
    /// Wraps each resource in Arc so the resulting state is cheaply cloneable.
    pub fn new(db: PgPool, config: Arc<AppConfig>, mailer: Mailer) -> Self {
        Self {
            db,
            config,
            mailer: Arc::new(mailer),
        }
    }
}
