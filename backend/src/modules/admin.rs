//! Admin module — privileged endpoints for user and wallet management.
//!
//! All handlers are protected by `admin_middleware`, which validates the
//! Bearer JWT AND enforces `role == "admin"`.  Regular users receive 403.
//!
//! Audit logging: every wallet freeze/unfreeze action is written to the
//! `audit_log` table.  Log failures are intentionally non-fatal (the admin
//! action still succeeds) to avoid coupling administrative control to the
//! audit subsystem.

use crate::error::{AppError, Result};
use crate::middleware::auth::AuthUser;
use crate::state::AppState;
use axum::{
    extract::{Path, Query, State},
    Json,
};
use serde::{Deserialize, Serialize};
use uuid::Uuid;
use validator::Validate;

// ── Query params / DTOs ───────────────────────────────────────────────────────

/// Shared pagination params reused by list_users and list_audit_logs.
#[derive(Debug, Deserialize, utoipa::IntoParams)]
pub struct UserQuery {
    pub page: Option<u32>,
    pub limit: Option<u32>,
}

/// User with wallet information — returned in user list
#[derive(Debug, Serialize)]
pub struct UserWithWalletResponse {
    pub id: Uuid,
    pub email: String,
    pub role: String,
    pub is_verified: bool,
    pub created_at: chrono::DateTime<chrono::Utc>,
    pub wallet_id: Option<Uuid>,
    pub balance_kobo: Option<i64>,
    pub account_number: Option<String>,
}

/// Paginated list of users with wallet info
#[derive(Debug, Serialize)]
pub struct UsersListResponse {
    pub users: Vec<UserWithWalletResponse>,
    /// Total rows in the users table (before pagination).
    pub total: i64,
}

/// Wallet details returned after a freeze/unfreeze toggle.
#[derive(Debug, Serialize)]
pub struct WalletDetailResponse {
    pub id: Uuid,
    pub user_id: Uuid,
    pub balance_kobo: i64,
    pub account_number: String,
    pub is_frozen: bool,
}

/// Single audit log entry — records who did what and to which resource.
#[derive(Debug, Serialize)]
pub struct AuditLogResponse {
    pub id: Uuid,
    pub actor_id: Option<Uuid>,
    pub action: String,
    pub target_type: String,
    pub target_id: Option<Uuid>,
    pub created_at: chrono::DateTime<chrono::Utc>,
}

// ── Handlers ──────────────────────────────────────────────────────────────────

/// Returns a paginated list of all registered users, newest first.
/// Offset-based pagination: page × limit rows are skipped.
#[utoipa::path(
    get,
    path = "/admin/users",
    params(UserQuery),
    responses(
        (status = 200, description = "Users retrieved successfully"),
        (status = 403, description = "Admin access required"),
    ),
    security(("bearer_auth" = []))
)]
pub async fn list_users(
    State(state): State<AppState>,
    Query(query): Query<UserQuery>,
) -> Result<Json<UsersListResponse>> {
    // Clamp page to ≥ 1 and limit to ≤ 100 to prevent absurd offsets.
    let page = query.page.unwrap_or(1).max(1);
    let limit = query.limit.unwrap_or(20).min(100);
    let offset = (page - 1) * limit;

    // Count all users for the client's pagination controls.
    let total = sqlx::query_scalar::<_, i64>("SELECT COUNT(*) FROM users")
        .fetch_one(&state.db)
        .await?;

    // Fetch users with their wallet info using LEFT JOIN
    let users = sqlx::query_as::<_, UserRow>(
        "SELECT u.id, u.email, u.role, u.is_verified, u.created_at,
                w.id as wallet_id, w.balance_kobo, w.account_number
         FROM users u
         LEFT JOIN wallets w ON u.id = w.user_id
         ORDER BY u.created_at DESC LIMIT $1 OFFSET $2",
    )
    .bind(limit as i64)
    .bind(offset as i64)
    .fetch_all(&state.db)
    .await?;

    let users: Vec<UserWithWalletResponse> = users.into_iter().map(|u| u.into()).collect();

    Ok(Json(UsersListResponse { users, total }))
}

/// Fetches a single user by UUID for detailed admin inspection.
/// Returns 404 if the user does not exist.
#[utoipa::path(
    get,
    path = "/admin/users/{id}",
    params(
        ("id" = String, Path, description = "User ID (UUID)")
    ),
    responses(
        (status = 200, description = "User retrieved successfully"),
        (status = 404, description = "User not found"),
        (status = 403, description = "Admin access required"),
    ),
    security(("bearer_auth" = []))
)]
pub async fn get_user(
    State(state): State<AppState>,
    Path(id): Path<Uuid>,
) -> Result<Json<UserWithWalletResponse>> {
    let user = sqlx::query_as::<_, UserRow>(
        "SELECT id, email, role, is_verified, created_at FROM users WHERE id = $1",
    )
    .bind(id)
    .fetch_optional(&state.db)
    .await?
    .ok_or(AppError::UserNotFound)?;

    Ok(Json(user.into()))
}

