//! Route definitions and middleware composition.
//! Public, protected, and admin route groups are built separately, each with
//! their own middleware stack, then merged into a single Axum Router.

use crate::middleware::rate_limit::rate_limit_middleware;
use crate::modules::{admin, auth, transaction, wallet, webhook};
use crate::state::AppState;
use axum::{
    middleware as axum_middleware,
    routing::{get, post},
    Router,
};
use tower_http::trace::TraceLayer;
use utoipa::OpenApi;

/// Serves the auto-generated OpenAPI 3.0 spec as JSON.
/// Accessible at GET /api-docs/openapi.json — no auth required.
async fn openapi_json() -> axum::Json<utoipa::openapi::OpenApi> {
    axum::Json(ApiDoc::openapi())
}

/// utoipa OpenAPI document — lists all paths + schemas for code-gen / docs.
/// Add new handler paths here whenever a new public endpoint is created.
#[derive(OpenApi)]
#[openapi(
    paths(
        auth::register,
        auth::login,
        auth::refresh_token,
        wallet::get_balance,
        wallet::transfer,
        transaction::list_transactions,
    ),
    components(
        schemas(
            auth::RegisterRequest,
            auth::LoginRequest,
            auth::AuthResponse,
            wallet::BalanceResponse,
            wallet::TransferRequest,
            transaction::TransactionResponse,
        )
    ),
    tags(
        (name = "auth",        description = "Authentication endpoints"),
        (name = "wallet",      description = "Wallet operations"),
        (name = "transaction", description = "Transaction history"),
        (name = "webhook",     description = "Webhook handlers"),
        (name = "admin",       description = "Admin operations"),
    )
)]
pub struct ApiDoc;

/// Builds the complete application router.
///
/// Middleware layers (inner → outer):
/// - `TraceLayer`        — HTTP request/response tracing via tower-http.
/// - `rate_limit`        — sliding-window 100 req/min per IP (public routes only).
/// - `auth_middleware`   — JWT Bearer validation; injects `AuthUser` into extensions.
/// - `admin_middleware`  — JWT validation + role == "admin" check.
/// - `idempotency`       — POST /wallet/transfer deduplication via Redis cache.
pub fn create_router(state: AppState) -> Router {
    // ── Public routes ─────────────────────────────────────────────────────────
    // No authentication required. Rate-limited per IP to prevent abuse.
    let public_routes = Router::new()
        .route("/health", get(health_check))
        .route("/api-docs/openapi.json", get(openapi_json))
        .nest(
            "/auth",
            Router::new()
                .route("/register", post(auth::register))
                .route("/login", post(auth::login))
                .route("/refresh", post(auth::refresh_token))
                .route("/verify-email", post(auth::verify_email))
                .route("/forgot-password", post(auth::forgot_password))
                .route("/reset-password", post(auth::reset_password)),
        )
        .route("/webhooks/paystack", post(webhook::paystack_webhook))
        // Rate limiter applied as the outermost layer on public routes.
        .layer(axum_middleware::from_fn_with_state(
            state.clone(),
            rate_limit_middleware,
        ));

    // ── Protected routes ──────────────────────────────────────────────────────
    // Require a valid JWT Bearer token (auth_middleware validates and extracts AuthUser).
    // The transfer route additionally enforces idempotency via a Redis-backed cache.
    let protected_routes = Router::new()
        .nest(
            "/wallet",
            Router::new()
                .route("/balance", get(wallet::get_balance))
                .route("/balance-stream", get(wallet::balance_stream))
                .route("/lookup/{account_number}", get(wallet::lookup_by_account_number))
                .route(
                    "/transfer",
                    post(wallet::transfer).layer(axum_middleware::from_fn_with_state(
                        state.clone(),
                        crate::middleware::idempotency::idempotency_middleware,
                    )),
                ),
        )
        .nest(
            "/transactions",
            Router::new()
                .route("/", get(transaction::list_transactions))
                .route("/{id}", get(transaction::get_transaction)),
        );

    // ── Admin routes ──────────────────────────────────────────────────────────
    // admin_middleware performs JWT validation AND enforces role == "admin".
    // No separate auth_middleware layer needed — admin_middleware is self-contained.
    let admin_routes = Router::new().nest(
        "/admin",
        Router::new()
            .route("/users", get(admin::list_users))
            .route("/users/{id}", get(admin::get_user))
            .route("/wallets/{id}/freeze", post(admin::freeze_wallet))
            .route("/wallets/{id}/credit", post(admin::credit_wallet))
            .route("/audit-logs", get(admin::list_audit_logs)),
    );

    // ── Combine all route groups ───────────────────────────────────────────────
    // Each group gets its own middleware stack; TraceLayer wraps everything.
    Router::new()
        .merge(public_routes)
        .merge(protected_routes.layer(axum_middleware::from_fn_with_state(
            state.clone(),
            crate::middleware::auth::auth_middleware,
        )))
        .merge(admin_routes.layer(axum_middleware::from_fn_with_state(
            state.clone(),
            crate::middleware::auth::admin_middleware,
        )))
        .with_state(state)
        .layer(TraceLayer::new_for_http())
}

/// GET /health — checks liveness of the Postgres pool and Redis.
/// Returns 200 `{ status: "healthy" }` or 503 `{ status: "unhealthy" }`.
/// Used by Docker healthchecks and load-balancer probes.
async fn health_check(state: axum::extract::State<AppState>) -> impl axum::response::IntoResponse {
    use axum::http::StatusCode;
    use serde_json::json;

    // Simple query to verify the Postgres pool can acquire a connection.
    let db_healthy = sqlx::query("SELECT 1")
        .fetch_optional(&state.db)
        .await
        .is_ok();

    // Acquire a Redis connection and send PING; any error → unhealthy.
    // If Redis is not configured, report it as unhealthy but don't fail the whole check.
    let redis_healthy = if let Some(ref redis_pool) = state.redis {
        match redis_pool.get().await {
            Ok(mut conn) => {
                let result: Result<String, _> =
                    deadpool_redis::redis::cmd("PING").query_async(&mut *conn).await;
                result.is_ok()
            }
            Err(_) => false,
        }
    } else {
        false
    };

    if !redis_healthy {
        return (
            StatusCode::SERVICE_UNAVAILABLE,
            axum::Json(json!({
                "status": "unhealthy",
                "database": db_healthy,
                "redis": false
            })),
        );
    }

    (
        StatusCode::OK,
        axum::Json(json!({
            "status": "healthy",
            "database": db_healthy,
            "redis": true
        })),
    )
}
