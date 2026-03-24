import * as React from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  Printer,
  CheckCircle2,
  XCircle,
  Clock,
  Copy,
  Check,
  Receipt,
  ArrowUpRight,
  ArrowDownLeft,
  RefreshCw,
} from "lucide-react";
import { cn, formatNgn, formatDate, formatAccountNumber } from "../lib/utils";
import { useTransaction } from "../hooks/useTransactions";
import { useAuthStore } from "../store/authStore";
import { NavBar } from "../components/layout/NavBar";
import { Badge, statusVariant, statusLabel } from "../components/ui/badge";
import { Button } from "../components/ui/button";
import { Skeleton } from "../components/ui/skeleton";

// ─── Copy Button ──────────────────────────────────────────────────────────────

const CopyButton: React.FC<{ value: string; label?: string }> = ({
  value,
  label = "Copy",
}) => {
  const [copied, setCopied] = React.useState(false);

  const handleCopy = async (e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* clipboard unavailable */
    }
  };

  return (
    <button
      type="button"
      onClick={handleCopy}
      aria-label={copied ? "Copied!" : label}
      title={copied ? "Copied!" : label}
      className={cn(
        "inline-flex items-center justify-center gap-1.5 rounded-lg border px-2 py-1",
        "font-sans text-[11px] font-medium",
        "transition-all duration-150",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60",
        "print:hidden",
        copied
          ? "border-success/40 bg-success/10 text-success"
          : "border-border bg-surface text-muted hover:text-text hover:border-[#3a3a42]"
      )}
    >
      {copied ? (
        <Check className="h-3 w-3" aria-hidden="true" />
      ) : (
        <Copy className="h-3 w-3" aria-hidden="true" />
      )}
      {copied ? "Copied!" : label}
    </button>
  );
};

// ─── Status Icon ──────────────────────────────────────────────────────────────

const StatusIcon: React.FC<{ status: string; size?: "sm" | "lg" }> = ({
  status,
  size = "lg",
}) => {
  const dim = size === "lg" ? "h-16 w-16" : "h-10 w-10";
  const iconDim = size === "lg" ? "h-7 w-7" : "h-5 w-5";

  if (status === "completed" || status === "success") {
    return (
      <div
        className={cn(
          dim,
          "flex items-center justify-center rounded-full",
          "bg-success/15 border-2 border-success/40",
          "shadow-[0_0_32px_rgba(0,201,122,0.2)]"
        )}
      >
        <CheckCircle2 className={cn(iconDim, "text-success")} aria-hidden="true" />
      </div>
    );
  }

  if (status === "failed" || status === "error") {
    return (
      <div
        className={cn(
          dim,
          "flex items-center justify-center rounded-full",
          "bg-error/15 border-2 border-error/40",
          "shadow-[0_0_32px_rgba(255,59,59,0.15)]"
        )}
      >
        <XCircle className={cn(iconDim, "text-error")} aria-hidden="true" />
      </div>
    );
  }

  // Pending / processing
  return (
    <div
      className={cn(
        dim,
        "flex items-center justify-center rounded-full",
        "bg-warning/15 border-2 border-warning/40",
        "shadow-[0_0_32px_rgba(255,184,0,0.15)]"
      )}
    >
      <Clock className={cn(iconDim, "text-warning")} aria-hidden="true" />
    </div>
  );
};

// ─── Direction Icon ───────────────────────────────────────────────────────────

type TxDirection = "credit" | "debit" | "neutral";

function getDirection(
  type: string,
  senderId: string | null,
  receiverId: string | null,
  currentUserId: string | undefined
): TxDirection {
  if (type === "credit") return "credit";
  if (type === "transfer") {
    if (currentUserId && receiverId === currentUserId) return "credit";
    return "debit";
  }
  if (currentUserId) {
    if (receiverId === currentUserId) return "credit";
    if (senderId === currentUserId) return "debit";
  }
  return "neutral";
}

const DirectionBadge: React.FC<{ direction: TxDirection }> = ({ direction }) => {
  if (direction === "credit") {
    return (
      <div className="flex items-center gap-1.5 rounded-full border border-success/30 bg-success/10 px-3 py-1">
        <ArrowDownLeft className="h-3.5 w-3.5 text-success" aria-hidden="true" />
        <span className="font-sans text-xs font-semibold text-success">Received</span>
      </div>
    );
  }
  if (direction === "debit") {
    return (
      <div className="flex items-center gap-1.5 rounded-full border border-primary/30 bg-primary/10 px-3 py-1">
        <ArrowUpRight className="h-3.5 w-3.5 text-primary" aria-hidden="true" />
        <span className="font-sans text-xs font-semibold text-primary">Sent</span>
      </div>
    );
  }
  return (
    <div className="flex items-center gap-1.5 rounded-full border border-border bg-surface px-3 py-1">
      <RefreshCw className="h-3.5 w-3.5 text-muted" aria-hidden="true" />
      <span className="font-sans text-xs font-semibold text-muted">Transfer</span>
    </div>
  );
};

