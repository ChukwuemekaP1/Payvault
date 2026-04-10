import axios, { AxiosError, InternalAxiosRequestConfig } from "axios";
import { v4 as uuidv4 } from "uuid";
import { useAuthStore } from "../store/authStore";
import type {
  AuthResponse,
  WalletBalance,
  Transaction,
  TransactionsResponse,
  TransferRequest,
  TransferResponse,
  HealthResponse,
  RefreshTokenResponse,
  RegisterRequest,
  LoginRequest,
  VerifyEmailRequest,
  ForgotPasswordRequest,
  ResetPasswordRequest,
  PaginationParams,
  WalletLookupResponse,
} from "../types";

const BASE_URL = import.meta.env.VITE_API_URL || "https://payvault-pr74.onrender.com";

// ─── Axios Instance ──────────────────────────────────────────────────────────

export const api = axios.create({
  baseURL: BASE_URL,
  headers: {
    "Content-Type": "application/json",
  },
  timeout: 15000,
});

// ─── Request Interceptor ─────────────────────────────────────────────────────

api.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    // Read the latest token directly from the store (non-hook access)
    const { accessToken } = useAuthStore.getState();
    if (accessToken && config.headers) {
      config.headers["Authorization"] = `Bearer ${accessToken}`;
    }
    return config;
  },
  (error: unknown) => Promise.reject(error)
);

// ─── Response Interceptor ────────────────────────────────────────────────────
// NOTE: Token refresh is disabled on backend (Redis unavailable).
// On 401, we log the user out immediately instead of attempting refresh.

api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as InternalAxiosRequestConfig & {
      _retry?: boolean;
    };

    // On 401, log out immediately — token refresh is disabled on backend
    if (error.response?.status === 401 && originalRequest && !originalRequest._retry) {
      originalRequest._retry = true;
      const { logout } = useAuthStore.getState();
      logout();
      window.location.href = "/auth/login";
      return Promise.reject(error);
    }

    return Promise.reject(error);
  }
);

// ─── Auth ────────────────────────────────────────────────────────────────────

/**
 * Register a new user.
 * POST /auth/register
 * The backend only requires email + password; name is stored locally only.
 */
export async function registerUser(data: RegisterRequest): Promise<void> {
  await api.post("/auth/register", {
    email: data.email,
    password: data.password,
    name: data.name,
  });
}

/**
 * Log in with email and password.
 * POST /auth/login → AuthResponse (tokens + user info)
 */
export async function loginUser(data: LoginRequest): Promise<AuthResponse> {
  const response = await api.post<AuthResponse>("/auth/login", {
    email: data.email,
    password: data.password,
  });
  return response.data;
}

/**
 * Exchange a refresh token for a new token pair.
 * POST /auth/refresh — Authorization: Bearer <refreshToken>
 */
