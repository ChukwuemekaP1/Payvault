import * as React from "react";
import { ArrowUpRight, ArrowDownLeft, RefreshCw } from "lucide-react";
import { useNavigate } from "react-router-dom";
import {
  cn,
  formatNgn,
  formatRelativeDate,
  formatDate,
  formatAccountNumber,
  truncateReference,
} from "../../lib/utils";
import { Badge, statusVariant, statusLabel } from "../ui/badge";
import type { Transaction } from "../../types";

// ─── Direction Logic ──────────────────────────────────────────────────────────

type TxDirection = "credit" | "debit" | "neutral";

function getDirection(
  tx: Transaction,
  currentUserId: string | undefined
): TxDirection {
  // If the transaction type is explicitly "credit", it's always incoming
  if (tx.type === "credit") return "credit";

  // For transfers: if the current user is the receiver, it's a credit
  if (tx.type === "transfer") {
    if (currentUserId && tx.receiver_id === currentUserId) return "credit";
    return "debit";
  }

  // Fallback: use sender_id / receiver_id
  if (currentUserId) {
    if (tx.receiver_id === currentUserId) return "credit";
    if (tx.sender_id === currentUserId) return "debit";
  }

  return "neutral";
}

function getDescription(tx: Transaction, direction: TxDirection): string {
  if (direction === "credit") {
    if (tx.sender_id) {
      return `From: ${formatAccountNumber(tx.sender_id.slice(0, 10))}`;
    }
    return "Wallet Credit";
  }

  if (direction === "debit") {
    if (tx.receiver_id) {
      return `To: ${formatAccountNumber(tx.receiver_id.slice(0, 10))}`;
    }
    return "Money Transfer";
  }

  return tx.type
    ? tx.type.charAt(0).toUpperCase() + tx.type.slice(1)
    : "Transaction";
}

// ─── Direction Icon ───────────────────────────────────────────────────────────

const DirectionIcon: React.FC<{ direction: TxDirection; size?: "sm" | "md" }> = ({
  direction,
  size = "md",
}) => {
  const iconSize = size === "sm" ? "h-4 w-4" : "h-5 w-5";

  const containerClass = cn(
    "flex shrink-0 items-center justify-center rounded-full border",
    size === "sm" ? "h-9 w-9" : "h-11 w-11",
    direction === "credit" && "bg-success/10 border-success/25 text-success",
    direction === "debit" && "bg-primary/10 border-primary/25 text-primary",
    direction === "neutral" && "bg-surface border-border text-muted"
  );

  return (
    <div className={containerClass} aria-hidden="true">
      {direction === "credit" ? (
        <ArrowDownLeft className={iconSize} />
      ) : direction === "debit" ? (
        <ArrowUpRight className={iconSize} />
      ) : (
        <RefreshCw className={iconSize} />
      )}
    </div>
  );
};

// ─── Amount Display ───────────────────────────────────────────────────────────

const AmountDisplay: React.FC<{
  kobo: number;
  direction: TxDirection;
  className?: string;
}> = ({ kobo, direction, className }) => {
  const prefix = direction === "credit" ? "+" : direction === "debit" ? "-" : "";
  const formatted = formatNgn(kobo);

  return (
    <span
      className={cn(
        "font-mono text-sm font-semibold tabular-nums",
        direction === "credit" && "text-success",
        direction === "debit" && "text-primary",
        direction === "neutral" && "text-text",
        className
      )}
    >
      {prefix}
      {formatted}
    </span>
  );
};

// ─── Props ────────────────────────────────────────────────────────────────────

export interface TransactionItemProps {
  transaction: Transaction;
  /** The currently authenticated user's ID — used to determine debit vs credit */
  currentUserId?: string;
  /** Show the status badge alongside the date */
  showStatus?: boolean;
  /** Show the full ISO date instead of the relative "X hours ago" form */
  showFullDate?: boolean;
  /** Make the item a clickable link to the detail page */
  clickable?: boolean;
  /** Additional class names for the root element */
  className?: string;
  /** Compact variant: smaller icon, tighter padding */
  compact?: boolean;
}

// ─── TransactionItem ──────────────────────────────────────────────────────────