// ─── Receipt Row ──────────────────────────────────────────────────────────────

interface ReceiptRowProps {
  label: string;
  value: React.ReactNode;
  mono?: boolean;
  accent?: "default" | "success" | "error" | "warning" | "primary" | "muted";
  copyValue?: string;
  last?: boolean;
}

const ReceiptRow: React.FC<ReceiptRowProps> = ({
  label,
  value,
  mono = false,
  accent = "default",
  copyValue,
  last = false,
}) => {
  const accentClass: Record<NonNullable<ReceiptRowProps["accent"]>, string> = {
    default: "text-text",
    success: "text-success",
    error: "text-error",
    warning: "text-warning",
    primary: "text-primary font-semibold",
    muted: "text-muted",
  };

  return (
    <div
      className={cn(
        "flex items-start justify-between gap-4 py-3.5",
        !last && "border-b border-border/60"
      )}
    >
      <span className="font-sans text-sm text-muted shrink-0 pt-0.5">{label}</span>

      <div className="flex items-center gap-2 text-right min-w-0">
        <span
          className={cn(
            "font-sans text-sm break-all",
            mono && "font-mono",
            accentClass[accent]
          )}
        >
          {value}
        </span>
        {copyValue && <CopyButton value={copyValue} label="Copy" />}
      </div>
    </div>
  );
};

// ─── Loading Skeleton ─────────────────────────────────────────────────────────

const TransactionDetailSkeleton: React.FC = () => (
  <div className="flex flex-col items-center gap-6 animate-pulse" aria-hidden="true">
    {/* Status icon */}
    <div className="h-16 w-16 rounded-full bg-[#222228]" />

    {/* Title */}
    <div className="flex flex-col items-center gap-2 w-full">
      <div className="h-7 w-48 rounded-lg bg-[#222228]" />
      <div className="h-4 w-32 rounded-md bg-[#222228]" />
    </div>

    {/* Amount */}
    <div className="h-14 w-56 rounded-2xl bg-[#222228]" />

    {/* Rows */}
    <div className="w-full space-y-0">
      {Array.from({ length: 6 }).map((_, i) => (
        <div
          key={i}
          className="flex items-center justify-between border-b border-border/60 py-3.5"
        >
          <div className="h-4 w-24 rounded-md bg-[#222228]" />
          <div className="h-4 w-36 rounded-md bg-[#222228]" />
        </div>
      ))}
    </div>

    {/* Button */}
    <div className="h-11 w-full rounded-xl bg-[#222228]" />
  </div>
);

// ─── Print styles injected into head ─────────────────────────────────────────

const PRINT_STYLE = `
  @media print {
    body * { visibility: hidden !important; }
    #transaction-receipt,
    #transaction-receipt * { visibility: visible !important; }
    #transaction-receipt {
      position: fixed !important;
      top: 0 !important;
      left: 0 !important;
      width: 100% !important;
      padding: 2rem !important;
      background: white !important;
      color: black !important;
    }
    .print\\:hidden { display: none !important; }
    nav, header, footer { display: none !important; }
  }
`;

// ─── TransactionDetail Page ───────────────────────────────────────────────────

const TransactionDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuthStore();

  const { data: tx, isLoading, isError, error } = useTransaction(id);

  // Inject print styles on mount
  React.useEffect(() => {
    const style = document.createElement("style");
    style.id = "payvault-print-styles";
    style.textContent = PRINT_STYLE;
    document.head.appendChild(style);
    return () => {
      const existing = document.getElementById("payvault-print-styles");
      if (existing) document.head.removeChild(existing);
    };
  }, []);

  const handlePrint = () => {
    window.print();
  };

  // ── Derived values (only when tx is loaded) ───────────────────────────────
  const direction = tx
    ? getDirection(tx.type, tx.sender_id, tx.receiver_id, user?.user_id)
    : "neutral";

  const amountAccent: ReceiptRowProps["accent"] =
    direction === "credit" ? "success" : direction === "debit" ? "primary" : "default";

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-background text-text font-sans antialiased">
      {/* Print styles — hidden in screen view */}
      <div className="print:hidden">
        <NavBar />
      </div>

      {/* Ambient background glow */}
      <div
        aria-hidden="true"
        className="pointer-events-none fixed inset-0 overflow-hidden print:hidden"
      >
        <div className="absolute top-0 left-1/2 h-[400px] w-[400px] -translate-x-1/2 -translate-y-1/4 rounded-full bg-primary/5 blur-[80px]" />
      </div>

      <main className="relative z-10 mx-auto max-w-lg px-4 pb-16 pt-8 sm:px-6">

        {/* ── Back button + Print button ── */}
        <div className="mb-6 flex items-center justify-between print:hidden">
          <button
            type="button"
            onClick={() => navigate("/transactions")}
            className={cn(
              "inline-flex items-center gap-1.5",
              "font-sans text-sm font-medium text-muted",
              "hover:text-text transition-colors duration-150",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60 rounded-lg p-1 -m-1",
              "group"
            )}
          >
            <ArrowLeft
              className="h-4 w-4 transition-transform duration-150 group-hover:-translate-x-0.5"
              aria-hidden="true"
            />
            Back to Transactions
          </button>

          <Button
            variant="secondary"
            size="sm"
            leftIcon={<Printer className="h-4 w-4" aria-hidden="true" />}
            onClick={handlePrint}
            disabled={isLoading || isError}
            aria-label="Print receipt"
          >
            Download Receipt
          </Button>
        </div>

        {/* ── Page title ── */}
        <div className="mb-6 flex items-center gap-3">
          <div
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-primary/10 border border-primary/20"
            aria-hidden="true"
          >
            <Receipt className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h1 className="font-serif text-2xl sm:text-3xl text-text leading-tight">
              Transaction Receipt
            </h1>
            <p className="font-sans text-sm text-muted">
              Full details for this transaction
            </p>
          </div>
        </div>

        {/* ── Card ── */}
        <div
          id="transaction-receipt"
          className={cn(
            "rounded-2xl border border-border bg-surface",
            "shadow-[0_4px_40px_rgba(0,0,0,0.5)]",
            "overflow-hidden"
          )}
        >
          {/* ── Loading state ── */}
          {isLoading && (
            <div className="p-6 sm:p-8">
              <TransactionDetailSkeleton />
            </div>
          )}

          {/* ── Error state ── */}
          {isError && !isLoading && (
            <div className="flex flex-col items-center gap-5 px-6 py-16 text-center">
              <div
                className={cn(
                  "flex h-16 w-16 items-center justify-center rounded-full",
                  "bg-error/10 border-2 border-error/30"
                )}
              >
                <XCircle className="h-7 w-7 text-error" aria-hidden="true" />
              </div>
              <div className="space-y-2">
                <p className="font-sans text-base font-semibold text-text">
                  Transaction not found
                </p>
                <p className="font-sans text-sm text-muted leading-relaxed max-w-xs">
                  {error?.message ??
                    "This transaction could not be loaded. It may have been removed or the ID is invalid."}
                </p>
              </div>
              <div className="flex flex-col gap-2.5 w-full max-w-xs">
                <Button
                  variant="default"
                  size="md"
                  fullWidth
                  onClick={() => navigate("/transactions")}
                  leftIcon={<ArrowLeft className="h-4 w-4" aria-hidden="true" />}
                >
                  Back to Transactions
                </Button>
              </div>
            </div>
          )}

          {/* ── Content: transaction loaded ── */}
          {tx && !isLoading && (
            <>
              {/* ── Header section: status + amount ── */}
              <div
                className={cn(
                  "flex flex-col items-center gap-5 px-6 py-8 sm:px-8",
                  "border-b border-border",
                  "text-center",
                  // Subtle tinted background per status
                  tx.status === "completed" || tx.status === "success"
                    ? "bg-success/[0.03]"
                    : tx.status === "failed"
                    ? "bg-error/[0.03]"
                    : "bg-warning/[0.03]"
                )}
              >
                {/* Status icon */}
                <StatusIcon status={tx.status} size="lg" />

                {/* Status heading + direction */}
                <div className="flex flex-col items-center gap-2">
                  <h2 className="font-serif text-2xl text-text leading-tight">
                    {tx.status === "completed" || tx.status === "success"
                      ? "Transfer Successful"
                      : tx.status === "failed"
                      ? "Transfer Failed"
                      : "Transfer Pending"}
                  </h2>

                  <div className="flex items-center gap-2">
                    <DirectionBadge direction={direction} />
                    <Badge
                      variant={statusVariant(tx.status)}
                      size="sm"
                      dot
                    >
                      {statusLabel(tx.status)}
                    </Badge>
                  </div>
                </div>

                {/* Amount — large display */}
                <div
                  className={cn(
                    "flex flex-col items-center gap-1 rounded-2xl px-8 py-4 w-full max-w-xs",
                    direction === "credit"
                      ? "bg-success/8 border border-success/20"
                      : direction === "debit"
                      ? "bg-primary/8 border border-primary/20"
                      : "bg-surface border border-border"
                  )}
                >
                  <span className="font-sans text-[10px] font-medium uppercase tracking-widest text-muted/70">
                    Amount
                  </span>
                  <span
                    className={cn(
                      "font-serif text-4xl leading-none",
                      direction === "credit"
                        ? "text-success"
                        : direction === "debit"
                        ? "text-primary"
                        : "text-text"
                    )}
                  >
                    {direction === "credit" ? "+" : direction === "debit" ? "−" : ""}
                    {formatNgn(tx.amount_kobo)}
                  </span>
                </div>
              </div>

              {/* ── Receipt detail rows ── */}
              <div className="flex flex-col px-6 sm:px-8">
                {/* Reference */}
                <ReceiptRow
                  label="Reference"
                  value={
                    <span className="font-mono text-xs">{tx.reference}</span>
                  }
                  copyValue={tx.reference}
                />

                {/* Transaction ID */}
                <ReceiptRow
                  label="Transaction ID"
                  value={
                    <span className="font-mono text-xs">{tx.id}</span>
                  }
                  copyValue={tx.id}
                />

                {/* Amount (kobo / naira breakdown) */}
                <ReceiptRow
                  label="Amount"
                  value={formatNgn(tx.amount_kobo)}
                  mono
                  accent={amountAccent}
                />

                {/* Type */}
                <ReceiptRow
                  label="Type"
                  value={
                    <Badge
                      variant={statusVariant(tx.type)}
                      size="sm"
                    >
                      {statusLabel(tx.type)}
                    </Badge>
                  }
                />

                {/* Status */}
                <ReceiptRow
                  label="Status"
                  value={
                    <Badge
                      variant={statusVariant(tx.status)}
                      size="sm"
                      dot
                    >
                      {statusLabel(tx.status)}
                    </Badge>
                  }
                />

                {/* Sender */}
                {tx.sender_id && (
                  <ReceiptRow
                    label="From"
                    value={
                      tx.sender_id.length >= 10
                        ? formatAccountNumber(tx.sender_id.slice(0, 10))
                        : tx.sender_id
                    }
                    mono
                    copyValue={tx.sender_id}
                  />
                )}

                {/* Receiver */}
                {tx.receiver_id && (
                  <ReceiptRow
                    label="To"
                    value={
                      tx.receiver_id.length >= 10
                        ? formatAccountNumber(tx.receiver_id.slice(0, 10))
                        : tx.receiver_id
                    }
                    mono
                    copyValue={tx.receiver_id}
                  />
                )}

                {/* Date & Time */}
                <ReceiptRow
                  label="Date & Time"
                  value={formatDate(tx.created_at)}
                  last
                />
              </div>

              {/* ── Footer: PayVault branding for print ── */}
              <div
                className={cn(
                  "flex items-center justify-between gap-4",
                  "border-t border-border bg-surface/50",
                  "px-6 py-4 sm:px-8"
                )}
              >
                {/* Logo mark */}
                <div className="flex items-center gap-2 select-none">
                  <div className="flex h-6 w-6 items-center justify-center rounded-md bg-primary shadow-glow-sm">
                    <span className="font-serif font-bold text-white text-[10px] leading-none">
                      PV
                    </span>
                  </div>
                  <span className="font-sans text-xs font-semibold text-muted">
                    Pay<span className="text-primary">Vault</span>
                  </span>
                </div>

                {/* Timestamp */}
                <span className="font-sans text-xs text-muted/50">
                  Generated {formatDate(new Date().toISOString())}
                </span>
              </div>
            </>
          )}
        </div>

        {/* ── Action buttons ── */}
        {tx && !isLoading && (
          <div className="mt-5 flex flex-col gap-3 print:hidden">
            <Button
              variant="default"
              size="md"
              fullWidth
              leftIcon={<Printer className="h-4 w-4" aria-hidden="true" />}
              onClick={handlePrint}
            >
              Download / Print Receipt
            </Button>

            <div className="grid grid-cols-2 gap-3">
              <Button
                variant="secondary"
                size="md"
                fullWidth
                leftIcon={<ArrowLeft className="h-4 w-4" aria-hidden="true" />}
                onClick={() => navigate("/transactions")}
              >
                Transactions
              </Button>
              <Button
                variant="outline"
                size="md"
                fullWidth
                leftIcon={<ArrowUpRight className="h-4 w-4" aria-hidden="true" />}
                onClick={() => navigate("/transfer")}
              >
                Send Money
              </Button>
            </div>
          </div>
        )}

        {/* ── Skeleton loading action buttons ── */}
        {isLoading && (
          <div className="mt-5 flex flex-col gap-3 print:hidden">
            <Skeleton height={44} className="w-full rounded-xl" />
            <div className="grid grid-cols-2 gap-3">
              <Skeleton height={44} className="w-full rounded-xl" />
              <Skeleton height={44} className="w-full rounded-xl" />
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

export default TransactionDetail;
