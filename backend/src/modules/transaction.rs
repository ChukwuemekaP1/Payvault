//! Transaction module — query and paginate transaction history.
//!
//! All handlers are protected (require a valid Bearer JWT via auth_middleware).
//! Transactions are scoped to the authenticated user: only rows where
//! `sender_id = user_id OR receiver_id = user_id` are ever returned.
//!
//! Pagination: offset-based (page + limit).  Two separate static query
//! branches are used instead of dynamic query building to keep sqlx's
//! compile-time type checking intact.

use crate::error::{AppError, Result};
use crate::middleware::auth::AuthUser;
use crate::state::AppState;
use axum::{
    extract::{Path, Query, State},
    Json,
};
use serde::{Deserialize, Serialize};
use uuid::Uuid;

// ── Query params / DTOs ───────────────────────────────────────────────────────

/// Query string params for GET /transactions.
/// All fields are optional — omitting them returns all transactions, page 1.
#[derive(Debug, Deserialize, utoipa::IntoParams)]
pub struct TransactionQuery {
    pub page: Option<u32>,
    pub limit: Option<u32>,
    /// Filter by transaction type: "transfer", "credit", etc.
    #[serde(rename = "type")]
    pub tx_type: Option<String>,
}

/// A single transaction as returned to the client.
/// `amount_naira` is derived (÷ 100) from `amount_kobo` for display convenience.
#[derive(Debug, Serialize, utoipa::ToSchema)]
pub struct TransactionResponse {
    pub id: Uuid,
    pub reference: String,
    pub amount_kobo: i64,
    pub amount_naira: f64,
    #[serde(rename = "type")]
    pub tx_type: String,
    pub status: String,
    pub created_at: chrono::DateTime<chrono::Utc>,
    pub sender_id: Option<Uuid>,
    pub receiver_id: Option<Uuid>,
}

/// Paginated wrapper returned by GET /transactions.
#[derive(Debug, Serialize)]
pub struct TransactionsListResponse {
    pub transactions: Vec<TransactionResponse>,
    /// Total matching rows (before pagination) — used by the client to render page controls.
    pub total: i64,
    pub page: u32,
    pub limit: u32,
}

// ── Internal sqlx row type ────────────────────────────────────────────────────

/// Intermediate type used by sqlx's FromRow derive.
/// The SQL column `type` is aliased to `tx_type` in every query because
/// `type` is a reserved keyword in Rust and cannot be used as a field name.
#[derive(sqlx::FromRow)]
struct TransactionRow {
    id: Uuid,
    reference: String,
    amount_kobo: i64,
    #[sqlx(rename = "tx_type")]
    tx_type: String,
    status: String,
    created_at: chrono::DateTime<chrono::Utc>,
    sender_id: Option<Uuid>,
    receiver_id: Option<Uuid>,
}

/// Converts the raw DB row into the public-facing DTO, deriving `amount_naira`.
impl From<TransactionRow> for TransactionResponse {
    fn from(row: TransactionRow) -> Self {
        Self {
            id: row.id,
            reference: row.reference,
            amount_kobo: row.amount_kobo,
            amount_naira: row.amount_kobo as f64 / 100.0,
            tx_type: row.tx_type,
            status: row.status,
            created_at: row.created_at,
            sender_id: row.sender_id,
            receiver_id: row.receiver_id,
        }
    }
}

// ── Handlers ──────────────────────────────────────────────────────────────────

