export interface User {
  user_id: string;
  email: string;
  role?: string; // Optional for backward compatibility
}

export interface AuthResponse {
  access_token: string;
  refresh_token: string;
  user_id: string;
  email: string;
}

export interface WalletBalance {
  balance_kobo: number;
  balance_naira: number;
  account_number: string;
}

export interface Transaction {
  id: string;
  reference: string;
  amount_kobo: number;
  amount_naira: number;
  type: string;
  status: string;
  created_at: string;
  sender_id: string | null;
  receiver_id: string | null;
}

export interface TransactionsResponse {
  transactions: Transaction[];
  total: number;
  page: number;
  limit: number;
}

export interface TransferRequest {
  recipient_account: string;
  amount_kobo: number;
  reference?: string;
}

export interface TransferResponse {
  transaction_id: string;
  reference: string;
  amount_kobo: number;
  recipient_account: string;
  new_balance_kobo: number;
}

export interface WalletLookupResponse {
  account_number: string;
  holder_name: string;
  holder_role: string;
}

export interface ApiError {
  error: string;
  details?: Record<string, string[]>;
}

export interface RegisterRequest {
  email: string;
  password: string;
  name?: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface VerifyEmailRequest {
  otp: string;
}

export interface ForgotPasswordRequest {
  email: string;
}

export interface ResetPasswordRequest {
  token: string;
  new_password: string;
}

export interface RefreshTokenResponse {
  access_token: string;
  refresh_token: string;
}

export interface HealthResponse {
  status: string;
  database: string;
  redis: string;
}

export type TransactionType = "transfer" | "credit" | string;
export type TransactionStatus = "completed" | "pending" | "failed" | string;

export interface PaginationParams {
  page?: number;
  limit?: number;
  type?: string;
}

export interface SSEBalanceUpdate {
  balance_kobo: number;
  balance_naira: number;
  account_number: string;
}