export async function refreshTokens(
  refreshToken: string
): Promise<RefreshTokenResponse> {
  // Intentionally bypasses our interceptor-augmented instance
  const response = await axios.post<RefreshTokenResponse>(
    `${BASE_URL}/auth/refresh`,
    null,
    {
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${refreshToken}`,
      },
    }
  );
  return response.data;
}

/**
 * Verify email with a 6-digit OTP.
 * POST /auth/verify-email — requires Bearer token + { otp }
 */
export async function verifyEmail(data: VerifyEmailRequest): Promise<void> {
  await api.post("/auth/verify-email", { otp: data.otp });
}

/**
 * Lookup wallet holder by account number.
 * GET /wallet/lookup/{account_number} — returns holder name and role
 */
export async function lookupWalletByAccount(accountNumber: string): Promise<WalletLookupResponse> {
  const response = await api.get<WalletLookupResponse>(`/wallet/lookup/${accountNumber}`);
  return response.data;
}

/**
 * Request a password reset email.
 * POST /auth/forgot-password — { email }
 */
export async function forgotPassword(
  data: ForgotPasswordRequest
): Promise<void> {
  await api.post("/auth/forgot-password", { email: data.email });
}

/**
 * Reset password using the token from the reset email.
 * POST /auth/reset-password — { token, new_password }
 */
export async function resetPassword(
  data: ResetPasswordRequest
): Promise<void> {
  await api.post("/auth/reset-password", {
    otp: data.otp,
    new_password: data.new_password,
  });
}

// ─── Wallet ──────────────────────────────────────────────────────────────────

/**
 * Fetch the authenticated user's wallet balance and account number.
 * GET /wallet/balance → WalletBalance
 */
export async function getWalletBalance(): Promise<WalletBalance> {
  const response = await api.get<WalletBalance>("/wallet/balance");
  return response.data;
}

/**
 * Transfer funds to another PayVault account.
 * POST /wallet/transfer — generates a unique Idempotency-Key UUID per call.
 * Amount must be in kobo (integer).
 */
export async function transferFunds(
  data: TransferRequest
): Promise<TransferResponse> {
  const idempotencyKey = uuidv4();
  const response = await api.post<TransferResponse>("/wallet/transfer", data, {
    headers: {
      "Idempotency-Key": idempotencyKey,
    },
  });
  return response.data;
}

/**
 * Create a Server-Sent Events connection to the balance stream.
 * GET /wallet/balance-stream — EventSource (SSE)
 *
 * Since EventSource does not support custom request headers, the access
 * token is passed as a `token` query parameter.  The caller is responsible
 * for closing the returned EventSource on unmount.
 *
 * @param onBalanceUpdate - called whenever a `balance_update` event arrives
 * @param onError         - optional error handler
 * @returns the EventSource instance (call .close() in useEffect cleanup)
 */
export function createBalanceStream(
  onBalanceUpdate: (data: WalletBalance) => void,
  onError?: (e: Event) => void
): EventSource {
  const { accessToken } = useAuthStore.getState();

  const url = new URL(`${BASE_URL}/wallet/balance-stream`);
  if (accessToken) {
    // Fallback auth strategy for SSE (headers not supported by EventSource)
    url.searchParams.set("token", accessToken);
  }

  const eventSource = new EventSource(url.toString());

  eventSource.addEventListener("balance_update", (event: MessageEvent) => {
    try {
      const parsed = JSON.parse(event.data as string) as WalletBalance;
      onBalanceUpdate(parsed);
    } catch {
      console.error("[SSE] Failed to parse balance_update payload:", event.data);
    }
  });

  // ping events are keep-alive signals; no data to process
  eventSource.addEventListener("ping", () => {
    // intentionally empty
  });

  if (onError) {
    eventSource.onerror = onError;
  }

  return eventSource;
}

// ─── Transactions ────────────────────────────────────────────────────────────

/**
 * List paginated transactions for the authenticated user.
 * GET /transactions?page&limit&type
 */
export async function getTransactions(
  params: PaginationParams = {}
): Promise<TransactionsResponse> {
  const { page = 1, limit = 20, type } = params;

  const queryParams: Record<string, string | number> = { page, limit };
  if (type && type !== "all") {
    queryParams.type = type;
  }

  const response = await api.get<TransactionsResponse>("/transactions", {
    params: queryParams,
  });
  return response.data;
}

/**
 * Fetch a single transaction by ID.
 * GET /transactions/:id
 */
export async function getTransactionById(id: string): Promise<Transaction> {
  const response = await api.get<Transaction>(`/transactions/${id}`);
  return response.data;
}

// ─── Health ──────────────────────────────────────────────────────────────────

/**
 * Check the backend health status.
 * GET /health → { status, database, redis }
 */
export async function getHealth(): Promise<HealthResponse> {
  const response = await api.get<HealthResponse>("/health");
  return response.data;
}

// ─── Error Utilities ─────────────────────────────────────────────────────────

/**
 * Extract a human-readable error message from any thrown value.
 * Works with AxiosErrors (reads the `error` field from the API JSON body),
 * plain Error instances, and unknown values.
 */
export function getApiErrorMessage(error: unknown): string {
  if (axios.isAxiosError(error)) {
    const status = error.response?.status;
    const data = error.response?.data as Record<string, unknown> | undefined;

    if (data && typeof data === "object") {
      if (typeof data["error"] === "string" && data["error"]) {
        return data["error"];
      }
      if (typeof data["message"] === "string" && data["message"]) {
        return data["message"];
      }
      if (typeof data["detail"] === "string" && data["detail"]) {
        return data["detail"];
      }
    }

    if (status === 400) return "Invalid request. Please check your inputs.";
    if (status === 401) return "Session expired. Please log in again.";
    if (status === 403) return "You are not authorised to perform this action.";
    if (status === 404) return "The requested resource was not found.";
    if (status === 409) return "A conflict occurred. This resource may already exist.";
    if (status === 422) return "Unprocessable request. Please check your inputs.";
    if (status === 429) return "Too many requests. Please wait a moment and try again.";
    if (status === 500) return "Server error. Please try again later.";
    if (status === 503) return "Service temporarily unavailable. Please try again shortly.";

    if (error.code === "ECONNABORTED") return "The request timed out. Please try again.";
    if (error.code === "ERR_NETWORK") return "Network error. Please check your internet connection.";
    if (error.code === "ERR_CANCELED") return "Request was cancelled.";
  }

  if (error instanceof Error) return error.message;

  return "An unexpected error occurred. Please try again.";
}
