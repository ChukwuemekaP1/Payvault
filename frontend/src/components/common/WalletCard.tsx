import * as React from "react";
import { Eye, EyeOff, ArrowUpRight, ArrowDownLeft, Copy, Check } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { cn, formatNgn, formatAccountNumber, maskBalance } from "../../lib/utils";
import { createBalanceStream } from "../../lib/api";
import { queryClient } from "../../lib/queryClient";
import { BALANCE_QUERY_KEY } from "../../hooks/useBalance";
import type { WalletBalance } from "../../types";
import { Button } from "../ui/button";

// ─── Props ────────────────────────────────────────────────────────────────────

export interface WalletCardProps {
  /** Current wallet balance object — pass from useBalance query */
  balance: WalletBalance | undefined;
  /** Whether the balance data is still loading */
  isLoading?: boolean;
  /** Additional class names for the root element */
  className?: string;
  /** If true, the SSE balance stream is established inside this component */
  enableStream?: boolean;
}

// ─── Skeleton ─────────────────────────────────────────────────────────────────

const WalletCardSkeleton: React.FC = () => (
  <div
    className={cn(
      "relative w-full overflow-hidden rounded-3xl border border-border",
      "bg-gradient-card p-6 sm:p-8",
      "shadow-card",
      "min-h-[220px]",
    )}
    aria-hidden="true"
  >
    {/* Shimmer overlay */}
    <div className="absolute inset-0 bg-[linear-gradient(90deg,transparent_0%,rgba(255,255,255,0.03)_50%,transparent_100%)] bg-[length:200%_100%] animate-shimmer" />

    <div className="space-y-6">
      {/* Account label + number */}
      <div className="space-y-2">
        <div className="h-3 w-24 rounded-md bg-[#222228]" />
        <div className="h-5 w-36 rounded-md bg-[#222228]" />
      </div>

      {/* Balance */}
      <div className="space-y-1.5">
        <div className="h-3 w-20 rounded-md bg-[#222228]" />
        <div className="h-10 w-52 rounded-md bg-[#222228]" />
      </div>

      {/* Buttons row */}
      <div className="flex gap-3 pt-2">
        <div className="h-10 flex-1 rounded-xl bg-[#222228]" />
        <div className="h-10 flex-1 rounded-xl bg-[#222228]" />
      </div>
    </div>
  </div>
);

// ─── Copy Button ──────────────────────────────────────────────────────────────

const CopyButton: React.FC<{ value: string }> = ({ value }) => {
  const [copied, setCopied] = React.useState(false);

  const handleCopy = async (e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await navigator.clipboard.writeText(value.replace("-", ""));
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // clipboard API may be unavailable in some contexts
    }
  };

  return (
    <button
      type="button"
      onClick={handleCopy}
      aria-label={copied ? "Copied!" : "Copy account number"}
      title={copied ? "Copied!" : "Copy account number"}
      className={cn(
        "inline-flex items-center justify-center",
        "h-6 w-6 rounded-lg",
        "text-muted border border-transparent",
        "hover:text-text hover:bg-white/5 hover:border-border",
        "transition-all duration-150",
        "focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary/60",
        copied && "text-success border-success/30 bg-success/10",
      )}
    >
      {copied ? (
        <Check className="h-3 w-3" aria-hidden="true" />
      ) : (
        <Copy className="h-3 w-3" aria-hidden="true" />
      )}
    </button>
  );
};

// ─── Balance Display ──────────────────────────────────────────────────────────

interface BalanceAmountProps {
  kobo: number;
  hidden: boolean;
  isFlashing: boolean;
}

const BalanceAmount: React.FC<BalanceAmountProps> = ({ kobo, hidden, isFlashing }) => {
  const formatted = hidden ? maskBalance() : formatNgn(kobo);

  return (
    <span
      className={cn(
        "font-serif text-4xl sm:text-5xl leading-none text-text",
        "transition-all duration-300",
        isFlashing && "animate-flash rounded-lg px-1",
      )}
      aria-live="polite"
      aria-atomic="true"
    >
      {formatted}
    </span>
  );
};