const TransactionItem: React.FC<TransactionItemProps> = ({
  transaction: tx,
  currentUserId,
  showStatus = false,
  showFullDate = false,
  clickable = true,
  className,
  compact = false,
}) => {
  const navigate = useNavigate();
  const direction = getDirection(tx, currentUserId);
  const description = getDescription(tx, direction);
  const dateText = showFullDate
    ? formatDate(tx.created_at)
    : formatRelativeDate(tx.created_at);

  const handleClick = () => {
    if (clickable) {
      navigate(`/transactions/${tx.id}`);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (clickable && (e.key === "Enter" || e.key === " ")) {
      e.preventDefault();
      navigate(`/transactions/${tx.id}`);
    }
  };

  return (
    <div
      role={clickable ? "button" : undefined}
      tabIndex={clickable ? 0 : undefined}
      aria-label={
        clickable
          ? `View transaction: ${description}, ${formatNgn(tx.amount_kobo)}`
          : undefined
      }
      onClick={clickable ? handleClick : undefined}
      onKeyDown={clickable ? handleKeyDown : undefined}
      className={cn(
        // Layout
        "flex w-full items-center gap-3",
        // Spacing
        compact ? "px-3 py-3" : "px-4 py-4",
        // Visual separator between rows
        "border-b border-border/50 last:border-0",
        // Clickable affordance
        clickable && [
          "cursor-pointer",
          "hover:bg-white/[0.025]",
          "active:bg-white/[0.04]",
          "transition-colors duration-100",
          "outline-none",
          "focus-visible:bg-white/[0.03]",
          "focus-visible:ring-inset focus-visible:ring-1 focus-visible:ring-primary/40",
        ],
        className
      )}
    >
      {/* Direction icon */}
      <DirectionIcon direction={direction} size={compact ? "sm" : "md"} />

      {/* Middle: description + reference */}
      <div className="flex min-w-0 flex-1 flex-col gap-0.5">
        <span
          className={cn(
            "font-sans font-medium text-text truncate leading-tight",
            compact ? "text-sm" : "text-sm"
          )}
        >
          {description}
        </span>

        <span className="font-mono text-xs text-muted truncate">
          {truncateReference(tx.reference)}
        </span>
      </div>

      {/* Right: amount + date + optional status badge */}
      <div className="flex shrink-0 flex-col items-end gap-1">
        <AmountDisplay kobo={tx.amount_kobo} direction={direction} />

        <div className="flex items-center gap-1.5">
          {showStatus && (
            <Badge
              variant={statusVariant(tx.status)}
              size="sm"
              dot
            >
              {statusLabel(tx.status)}
            </Badge>
          )}

          <span className="font-sans text-[11px] text-muted whitespace-nowrap">
            {dateText}
          </span>
        </div>
      </div>
    </div>
  );
};

TransactionItem.displayName = "TransactionItem";

// ─── Skeleton Row ─────────────────────────────────────────────────────────────

export const TransactionItemSkeleton: React.FC<{
  compact?: boolean;
  className?: string;
}> = ({ compact = false, className }) => (
  <div
    className={cn(
      "flex w-full items-center gap-3 border-b border-border/50 last:border-0",
      compact ? "px-3 py-3" : "px-4 py-4",
      className
    )}
    aria-hidden="true"
  >
    {/* Icon circle */}
    <div
      className={cn(
        "shrink-0 rounded-full bg-[#222228] animate-pulse",
        compact ? "h-9 w-9" : "h-11 w-11"
      )}
    />

    {/* Text lines */}
    <div className="flex flex-1 flex-col gap-2 min-w-0">
      <div className="h-3.5 w-[55%] rounded-md bg-[#222228] animate-pulse" />
      <div className="h-3 w-[35%] rounded-md bg-[#222228] animate-pulse" />
    </div>

    {/* Amount + date */}
    <div className="flex shrink-0 flex-col items-end gap-2">
      <div className="h-3.5 w-20 rounded-md bg-[#222228] animate-pulse" />
      <div className="h-3 w-14 rounded-md bg-[#222228] animate-pulse" />
    </div>
  </div>
);

// ─── Empty State ──────────────────────────────────────────────────────────────

export const TransactionEmptyState: React.FC<{
  message?: string;
  className?: string;
}> = ({
  message = "No transactions yet",
  className,
}) => (
  <div
    className={cn(
      "flex flex-col items-center justify-center gap-4 py-16 px-6 text-center",
      className
    )}
    role="status"
    aria-live="polite"
  >
    {/* Inbox icon */}
    <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-surface border border-border">
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width="28"
        height="28"
        viewBox="0 0 24 24"
        fill="none"
        stroke="#6b6872"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <polyline points="22 12 16 12 14 15 10 15 8 12 2 12" />
        <path d="M5.45 5.11L2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z" />
      </svg>
    </div>

    <div className="flex flex-col gap-1">
      <p className="font-sans font-semibold text-text text-base">{message}</p>
      <p className="font-sans text-sm text-muted leading-relaxed max-w-xs">
        When you make or receive transfers, they'll appear here.
      </p>
    </div>
  </div>
);

export { TransactionItem };
