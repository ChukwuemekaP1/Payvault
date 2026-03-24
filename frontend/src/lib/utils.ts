import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

/**
 * Merge Tailwind CSS classes with clsx + tailwind-merge
 */
export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}

/**
 * Format a kobo amount to Nigerian Naira display string.
 * API amounts are stored in kobo (integer) — divide by 100 for display.
 * Example: 125040000 → "₦ 1,250,400.00"
 */
export function formatNgn(kobo: number): string {
  const naira = kobo / 100;
  return `₦ ${naira.toLocaleString("en-NG", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

/**
 * Format an ISO date string to a human-readable format.
 * Example: "2026-03-18T15:42:00Z" → "18 Mar 2026, 3:42 PM"
 */
export function formatDate(iso: string): string {
  const date = new Date(iso);
  if (isNaN(date.getTime())) return "—";

  const day = date.getDate();
  const month = date.toLocaleString("en-GB", { month: "short" });
  const year = date.getFullYear();
  const time = date.toLocaleString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });

  return `${day} ${month} ${year}, ${time}`;
}

/**
 * Format a relative date string (e.g. "2 hours ago", "3 days ago").
 * Useful for transaction lists.
 */
export function formatRelativeDate(iso: string): string {
  const date = new Date(iso);
  if (isNaN(date.getTime())) return "—";

  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffSeconds = Math.floor(diffMs / 1000);
  const diffMinutes = Math.floor(diffSeconds / 60);
  const diffHours = Math.floor(diffMinutes / 60);
  const diffDays = Math.floor(diffHours / 24);
  const diffWeeks = Math.floor(diffDays / 7);
  const diffMonths = Math.floor(diffDays / 30);

  if (diffSeconds < 60) return "just now";
  if (diffMinutes < 60) return `${diffMinutes} minute${diffMinutes === 1 ? "" : "s"} ago`;
  if (diffHours < 24) return `${diffHours} hour${diffHours === 1 ? "" : "s"} ago`;
  if (diffDays < 7) return `${diffDays} day${diffDays === 1 ? "" : "s"} ago`;
  if (diffWeeks < 5) return `${diffWeeks} week${diffWeeks === 1 ? "" : "s"} ago`;
  if (diffMonths < 12) return `${diffMonths} month${diffMonths === 1 ? "" : "s"} ago`;

  return formatDate(iso);
}

/**
 * Format an account number with a dash after the first 4 digits.
 * Example: "3022456789" → "3022-456789"
 */
export function formatAccountNumber(acct: string): string {
  if (!acct || acct.length < 4) return acct;
  const cleaned = acct.replace(/\D/g, "");
  if (cleaned.length <= 4) return cleaned;
  return `${cleaned.slice(0, 4)}-${cleaned.slice(4)}`;
}

/**
 * Truncate a reference string to the first 8 characters followed by "...".
 * Example: "TXN-20260318-ABCD1234" → "TXN-2026..."
 */
export function truncateReference(ref: string): string {
  if (!ref) return "—";
  if (ref.length <= 8) return ref;
  return `${ref.slice(0, 8)}...`;
}

/**
 * Convert naira (user-facing) to kobo (API).
 * Example: 1250.00 → 125000
 */
export function nairaToKobo(naira: number): number {
  return Math.round(naira * 100);
}

/**
 * Convert kobo (API) to naira (user-facing).
 * Example: 125000 → 1250.00
 */
export function koboToNaira(kobo: number): number {
  return kobo / 100;
}

/**
 * Mask a balance for the "hidden" state: "₦ ●●●,●●●.●●"
 */
export function maskBalance(): string {
  return "₦ ●●●,●●●.●●";
}

/**
 * Generate a short human-readable transaction description
 * based on the transaction type and direction.
 */
export function getTransactionDescription(
  type: string,
  senderAccount?: string | null,
  receiverAccount?: string | null
): string {
  if (type === "credit") {
    return senderAccount ? `From: ${formatAccountNumber(senderAccount)}` : "Wallet Credit";
  }
  if (type === "transfer") {
    return receiverAccount ? `To: ${formatAccountNumber(receiverAccount)}` : "Money Transfer";
  }
  return "Transaction";
}

/**
 * Clamp a number between min and max (inclusive).
 */
export function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

/**
 * Get password strength score (0–4) and label.
 * 0 = very weak, 1 = weak, 2 = fair, 3 = strong, 4 = excellent
 */
export function getPasswordStrength(password: string): {
  score: number;
  label: string;
  color: string;
} {
  if (!password) return { score: 0, label: "", color: "" };

  let score = 0;
  if (password.length >= 8) score++;
  if (password.length >= 12) score++;
  if (/[A-Z]/.test(password)) score++;
  if (/[0-9]/.test(password)) score++;
  if (/[^A-Za-z0-9]/.test(password)) score++;

  // Normalize to 0–4
  const normalized = clamp(score, 0, 4);

  const labels = ["", "Weak", "Fair", "Strong", "Excellent"];
  const colors = ["", "#FF3B3B", "#FFB800", "#FF5C2B", "#00C97A"];

  return {
    score: normalized,
    label: labels[normalized] ?? "Weak",
    color: colors[normalized] ?? "#FF3B3B",
  };
}