/// Lists the authenticated user's transactions with optional type filtering
/// and offset-based pagination.
///
/// Two static query branches are used (with/without type filter) rather than
/// one dynamic query — this preserves sqlx's compile-time type checking and
/// avoids allocating a `Box<dyn Encode>` trait-object vector.
#[utoipa::path(
    get,
    path = "/transactions",
    params(TransactionQuery),
    responses(
        (status = 200, description = "Transactions retrieved successfully"),
    ),
    security(("bearer_auth" = []))
)]
pub async fn list_transactions(
    State(state): State<AppState>,
    auth_user: AuthUser,
    Query(query): Query<TransactionQuery>,
) -> Result<Json<TransactionsListResponse>> {
    // Clamp page to ≥ 1 and limit to ≤ 100 to prevent absurd offsets.
    let page = query.page.unwrap_or(1).max(1);
    let limit = query.limit.unwrap_or(20).min(100);
    let offset = (page - 1) * limit;

    let (total, transactions) = if let Some(ref tx_type) = query.tx_type {
        // ── Filtered branch: WHERE … AND type = $2 ───────────────────────────
        let total = sqlx::query_scalar::<_, i64>(
            "SELECT COUNT(*) FROM transactions \
             WHERE (sender_id = $1 OR receiver_id = $1) AND type = $2",
        )
        .bind(auth_user.user_id)
        .bind(tx_type)
        .fetch_one(&state.db)
        .await?;

        // `type AS tx_type` renames the reserved keyword so sqlx can map it
        // to the `tx_type` field on TransactionRow via the #[sqlx(rename)] attr.
        let rows = sqlx::query_as::<_, TransactionRow>(
            r#"
            SELECT id, reference, amount_kobo,
                   type AS tx_type,
                   status, created_at, sender_id, receiver_id
            FROM transactions
            WHERE (sender_id = $1 OR receiver_id = $1) AND type = $2
            ORDER BY created_at DESC
            LIMIT $3 OFFSET $4
            "#,
        )
        .bind(auth_user.user_id)
        .bind(tx_type)
        .bind(limit as i64)
        .bind(offset as i64)
        .fetch_all(&state.db)
        .await?;

        (total, rows)
    } else {
        // ── Unfiltered branch: no type predicate ─────────────────────────────
        let total = sqlx::query_scalar::<_, i64>(
            "SELECT COUNT(*) FROM transactions \
             WHERE sender_id = $1 OR receiver_id = $1",
        )
        .bind(auth_user.user_id)
        .fetch_one(&state.db)
        .await?;

        let rows = sqlx::query_as::<_, TransactionRow>(
            r#"
            SELECT id, reference, amount_kobo,
                   type AS tx_type,
                   status, created_at, sender_id, receiver_id
            FROM transactions
            WHERE sender_id = $1 OR receiver_id = $1
            ORDER BY created_at DESC
            LIMIT $2 OFFSET $3
            "#,
        )
        .bind(auth_user.user_id)
        .bind(limit as i64)
        .bind(offset as i64)
        .fetch_all(&state.db)
        .await?;

        (total, rows)
    };

    // Convert raw rows → public DTOs (derives amount_naira and renames tx_type).
    let transactions: Vec<TransactionResponse> =
        transactions.into_iter().map(|t| t.into()).collect();

    Ok(Json(TransactionsListResponse {
        transactions,
        total,
        page,
        limit,
    }))
}

/// Fetches a single transaction by ID, scoped to the authenticated user.
///
/// The `sender_id = $2 OR receiver_id = $2` clause ensures users can only
/// see their own transactions — no further authorisation check needed.
#[utoipa::path(
    get,
    path = "/transactions/{id}",
    params(
        ("id" = String, Path, description = "Transaction ID (UUID)")
    ),
    responses(
        (status = 200, description = "Transaction retrieved successfully"),
        (status = 404, description = "Transaction not found"),
    ),
    security(("bearer_auth" = []))
)]
pub async fn get_transaction(
    State(state): State<AppState>,
    auth_user: AuthUser,
    Path(id): Path<Uuid>,
) -> Result<Json<TransactionResponse>> {
    let transaction = sqlx::query_as::<_, TransactionRow>(
        r#"
        SELECT id, reference, amount_kobo,
               type AS tx_type,
               status, created_at, sender_id, receiver_id
        FROM transactions
        WHERE id = $1 AND (sender_id = $2 OR receiver_id = $2)
        "#,
    )
    .bind(id)
    .bind(auth_user.user_id)
    .fetch_optional(&state.db)
    .await?
    // Returns 404 if the row doesn't exist OR belongs to a different user.
    .ok_or(AppError::TransactionNotFound)?;

    Ok(Json(transaction.into()))
}
