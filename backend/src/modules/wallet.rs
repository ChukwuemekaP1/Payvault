//! Wallet module — balance enquiry, money transfers, and real-time SSE updates.
//!
//! All handlers are protected (require a valid Bearer JWT via auth_middleware).
//!
//! Transfer atomicity: a Postgres transaction with `FOR UPDATE` row-locking on
//! the sender's wallet prevents race conditions when concurrent transfers run
//! against the same account.
//!
//! SSE stream: a plain polling loop (every 30 s) via `futures_util::unfold` —
//! no pub/sub infrastructure needed.  The stream emits a `balance_update` event
//! only when the balance actually changes; otherwise it sends a no-op `ping`.

use crate::error::{AppError, Result};
use crate::middleware::auth::AuthUser;
use crate::state::AppState;
use axum::{
    extract::{Path, State},
    http::StatusCode,
    response::{
        sse::{Event, KeepAlive, Sse},
        IntoResponse,
    },
    Json,
};
use futures_util::stream::Stream;
use serde::{Deserialize, Serialize};
use uuid::Uuid;
use validator::Validate;

// ── Response / Request DTOs ───────────────────────────────────────────────────

/// Returned by GET /wallet/balance.
/// `balance_kobo` is the canonical integer stored in Postgres;
/// `balance_naira` is derived (÷ 100) for display convenience.
#[derive(Debug, Serialize, utoipa::ToSchema)]
pub struct BalanceResponse {
    pub balance_kobo: i64,
    pub balance_naira: f64,
    pub account_number: String,
}

/// Body for POST /wallet/transfer.
/// `amount_kobo` must be ≥ 100 (₦1.00 minimum).
/// `reference` is optional — the server generates a UUID-based one if absent.
#[derive(Debug, Deserialize, Validate, utoipa::ToSchema)]
pub struct TransferRequest {
    pub recipient_account: String,
    #[validate(range(min = 100))]
    pub amount_kobo: i64,
    pub reference: Option<String>,
}

/// Returned by POST /wallet/transfer on success.
#[derive(Debug, Serialize)]
pub struct TransferResponse {
    pub transaction_id: Uuid,
    pub reference: String,
    pub amount_kobo: i64,
    pub recipient_account: String,
    /// Sender's new balance after the transfer, in kobo.
    pub new_balance_kobo: i64,
}

/// Returned by GET /wallet/lookup/{account_number}
#[derive(Debug, Serialize, utoipa::ToSchema)]
pub struct WalletLookupResponse {
    pub account_number: String,
    pub holder_name: String,
    pub holder_role: String,
}

// ── Handlers ──────────────────────────────────────────────────────────────────

/// Internal row mapping for wallet lookup
#[derive(Debug, sqlx::FromRow)]
struct WalletLookupRow {
    account_number: String,
    holder_name: String,
    holder_role: String,
}

/// Returns the authenticated user's current wallet balance and account number.
/// Single SELECT — no locking needed for a plain read.
#[utoipa::path(
    get,
    path = "/wallet/balance",
    responses(
        (status = 200, description = "Balance retrieved successfully", body = BalanceResponse),
        (status = 404, description = "Wallet not found"),
    ),
    security(("bearer_auth" = []))
)]
pub async fn get_balance(
    State(state): State<AppState>,
    auth_user: AuthUser,
) -> Result<Json<BalanceResponse>> {
    let (balance_kobo, account_number) = sqlx::query_as::<_, (i64, String)>(
        "SELECT balance_kobo, account_number FROM wallets WHERE user_id = $1",
    )
    .bind(auth_user.user_id)
    .fetch_optional(&state.db)
    .await?
    .ok_or(AppError::WalletNotFound)?;

    Ok(Json(BalanceResponse {
        balance_kobo,
        balance_naira: balance_kobo as f64 / 100.0,
        account_number,
    }))
}