// ─── Decorative glow blob ─────────────────────────────────────────────────────

const GlowBlob: React.FC = () => (
  <div
    aria-hidden="true"
    className={cn(
      "pointer-events-none absolute -right-12 -top-12",
      "h-56 w-56 rounded-full",
      "bg-primary/20 blur-3xl",
      "opacity-60",
    )}
  />
);

// ─── WalletCard ───────────────────────────────────────────────────────────────

const WalletCard: React.FC<WalletCardProps> = ({
  balance,
  isLoading = false,
  className,
  enableStream = true,
}) => {
  const navigate = useNavigate();

  // ── Local state ────────────────────────────────────────────────────────────
  const [balanceHidden, setBalanceHidden] = React.useState<boolean>(() => {
    // Persist the user's show/hide preference in sessionStorage
    return sessionStorage.getItem("payvault-balance-hidden") === "true";
  });

  // isFlashing is set to true briefly whenever the live balance changes via SSE
  const [isFlashing, setIsFlashing] = React.useState(false);

  // Keep a ref to the most recently displayed kobo value so we can detect changes
  const prevKoboRef = React.useRef<number | null>(null);

  // ── Balance flash effect ───────────────────────────────────────────────────
  const triggerFlash = React.useCallback(() => {
    setIsFlashing(true);
    const timer = setTimeout(() => setIsFlashing(false), 600);
    return () => clearTimeout(timer);
  }, []);

  // Detect external balance changes (from React Query cache updates)
  React.useEffect(() => {
    if (balance?.balance_kobo === undefined) return;
    if (
      prevKoboRef.current !== null &&
      prevKoboRef.current !== balance.balance_kobo
    ) {
      triggerFlash();
    }
    prevKoboRef.current = balance.balance_kobo;
  }, [balance?.balance_kobo, triggerFlash]);

  // ── SSE: subscribe to /wallet/balance-stream ───────────────────────────────
  React.useEffect(() => {
    if (!enableStream) return;

    const eventSource = createBalanceStream(
      (update) => {
        // Push the update directly into the React Query cache so that all
        // subscribers (useBalance, Dashboard, etc.) see the fresh value
        queryClient.setQueryData<WalletBalance>(BALANCE_QUERY_KEY, (prev) => {
          if (!prev) return update;
          // Only update if the value actually changed
          if (prev.balance_kobo === update.balance_kobo) return prev;
          triggerFlash();
          return update;
        });
      },
      (err) => {
        // SSE errors are non-fatal; the stream will auto-reconnect
        console.warn("[WalletCard] SSE error:", err);
      },
    );

    return () => {
      eventSource.close();
    };
  }, [enableStream, triggerFlash]);

  // ── Toggle balance visibility ──────────────────────────────────────────────
  const toggleVisibility = () => {
    setBalanceHidden((prev) => {
      const next = !prev;
      sessionStorage.setItem("payvault-balance-hidden", String(next));
      return next;
    });
  };

  // ── Render: loading skeleton ───────────────────────────────────────────────
  if (isLoading && !balance) {
    return <WalletCardSkeleton />;
  }

  const accountNumber = balance?.account_number ?? "";
  const balanceKobo = balance?.balance_kobo ?? 0;

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div
      className={cn(
        // Layout
        "relative w-full overflow-hidden rounded-3xl",
        // Border — subtle orange gradient border via box-shadow
        "border border-transparent",
        // The gradient border is simulated with a pseudo-element approach using
        // a background clip trick via inline style below
        className,
      )}
      style={{
        background: "linear-gradient(#1a1a1f, #1a1a1f) padding-box, linear-gradient(145deg, rgba(255,92,43,0.5) 0%, rgba(255,92,43,0.05) 40%, rgba(42,42,48,0.8) 100%) border-box",
      }}
    >
      {/* Ambient glow behind the card */}
      <GlowBlob />

      {/* Card inner content */}
      <div className="relative z-10 flex flex-col gap-6 p-6 sm:p-8">

        {/* ── Row 1: Account info + visibility toggle ── */}
        <div className="flex items-start justify-between gap-4">
          <div className="flex flex-col gap-1">
            <span className="font-sans text-xs font-medium uppercase tracking-widest text-muted select-none">
              PayVault Account
            </span>

            {accountNumber ? (
              <div className="flex items-center gap-2">
                <span className="font-mono text-sm font-semibold text-text tracking-wider">
                  {formatAccountNumber(accountNumber)}
                </span>
                <CopyButton value={accountNumber} />
              </div>
            ) : (
              <div className="h-5 w-32 animate-pulse rounded-md bg-[#222228]" />
            )}
          </div>

          {/* Visibility toggle */}
          <button
            type="button"
            onClick={toggleVisibility}
            aria-label={balanceHidden ? "Show balance" : "Hide balance"}
            title={balanceHidden ? "Show balance" : "Hide balance"}
            className={cn(
              "flex h-9 w-9 shrink-0 items-center justify-center rounded-xl",
              "border border-border text-muted",
              "hover:bg-white/5 hover:text-text hover:border-[#3a3a42]",
              "active:scale-95",
              "transition-all duration-150",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60 focus-visible:ring-offset-2 focus-visible:ring-offset-surface",
            )}
          >
            {balanceHidden ? (
              <Eye className="h-4 w-4" aria-hidden="true" />
            ) : (
              <EyeOff className="h-4 w-4" aria-hidden="true" />
            )}
          </button>
        </div>

        {/* ── Row 2: Balance ── */}
        <div className="flex flex-col gap-1.5">
          <span className="font-sans text-xs font-medium uppercase tracking-widest text-muted select-none">
            Available Balance
          </span>

          <div className="flex items-end gap-3">
            <BalanceAmount
              kobo={balanceKobo}
              hidden={balanceHidden}
              isFlashing={isFlashing}
            />

            {/* Live indicator dot — pulses green when SSE stream is active */}
            {enableStream && (
              <span
                className="mb-1.5 flex items-center gap-1.5 pb-0.5"
                title="Live balance updates active"
              >
                <span className="relative flex h-2 w-2">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-success opacity-60" />
                  <span className="relative inline-flex h-2 w-2 rounded-full bg-success" />
                </span>
                <span className="font-sans text-[10px] font-medium text-success/70 tracking-wide select-none">
                  LIVE
                </span>
              </span>
            )}
          </div>
        </div>

        {/* ── Row 3: Action buttons ── */}
        <div className="flex gap-3 pt-1">
          {/* Fund Wallet (outline orange) */}
          <Button
            variant="outline"
            size="md"
            fullWidth
            leftIcon={<ArrowDownLeft className="h-4 w-4" aria-hidden="true" />}
            onClick={() => {
              // Fund wallet would open a payment modal/link in a real app.
              // For portfolio: navigate to a placeholder or show a toast.
              // We navigate to /transactions to show recent credits.
              navigate("/transactions");
            }}
          >
            Fund Wallet
          </Button>

          {/* Send Money (solid orange) */}
          <Button
            variant="default"
            size="md"
            fullWidth
            leftIcon={<ArrowUpRight className="h-4 w-4" aria-hidden="true" />}
            onClick={() => navigate("/transfer")}
          >
            Send Money
          </Button>
        </div>
      </div>

      {/* Bottom-right decorative circles (purely cosmetic) */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -bottom-8 -right-8 h-32 w-32 rounded-full border border-primary/10"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -bottom-4 -right-4 h-20 w-20 rounded-full border border-primary/8"
      />
    </div>
  );
};

WalletCard.displayName = "WalletCard";

export { WalletCard, WalletCardSkeleton };