/// Freeze or unfreeze a wallet (admin only — toggles current state)
///
/// Uses a single `UPDATE … SET is_frozen = NOT is_frozen … RETURNING` query
/// so the toggle is atomic — no separate read/write round trip needed.
/// After the update, the action is written to `audit_log` for traceability.
#[utoipa::path(
    post,
    path = "/admin/wallets/{id}/freeze",
    params(
        ("id" = String, Path, description = "Wallet ID (UUID)")
    ),
    responses(
        (status = 200, description = "Wallet freeze status toggled successfully"),
        (status = 404, description = "Wallet not found"),
        (status = 403, description = "Admin access required"),
    ),
    security(("bearer_auth" = []))
)]
pub async fn freeze_wallet(
    State(state): State<AppState>,
    auth_user: AuthUser,
    Path(wallet_id): Path<Uuid>,
) -> Result<Json<WalletDetailResponse>> {
    // Toggle frozen status atomically — RETURNING gives us the new state.
    let wallet = sqlx::query_as::<_, WalletRow>(
        r#"
        UPDATE wallets
        SET is_frozen = NOT is_frozen, updated_at = NOW()
        WHERE id = $1
        RETURNING id, user_id, balance_kobo, account_number, is_frozen
        "#,
    )
    .bind(wallet_id)
    .fetch_optional(&state.db)
    .await?
    .ok_or(AppError::WalletNotFound)?;

    // Audit log — failure here is non-fatal, so we ignore the error
    // to avoid blocking the admin action on a logging subsystem issue.
    let action = if wallet.is_frozen {
        "freeze_wallet"
    } else {
        "unfreeze_wallet"
    };
    let _ = sqlx::query(
        "INSERT INTO audit_log (actor_id, action, target_type, target_id, details) \
         VALUES ($1, $2, $3, $4, $5)",
    )
    .bind(auth_user.user_id)
    .bind(action)
    .bind("wallet")
    .bind(wallet_id)
    // Store the wallet_id in JSONB details for easy querying later.
    .bind(serde_json::json!({ "wallet_id": wallet_id.to_string() }))
    .execute(&state.db)
    .await;

    Ok(Json(wallet.into()))
}

/// Returns the most recent audit log entries, newest first.
/// Useful for reviewing administrative actions and detecting misuse.
#[utoipa::path(
    get,
    path = "/admin/audit-logs",
    params(UserQuery),
    responses(
        (status = 200, description = "Audit logs retrieved successfully"),
        (status = 403, description = "Admin access required"),
    ),
    security(("bearer_auth" = []))
)]
pub async fn list_audit_logs(
    State(state): State<AppState>,
    Query(query): Query<UserQuery>,
) -> Result<Json<Vec<AuditLogResponse>>> {
    // limit capped at 100 to prevent large result sets hammering the DB.
    let limit = query.limit.unwrap_or(50).min(100);

    let logs = sqlx::query_as::<_, AuditLogRow>(
        "SELECT id, actor_id, action, target_type, target_id, created_at \
         FROM audit_log ORDER BY created_at DESC LIMIT $1",
    )
    .bind(limit as i64)
    .fetch_all(&state.db)
    .await?;

    let logs: Vec<AuditLogResponse> = logs.into_iter().map(|l| l.into()).collect();

    Ok(Json(logs))
}

// ── Internal row types ──────────────────────────────────────────────────────

/// sqlx row mapping for the `users` table with wallet info.
#[derive(sqlx::FromRow)]
struct UserRow {
    id: Uuid,
    email: String,
    role: String,
    is_verified: bool,
    created_at: chrono::DateTime<chrono::Utc>,
    wallet_id: Option<Uuid>,
    balance_kobo: Option<i64>,
    account_number: Option<String>,
}

/// Converts the raw DB row into the public-facing DTO.
impl From<UserRow> for UserWithWalletResponse {
    fn from(row: UserRow) -> Self {
        Self {
            id: row.id,
            email: row.email,
            role: row.role,
            is_verified: row.is_verified,
            created_at: row.created_at,
            wallet_id: row.wallet_id,
            balance_kobo: row.balance_kobo,
            account_number: row.account_number,
        }
    }
}

/// sqlx row mapping for the `wallets` table — returned after freeze toggle.
#[derive(sqlx::FromRow)]
struct WalletRow {
    id: Uuid,
    user_id: Uuid,
    balance_kobo: i64,
    account_number: String,
    is_frozen: bool,
}

/// Converts the raw wallet row into the public-facing DTO.
impl From<WalletRow> for WalletDetailResponse {
    fn from(row: WalletRow) -> Self {
        Self {
            id: row.id,
            user_id: row.user_id,
            balance_kobo: row.balance_kobo,
            account_number: row.account_number,
            is_frozen: row.is_frozen,
        }
    }
}

/// sqlx row mapping for the `audit_log` table.
#[derive(sqlx::FromRow)]
struct AuditLogRow {
    id: Uuid,
    actor_id: Option<Uuid>,
    action: String,
    target_type: String,
    target_id: Option<Uuid>,
    created_at: chrono::DateTime<chrono::Utc>,
}