/// Get wallet holder details by account number (for name lookup during transfers)
#[utoipa::path(
    get,
    path = "/wallet/lookup/{account_number}",
    params(
        ("account_number" = String, Path, description = "10-digit account number")
    ),
    responses(
        (status = 200, description = "Wallet found", body = WalletLookupResponse),
        (status = 404, description = "Wallet not found"),
        (status = 403, description = "Authentication required"),
    ),
    security(("bearer_auth" = []))
)]
pub async fn lookup_by_account_number(
    State(state): State<AppState>,
    Path(account_number): Path<String>,
) -> Result<Json<WalletLookupResponse>> {
    // Validate account number format
    if account_number.len() != 10 || !account_number.chars().all(|c| c.is_ascii_digit()) {
        return Err(AppError::WalletNotFound);
    }

    let wallet = sqlx::query_as::<_, WalletLookupRow>(
        "SELECT w.account_number, u.email as holder_name, u.role as holder_role \
         FROM wallets w \
         JOIN users u ON w.user_id = u.id \
         WHERE w.account_number = $1",
    )
    .bind(&account_number)
    .fetch_optional(&state.db)
    .await?
    .ok_or(AppError::WalletNotFound)?;

    Ok(Json(WalletLookupResponse {
        account_number: wallet.account_number,
        holder_name: wallet.holder_name,
        holder_role: wallet.holder_role,
    }))
}

/// Transfers money atomically from the authenticated user's wallet to a
/// recipient identified by their 10-digit account number.
///
/// Atomicity strategy (Postgres transaction + `FOR UPDATE`):
/// 1. Lock sender row with `SELECT … FOR UPDATE` — blocks concurrent transfers.
/// 2. Check `is_frozen` flag — abort with 403 if frozen.
/// 3. Verify sufficient balance — abort with 400 if not.
/// 4. Look up recipient by account number — abort with 404 if not found.
/// 5. Deduct from sender, credit to recipient, insert transaction record.
/// 6. Commit — all five steps are rolled back automatically on any error.
///
/// Post-commit: fires a receipt email in a detached `tokio::spawn` so latency
/// is unaffected by SMTP delivery time.
#[utoipa::path(
    post,
    path = "/wallet/transfer",
    request_body = TransferRequest,
    responses(
        (status = 200, description = "Transfer successful"),
        (status = 400, description = "Insufficient funds or invalid amount"),
        (status = 403, description = "Wallet is frozen"),
    ),
    security(("bearer_auth" = []))
)]
pub async fn transfer(
    State(state): State<AppState>,
    auth_user: AuthUser,
    Json(req): Json<TransferRequest>,
) -> Result<(StatusCode, Json<TransferResponse>)> {
    req.validate()?;

    // Generate reference if not provided
    let reference = req
        .reference
        .clone()
        .unwrap_or_else(|| format!("TXN-{}", Uuid::new_v4()));

    // ── Begin atomic Postgres transaction ─────────────────────────────────────
    let mut tx = state.db.begin().await?;

    // Lock the sender row to prevent concurrent over-spend.
    let (sender_balance, _sender_account) = sqlx::query_as::<_, (i64, String)>(
        "SELECT balance_kobo, account_number FROM wallets WHERE user_id = $1 FOR UPDATE",
    )
    .bind(auth_user.user_id)
    .fetch_optional(&mut *tx)
    .await?
    .ok_or(AppError::WalletNotFound)?;

    // Check if sender wallet is frozen
    let is_frozen =
        sqlx::query_scalar::<_, bool>("SELECT is_frozen FROM wallets WHERE user_id = $1")
            .bind(auth_user.user_id)
            .fetch_one(&mut *tx)
            .await?;

    if is_frozen {
        return Err(AppError::WalletFrozen);
    }

    // Insufficient balance check — done inside the transaction so the
    // locked balance value is used (not a stale read from before the lock).
    if sender_balance < req.amount_kobo {
        return Err(AppError::InsufficientFunds);
    }

    // Find recipient by account number
    let (recipient_id, _recipient_email) = sqlx::query_as::<_, (Uuid, String)>(
        r#"
        SELECT w.user_id, u.email
        FROM wallets w
        JOIN users u ON w.user_id = u.id
        WHERE w.account_number = $1
        "#,
    )
    .bind(&req.recipient_account)
    .fetch_optional(&mut *tx)
    .await?
    .ok_or(AppError::UserNotFound)?;

    // Deduct from sender — write the exact new balance to avoid any drift.
    let new_sender_balance = sender_balance - req.amount_kobo;
    sqlx::query("UPDATE wallets SET balance_kobo = $1, updated_at = NOW() WHERE user_id = $2")
        .bind(new_sender_balance)
        .bind(auth_user.user_id)
        .execute(&mut *tx)
        .await?;

    // Credit recipient using an atomic increment to handle concurrent credits safely.
    sqlx::query(
        "UPDATE wallets SET balance_kobo = balance_kobo + $1, updated_at = NOW() WHERE user_id = $2",
    )
    .bind(req.amount_kobo)
    .bind(recipient_id)
    .execute(&mut *tx)
    .await?;

    // Insert immutable transaction record for audit trail.
    let transaction_id = sqlx::query_scalar::<_, Uuid>(
        r#"
        INSERT INTO transactions (reference, sender_id, receiver_id, amount_kobo, type, status)
        VALUES ($1, $2, $3, $4, 'transfer', 'completed')
        RETURNING id
        "#,
    )
    .bind(&reference)
    .bind(auth_user.user_id)
    .bind(recipient_id)
    .bind(req.amount_kobo)
    .fetch_one(&mut *tx)
    .await?;

    // ── Commit — if this fails everything above is rolled back automatically ──
    tx.commit().await?;

    // Send email receipt asynchronously — use already-loaded config, not re-reading from env
    let mailer = state.mailer.clone();
    let config = state.config.clone();
    let sender_email = auth_user.email.clone();
    let recipient_account = req.recipient_account.clone();
    let reference_clone = reference.clone();
    let amount_kobo = req.amount_kobo;

    // Detached task — SMTP errors are logged but do not fail the transfer response.
    tokio::spawn(async move {
        let _ = crate::utils::email::send_transaction_receipt(
            &mailer,
            &sender_email,
            amount_kobo,
            &recipient_account,
            &reference_clone,
            &config,
        )
        .await;
    });

    Ok((
        StatusCode::OK,
        Json(TransferResponse {
            transaction_id,
            reference,
            amount_kobo: req.amount_kobo,
            recipient_account: req.recipient_account,
            new_balance_kobo: new_sender_balance,
        }),
    ))
}