/// Converts the raw audit row into the public-facing DTO.
impl From<AuditLogRow> for AuditLogResponse {
    fn from(row: AuditLogRow) -> Self {
        Self {
            id: row.id,
            actor_id: row.actor_id,
            action: row.action,
            target_type: row.target_type,
            target_id: row.target_id,
            created_at: row.created_at,
        }
    }
}

// ── Credit Wallet Request ───────────────────────────────────────────────────────

/// Admin request to credit a user's wallet
#[derive(Debug, Deserialize, Validate, utoipa::ToSchema)]
pub struct CreditRequest {
    #[validate(range(min = 100))]
    pub amount_kobo: i64,
    pub reference: Option<String>,
    pub reason: String,
}

// ── Credit Wallet Handler ───────────────────────────────────────────────────────

/// Credit a user's wallet from the bank's operating account (admin only)
///
/// This simulates how banks credit customer accounts:
/// - DEBIT: Bank Operating Account (operations@payvault.com)
/// - CREDIT: User Wallet
///
/// All credits are logged in audit_log for compliance and traceability.
#[utoipa::path(
    post,
    path = "/admin/wallets/{id}/credit",
    params(
        ("id" = String, Path, description = "Wallet ID (UUID)")
    ),
    request_body = CreditRequest,
    responses(
        (status = 200, description = "Wallet credited successfully"),
        (status = 404, description = "Wallet not found"),
        (status = 403, description = "Admin access required"),
    ),
    security(("bearer_auth" = []))
)]
pub async fn credit_wallet(
    State(state): State<AppState>,
    auth_user: AuthUser,
    Path(wallet_id): Path<Uuid>,
    Json(req): Json<CreditRequest>,
) -> Result<Json<WalletDetailResponse>> {
    req.validate()?;

    // Get the operations account (bank's operating account)
    let operations_account = sqlx::query_scalar::<_, Uuid>(
        "SELECT user_id FROM wallets WHERE account_number = '0000000001'"
    )
    .fetch_optional(&state.db)
    .await?
    .unwrap_or(auth_user.user_id); // Fallback to admin if ops account doesn't exist

    // Begin transaction
    let mut tx = state.db.begin().await?;

    // Credit the user's wallet
    let wallet = sqlx::query_as::<_, WalletRow>(
        "UPDATE wallets
         SET balance_kobo = balance_kobo + $1, updated_at = NOW()
         WHERE id = $2
         RETURNING id, user_id, balance_kobo, account_number, is_frozen",
    )
    .bind(req.amount_kobo)
    .bind(wallet_id)
    .fetch_optional(&mut *tx)
    .await?
    .ok_or(AppError::WalletNotFound)?;

    // Debit the operations account (simulating bank reserves).
    // If the ops account doesn't have sufficient balance, we still proceed —
    // admin credits are bank-issued funds and take priority over internal accounting.
    let ops_debit_result = sqlx::query(
        "UPDATE wallets
         SET balance_kobo = balance_kobo - $1, updated_at = NOW()
         WHERE user_id = $2 AND balance_kobo >= $1",
    )
    .bind(req.amount_kobo)
    .bind(operations_account)
    .execute(&mut *tx)
    .await?;

    // If ops account couldn't be debited (insufficient funds), log a warning
    // but proceed — the credit is an admin override.
    if ops_debit_result.rows_affected() == 0 {
        tracing::warn!(
            "Admin credit: operations account (user {}) had insufficient funds. \
             Credit proceeded as admin override.",
            operations_account
        );
    }

    // Insert transaction record
    let reference = req.reference.unwrap_or_else(|| format!("ADMIN-CREDIT-{}", Uuid::new_v4()));
    sqlx::query(
        "INSERT INTO transactions 
        (reference, sender_id, receiver_id, amount_kobo, type, status, metadata)
         VALUES ($1, $2, $3, $4, 'credit', 'completed', $5)",
    )
    .bind(&reference)
    .bind(operations_account)
    .bind(wallet.user_id)
    .bind(req.amount_kobo)
    .bind(serde_json::json!({
        "credited_by": auth_user.email,
        "reason": req.reason,
        "type": "admin_credit"
    }))
    .execute(&mut *tx)
    .await?;

    // Commit transaction
    tx.commit().await?;

    // Audit log
    let _ = sqlx::query(
        "INSERT INTO audit_log (actor_id, action, target_type, target_id, details)
         VALUES ($1, $2, $3, $4, $5)",
    )
    .bind(auth_user.user_id)
    .bind("credit_wallet")
    .bind("wallet")
    .bind(wallet_id)
    .bind(serde_json::json!({
        "amount_kobo": req.amount_kobo,
        "user_email": wallet.account_number,
        "reason": req.reason,
        "reference": reference
    }))
    .execute(&state.db)
    .await;

    tracing::info!(
        "Admin credited {} kobo to wallet {} (user: {})",
        req.amount_kobo,
        wallet_id,
        auth_user.email
    );

    Ok(Json(wallet.into()))
}