/// SSE endpoint for real-time balance updates (polls DB every 30 s, pushes on change)
pub async fn balance_stream(
    State(state): State<AppState>,
    auth_user: AuthUser,
) -> impl IntoResponse {
    // Axum's Sse wrapper handles chunked encoding and connection management.
    // KeepAlive sends HTTP comment lines so load balancers don't close idle connections.
    Sse::new(balance_event_stream(state, auth_user)).keep_alive(KeepAlive::new())
}

/// Returns a Stream that emits an SSE event whenever the balance changes.
/// The entire mutable state (interval + last_balance) is carried through `unfold`
/// so no Mutex or shared state is needed — purely functional approach.
fn balance_event_stream(
    state: AppState,
    auth_user: AuthUser,
) -> impl Stream<Item = std::result::Result<Event, axum::Error>> {
    use futures_util::stream::unfold;
    use tokio::time::{interval, Duration};

    // Poll every 30 seconds — adjust downward for lower latency at the cost of DB load.
    let ticker = interval(Duration::from_secs(30));

    unfold(
        // Carry all mutable state as the seed so the closure stays pure.
        (state, auth_user, ticker, None::<i64>),
        |(state, auth_user, mut ticker, mut last_balance)| async move {
            ticker.tick().await;

            // Single lightweight query — no lock needed for a read.
            let balance_result =
                sqlx::query_scalar::<_, i64>("SELECT balance_kobo FROM wallets WHERE user_id = $1")
                    .bind(auth_user.user_id)
                    .fetch_one(&state.db)
                    .await;

            let event: std::result::Result<Event, axum::Error> = match balance_result {
                Ok(current_balance) => {
                    if last_balance != Some(current_balance) {
                        // Balance changed — update local state and push to client.
                        last_balance = Some(current_balance);
                        let payload = serde_json::json!({
                            "balance_kobo": current_balance,
                            "balance_naira": current_balance as f64 / 100.0,
                        });
                        Ok(Event::default()
                            .event("balance_update")
                            .data(payload.to_string()))
                    } else {
                        // No change — send a keepalive ping so the connection stays open
                        Ok(Event::default().event("ping").data(""))
                    }
                }
                // DB error — send a silent ping rather than killing the stream.
                Err(_) => Ok(Event::default().event("ping").data("")),
            };

            Some((event, (state, auth_user, ticker, last_balance)))
        },
    )
}
