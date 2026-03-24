import * as React from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowRight,
  ArrowLeft,
  CheckCircle2,
  XCircle,
  User,
  Banknote,
  FileText,
  Sparkles,
  RefreshCw,
  Copy,
  Check,
} from "lucide-react";
import confetti from "canvas-confetti";
import { toast } from "sonner";
import { cn, formatNgn, formatAccountNumber, nairaToKobo, truncateReference } from "../lib/utils";
import { transferFunds, getApiErrorMessage, lookupWalletByAccount } from "../lib/api";
import { useBalance } from "../hooks/useBalance";
import { queryClient } from "../lib/queryClient";
import { BALANCE_QUERY_KEY } from "../hooks/useBalance";
import { NavBar } from "../components/layout/NavBar";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Card } from "../components/ui/card";
import type { TransferResponse, WalletBalance } from "../types";

// ─── Types ────────────────────────────────────────────────────────────────────

type WizardStep = 1 | 2 | 3 | 4;

interface WizardState {
  step: WizardStep;
  // Step 1
  recipientAccount: string;
  // Step 2
  amountNaira: string;
  // Step 3
  description: string;
  // Step 4
  result: TransferResponse | null;
  error: string | null;
  isSubmitting: boolean;
}

const INITIAL_STATE: WizardState = {
  step: 1,
  recipientAccount: "",
  amountNaira: "",
  description: "",
  result: null,
  error: null,
  isSubmitting: false,
};

// ─── Stepper ──────────────────────────────────────────────────────────────────

interface StepperProps {
  currentStep: WizardStep;
}

const STEPS = [
  { number: 1, label: "Recipient" },
  { number: 2, label: "Amount" },
  { number: 3, label: "Review" },
  { number: 4, label: "Done" },
] as const;

const Stepper: React.FC<StepperProps> = ({ currentStep }) => (
  <nav aria-label="Transfer progress" className="w-full">
    <ol className="flex items-center gap-0 w-full">
      {STEPS.map((step, index) => {
        const isCompleted = currentStep > step.number;
        const isActive = currentStep === step.number;
        const isLast = index === STEPS.length - 1;

        return (
          <React.Fragment key={step.number}>
            <li className="flex flex-col items-center gap-1.5 shrink-0">
              {/* Circle */}
              <div
                className={cn(
                  "flex h-8 w-8 items-center justify-center rounded-full border-2 text-xs font-semibold font-sans",
                  "transition-all duration-300 ease-out",
                  isCompleted && "bg-success border-success text-white",
                  isActive && "bg-primary border-primary text-white shadow-[0_0_12px_rgba(255,92,43,0.4)]",
                  !isCompleted && !isActive && "bg-surface border-border text-muted"
                )}
                aria-current={isActive ? "step" : undefined}
              >
                {isCompleted ? (
                  <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
                ) : (
                  <span>{step.number}</span>
                )}
              </div>
              {/* Label */}
              <span
                className={cn(
                  "font-sans text-[10px] font-medium uppercase tracking-wider leading-none whitespace-nowrap",
                  isActive ? "text-primary" : isCompleted ? "text-success" : "text-muted"
                )}
              >
                {step.label}
              </span>
            </li>

            {/* Connector line */}
            {!isLast && (
              <div
                className={cn(
                  "flex-1 h-0.5 mt-[-0.875rem] mx-1 rounded-full transition-all duration-300",
                  currentStep > step.number ? "bg-success" : "bg-border"
                )}
                aria-hidden="true"
              />
            )}
          </React.Fragment>
        );
      })}
    </ol>
  </nav>
);

// ─── Step 1: Recipient ────────────────────────────────────────────────────────

interface Step1Props {
  recipientAccount: string;
  onChange: (value: string) => void;
  onNext: () => void;
}

const Step1Recipient: React.FC<Step1Props> = ({
  recipientAccount,
  onChange,
  onNext,
}) => {
  const [touched, setTouched] = React.useState(false);
  const [accountHolder, setAccountHolder] = React.useState<string | null>(null);
  const [loadingHolder, setLoadingHolder] = React.useState(false);
  const inputRef = React.useRef<HTMLInputElement>(null);

  // Fetch account holder name when account number is complete
  React.useEffect(() => {
    if (recipientAccount.length === 10) {
      setLoadingHolder(true);
      lookupWalletByAccount(recipientAccount)
        .then((data) => setAccountHolder(data.holder_name))
        .catch(() => setAccountHolder(null))
        .finally(() => setLoadingHolder(false));
    } else {
      setAccountHolder(null);
    }
  }, [recipientAccount]);

  React.useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const isValid = recipientAccount.length === 10;
  const showConfirmation = isValid;

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value.replace(/\D/g, "").slice(0, 10);
    onChange(raw);
  };

  const handleBlur = () => setTouched(true);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && isValid) {
      onNext();
    }
  };

  const showError = touched && recipientAccount.length > 0 && recipientAccount.length < 10;

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="space-y-1.5">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-primary/10 border border-primary/20">
            <User className="h-5 w-5 text-primary" aria-hidden="true" />
          </div>
          <div>
            <h2 className="font-sans font-semibold text-text text-lg leading-tight">
              Who are you sending to?
            </h2>
            <p className="font-sans text-sm text-muted">
              Enter the recipient's 10-digit account number
            </p>
          </div>
        </div>
      </div>

      {/* Input */}
      <div className="space-y-1.5">
        <Label htmlFor="recipient" required>
          Recipient Account Number
        </Label>
        <Input
          id="recipient"
          ref={inputRef}
          type="text"
          inputMode="numeric"
          pattern="[0-9]*"
          placeholder="0123456789"
          value={recipientAccount}
          onChange={handleChange}
          onBlur={handleBlur}
          onKeyDown={handleKeyDown}
          maxLength={10}
          error={showError}
          aria-describedby={showError ? "account-error" : isValid ? "account-confirm" : undefined}
          className="font-mono text-base tracking-widest text-center h-14 text-lg"
        />

        {/* Character counter */}
        <div className="flex items-center justify-between">
          {showError && (
            <p
              id="account-error"
              role="alert"
              className="font-sans text-xs text-error"
            >
              Account number must be exactly 10 digits
            </p>
          )}
          {!showError && (
            <span className="font-sans text-xs text-muted">
              {recipientAccount.length === 0
                ? "Enter 10 digits"
                : `${recipientAccount.length}/10 digits`}
            </span>
          )}

          {/* Progress indicator */}
          <div className="flex gap-0.5" aria-hidden="true">
            {Array.from({ length: 10 }).map((_, i) => (
              <div
                key={i}
                className={cn(
                  "h-0.5 w-2 rounded-full transition-all duration-100",
                  i < recipientAccount.length ? "bg-primary" : "bg-border"
                )}
              />
            ))}
          </div>
        </div>
      </div>

      {/* Confirmation card — shown when 10 digits are entered */}
      {showConfirmation && (
        <div
          id="account-confirm"
          className={cn(
            "flex items-center gap-4 rounded-2xl border border-success/30 bg-success/5 px-5 py-4",
            "animate-fade-in"
          )}
          role="status"
          aria-live="polite"
        >
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-success/15 border border-success/30">
            <CheckCircle2 className="h-5 w-5 text-success" aria-hidden="true" />
          </div>
          <div className="flex flex-col gap-0.5 min-w-0 flex-1">
            <span className="font-sans text-xs font-medium uppercase tracking-wider text-muted/70">
              Sending to
            </span>
            <span className="font-mono text-base font-semibold text-text tracking-wider">
              {formatAccountNumber(recipientAccount)}
            </span>
            {loadingHolder ? (
              <span className="font-sans text-xs text-muted animate-pulse">
                Verifying account...
              </span>
            ) : accountHolder ? (
              <span className="font-sans text-xs text-success font-medium">
                ✓ {accountHolder}
              </span>
            ) : (
              <span className="font-sans text-xs text-error">
                Account not found
              </span>
            )}
          </div>
        </div>
      )}

      {/* Next button */}
      <Button
        variant="default"
        size="lg"
        fullWidth
        disabled={!isValid}
        rightIcon={<ArrowRight className="h-4 w-4" aria-hidden="true" />}
        onClick={onNext}
      >
        Continue
      </Button>
    </div>
  );
};

// ─── Step 2: Amount ───────────────────────────────────────────────────────────

interface Step2Props {
  amountNaira: string;
  recipientAccount: string;
  onChange: (value: string) => void;
  onNext: () => void;
  onBack: () => void;
}

const Step2Amount: React.FC<Step2Props> = ({
  amountNaira,
  recipientAccount,
  onChange,
  onNext,
  onBack,
}) => {
  const { data: balance } = useBalance();
  const inputRef = React.useRef<HTMLInputElement>(null);

  React.useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const balanceKobo = balance?.balance_kobo ?? 0;
  const amountNumber = parseFloat(amountNaira) || 0;
  const amountKobo = nairaToKobo(amountNumber);

  const insufficientFunds = amountKobo > 0 && amountKobo > balanceKobo;
  const belowMinimum = amountKobo > 0 && amountKobo < 100;
  const isValid =
    amountKobo >= 100 &&
    !insufficientFunds &&
    amountNaira !== "" &&
    !isNaN(amountNumber);

  const newBalanceKobo = balanceKobo - amountKobo;

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value;
    // Allow empty, digits, and a single decimal point with up to 2 decimal places
    if (raw === "" || /^\d+\.?\d{0,2}$/.test(raw)) {
      onChange(raw);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && isValid) {
      onNext();
    }
  };

  const handleQuickAmount = (naira: number) => {
    if (nairaToKobo(naira) <= balanceKobo) {
      onChange(naira.toString());
    }
  };

  const quickAmounts = [1000, 5000, 10000, 20000];

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="space-y-1.5">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-primary/10 border border-primary/20">
            <Banknote className="h-5 w-5 text-primary" aria-hidden="true" />
          </div>
          <div>
            <h2 className="font-sans font-semibold text-text text-lg leading-tight">
              How much are you sending?
            </h2>
            <p className="font-sans text-sm text-muted">
              To:{" "}
              <span className="font-mono text-text">
                {formatAccountNumber(recipientAccount)}
              </span>
            </p>
          </div>
        </div>
      </div>

      {/* Amount input */}
      <div className="space-y-2">
        <Label htmlFor="amount" required>
          Amount (₦)
        </Label>

        {/* Large ₦ prefix input */}
        <div className="relative">
          <div
            className={cn(
              "flex items-center rounded-xl border bg-surface transition-all duration-150",
              insufficientFunds || belowMinimum
                ? "border-error focus-within:ring-error/20"
                : "border-border focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/20",
              "h-16"
            )}
          >
            <span className="pl-4 pr-2 font-serif text-2xl font-medium text-muted select-none shrink-0">
              ₦
            </span>
            <input
              id="amount"
              ref={inputRef}
              type="text"
              inputMode="decimal"
              placeholder="0.00"
              value={amountNaira}
              onChange={handleChange}
              onKeyDown={handleKeyDown}
              aria-describedby="amount-balance amount-validation"
              className={cn(
                "flex-1 bg-transparent py-2 pr-4",
                "font-mono text-2xl font-semibold text-text",
                "outline-none placeholder:text-muted/40",
                "[-moz-appearance:textfield]",
                "[&::-webkit-outer-spin-button]:appearance-none",
                "[&::-webkit-inner-spin-button]:appearance-none"
              )}
            />
          </div>
        </div>

        {/* Validation messages */}
        <div id="amount-validation" aria-live="polite" aria-atomic="true">
          {belowMinimum && (
            <p className="font-sans text-xs text-error flex items-center gap-1.5 animate-fade-in">
              <XCircle className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
              Minimum transfer amount is ₦ 1.00
            </p>
          )}
          {insufficientFunds && !belowMinimum && (
            <p className="font-sans text-xs text-error flex items-center gap-1.5 animate-fade-in">
              <XCircle className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
              Insufficient funds. Your balance is {formatNgn(balanceKobo)}
            </p>
          )}
        </div>

        {/* Balance display */}
        <div
          id="amount-balance"
          className={cn(
            "flex items-center justify-between rounded-xl border px-4 py-3",
            "transition-all duration-150",
            insufficientFunds
              ? "border-error/30 bg-error/5"
              : "border-border bg-surface/50"
          )}
        >
          <span className="font-sans text-sm text-muted">Available balance</span>
          <span
            className={cn(
              "font-mono text-sm font-semibold tabular-nums",
              insufficientFunds ? "text-error" : "text-success"
            )}
          >
            {formatNgn(balanceKobo)}
          </span>
        </div>

        {/* After-transfer balance preview */}
        {isValid && (
          <div
            className={cn(
              "flex items-center justify-between rounded-xl border border-border/60 px-4 py-3",
              "bg-surface/30 animate-fade-in"
            )}
          >
            <span className="font-sans text-xs text-muted">Balance after transfer</span>
            <span className="font-mono text-sm font-medium text-text tabular-nums">
              {formatNgn(newBalanceKobo)}
            </span>
          </div>
        )}
      </div>

      {/* Quick amount buttons */}
      <div className="space-y-2">
        <span className="font-sans text-xs font-medium text-muted uppercase tracking-wider">
          Quick amounts
        </span>
        <div className="grid grid-cols-4 gap-2">
          {quickAmounts.map((amount) => {
            const exceedsBalance = nairaToKobo(amount) > balanceKobo;
            return (
              <button
                key={amount}
                type="button"
                disabled={exceedsBalance}
                onClick={() => handleQuickAmount(amount)}
                className={cn(
                  "flex items-center justify-center h-9 rounded-xl border",
                  "font-sans text-xs font-medium",
                  "transition-all duration-150 ease-out",
                  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60",
                  exceedsBalance
                    ? "border-border/40 text-muted/30 cursor-not-allowed"
                    : amountNaira === amount.toString()
                    ? "border-primary bg-primary/10 text-primary"
                    : "border-border bg-surface text-muted hover:border-primary/40 hover:text-text hover:bg-primary/5"
                )}
              >
                ₦{amount >= 1000 ? `${amount / 1000}k` : amount}
              </button>
            );
          })}
        </div>
      </div>

      {/* Navigation */}
      <div className="flex gap-3 pt-1">
        <Button
          variant="secondary"
          size="lg"
          onClick={onBack}
          leftIcon={<ArrowLeft className="h-4 w-4" aria-hidden="true" />}
          className="min-w-[120px]"
        >
          Back
        </Button>
        <Button
          variant="default"
          size="lg"
          fullWidth
          disabled={!isValid}
          rightIcon={<ArrowRight className="h-4 w-4" aria-hidden="true" />}
          onClick={onNext}
        >
          Continue
        </Button>
      </div>
    </div>
  );
};

// ─── Step 3: Review ───────────────────────────────────────────────────────────

interface Step3Props {
  recipientAccount: string;
  amountNaira: string;
  description: string;
  onDescriptionChange: (value: string) => void;
  onConfirm: () => void;
  onBack: () => void;
  isSubmitting: boolean;
}

const Step3Review: React.FC<Step3Props> = ({
  recipientAccount,
  amountNaira,
  description,
  onDescriptionChange,
  onConfirm,
  onBack,
  isSubmitting,
}) => {
  const { data: balance } = useBalance();
  const balanceKobo = balance?.balance_kobo ?? 0;
  const amountNumber = parseFloat(amountNaira) || 0;
  const amountKobo = nairaToKobo(amountNumber);
  const newBalanceKobo = balanceKobo - amountKobo;

  const rows = [
    {
      label: "Sending to",
      value: formatAccountNumber(recipientAccount),
      mono: true,
    },
    {
      label: "Amount",
      value: formatNgn(amountKobo),
      mono: true,
      accent: "primary" as const,
    },
    {
      label: "Balance after",
      value: formatNgn(newBalanceKobo),
      mono: true,
    },
    {
      label: "Fee",
      value: "₦ 0.00",
      mono: true,
      accent: "success" as const,
    },
  ];

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="space-y-1.5">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-primary/10 border border-primary/20">
            <FileText className="h-5 w-5 text-primary" aria-hidden="true" />
          </div>
          <div>
            <h2 className="font-sans font-semibold text-text text-lg leading-tight">
              Review your transfer
            </h2>
            <p className="font-sans text-sm text-muted">
              Double-check the details before confirming
            </p>
          </div>
        </div>
      </div>

      {/* Summary card */}
      <div
        className={cn(
          "rounded-2xl border overflow-hidden",
          "border-transparent"
        )}
        style={{
          background:
            "linear-gradient(#1a1a1f, #1a1a1f) padding-box, linear-gradient(135deg, rgba(255,92,43,0.35) 0%, rgba(42,42,48,0.9) 100%) border-box",
        }}
      >
        <div className="flex flex-col divide-y divide-border/60">
          {rows.map(({ label, value, mono, accent }) => (
            <div
              key={label}
              className="flex items-center justify-between gap-4 px-5 py-3.5"
            >
              <span className="font-sans text-sm text-muted shrink-0">{label}</span>
              <span
                className={cn(
                  "font-sans text-sm text-right break-all",
                  mono && "font-mono",
                  accent === "primary" && "text-primary font-semibold",
                  accent === "success" && "text-success",
                  !accent && "text-text"
                )}
              >
                {value}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Total highlight */}
      <div
        className={cn(
          "flex items-center justify-between rounded-2xl px-5 py-4",
          "bg-primary/8 border border-primary/25"
        )}
      >
        <span className="font-sans text-sm font-medium text-muted">
          Total deducted
        </span>
        <span className="font-serif text-2xl text-primary leading-none">
          {formatNgn(amountKobo)}
        </span>
      </div>

      {/* Optional description */}
      <div className="space-y-1.5">
        <Label htmlFor="description">
          Description{" "}
          <span className="font-normal text-muted">(optional)</span>
        </Label>
        <Input
          id="description"
          type="text"
          placeholder="What's this transfer for? e.g. Rent payment"
          value={description}
          onChange={(e) => onDescriptionChange(e.target.value)}
          maxLength={100}
        />
        <p className="font-sans text-xs text-muted text-right">
          {description.length}/100
        </p>
      </div>

      {/* Navigation */}
      <div className="flex gap-3 pt-1">
        <Button
          variant="secondary"
          size="lg"
          onClick={onBack}
          disabled={isSubmitting}
          leftIcon={<ArrowLeft className="h-4 w-4" aria-hidden="true" />}
          className="min-w-[120px]"
        >
          Back
        </Button>
        <Button
          variant="default"
          size="lg"
          fullWidth
          isLoading={isSubmitting}
          onClick={onConfirm}
          className="bg-primary"
        >
          {isSubmitting ? "Processing…" : "Confirm Transfer"}
        </Button>
      </div>

      {/* Security note */}
      <p className="text-center font-sans text-xs text-muted/60 leading-relaxed">
        🔐 This transfer is protected with an idempotency key to prevent double-charges.
      </p>
    </div>
  );
};

// ─── Copy Button ──────────────────────────────────────────────────────────────

const CopyButton: React.FC<{ value: string; label?: string }> = ({
  value,
  label = "Copy",
}) => {
  const [copied, setCopied] = React.useState(false);

  const handleCopy = async () => {
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
      className={cn(
        "inline-flex items-center gap-1.5 rounded-xl border px-3 py-1.5",
        "font-sans text-xs font-medium",
        "transition-all duration-150",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60",
        copied
          ? "border-success/40 bg-success/10 text-success"
          : "border-border bg-surface text-muted hover:text-text hover:border-[#3a3a42]"
      )}
      aria-label={copied ? "Copied!" : label}
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

// ─── Step 4: Result ───────────────────────────────────────────────────────────

interface Step4Props {
  result: TransferResponse | null;
  error: string | null;
  amountKobo: number;
  recipientAccount: string;
  onReset: () => void;
  onViewTransactions: () => void;
}

const Step4Result: React.FC<Step4Props> = ({
  result,
  error,
  amountKobo,
  recipientAccount,
  onReset,
  onViewTransactions,
}) => {
  const confettiFiredRef = React.useRef(false);

  // Fire confetti exactly once when the success result mounts
  React.useEffect(() => {
    if (!result || confettiFiredRef.current) return;
    confettiFiredRef.current = true;

    const duration = 3000;
    const end = Date.now() + duration;

    const colors = ["#FF5C2B", "#00C97A", "#FFB800", "#ffffff"];

    const frame = () => {
      confetti({
        particleCount: 6,
        angle: 60,
        spread: 70,
        origin: { x: 0 },
        colors,
        zIndex: 9999,
      });
      confetti({
        particleCount: 6,
        angle: 120,
        spread: 70,
        origin: { x: 1 },
        colors,
        zIndex: 9999,
      });

      if (Date.now() < end) {
        requestAnimationFrame(frame);
      }
    };

    // Brief delay so the DOM has settled
    const t = setTimeout(frame, 200);
    return () => clearTimeout(t);
  }, [result]);

  // ── Error state ──────────────────────────────────────────────────────────
  if (error && !result) {
    return (
      <div className="flex flex-col items-center gap-6 py-4 text-center animate-fade-in">
        {/* Error icon */}
        <div
          className={cn(
            "relative flex h-20 w-20 items-center justify-center rounded-full",
            "bg-error/10 border-2 border-error/30",
            "shadow-[0_0_32px_rgba(255,59,59,0.15)]"
          )}
        >
          <XCircle className="h-9 w-9 text-error" aria-hidden="true" />
        </div>

        {/* Heading */}
        <div className="space-y-2">
          <h2 className="font-serif text-2xl text-text leading-tight">
            Transfer Failed
          </h2>
          <p className="font-sans text-sm text-muted leading-relaxed max-w-xs">
            Something went wrong while processing your transfer. Your balance
            has{" "}
            <span className="text-text font-medium">not</span> been deducted.
          </p>
        </div>

        {/* Error message box */}
        <div
          className={cn(
            "w-full rounded-2xl border border-error/20 bg-error/5 px-5 py-4",
            "flex items-start gap-3 text-left"
          )}
          role="alert"
        >
          <XCircle
            className="mt-0.5 h-4 w-4 shrink-0 text-error"
            aria-hidden="true"
          />
          <p className="font-sans text-sm text-error leading-relaxed">{error}</p>
        </div>

        {/* Actions */}
        <div className="flex w-full flex-col gap-3">
          <Button
            variant="default"
            size="lg"
            fullWidth
            leftIcon={<RefreshCw className="h-4 w-4" aria-hidden="true" />}
            onClick={onReset}
          >
            Try Again
          </Button>
          <Button
            variant="ghost"
            size="md"
            fullWidth
            onClick={onViewTransactions}
          >
            View Transactions
          </Button>
        </div>
      </div>
    );
  }

  // ── Success state ────────────────────────────────────────────────────────
  if (!result) return null;

  const successRows = [
    { label: "Reference", value: result.reference, mono: true },
    { label: "Amount Sent", value: formatNgn(amountKobo), mono: true },
    {
      label: "Sent to",
      value: formatAccountNumber(recipientAccount),
      mono: true,
    },
    {
      label: "New Balance",
      value: formatNgn(result.new_balance_kobo),
      mono: true,
    },
  ];

  return (
    <div className="flex flex-col items-center gap-6 py-2 text-center animate-fade-in">
      {/* Success icon with animated ring */}
      <div className="relative">
        {/* Outer ring */}
        <div
          aria-hidden="true"
          className="absolute inset-0 animate-ping rounded-full bg-success/20 scale-110"
          style={{ animationDuration: "1.5s", animationIterationCount: "3" }}
        />
        <div
          className={cn(
            "relative flex h-20 w-20 items-center justify-center rounded-full",
            "bg-success/15 border-2 border-success/40",
            "shadow-[0_0_40px_rgba(0,201,122,0.25)]"
          )}
        >
          <CheckCircle2 className="h-9 w-9 text-success" aria-hidden="true" />
        </div>
      </div>

      {/* Heading */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-center gap-2">
          <h2 className="font-serif text-2xl text-text leading-tight">
            Transfer Successful!
          </h2>
          <Sparkles className="h-5 w-5 text-primary shrink-0" aria-hidden="true" />
        </div>
        <p className="font-sans text-sm text-muted leading-relaxed">
          Your money is on its way to{" "}
          <span className="font-mono font-medium text-text">
            {formatAccountNumber(recipientAccount)}
          </span>
        </p>
      </div>

      {/* Amount display */}
      <div
        className={cn(
          "flex flex-col items-center gap-1 rounded-2xl px-8 py-5 w-full",
          "bg-success/5 border border-success/20"
        )}
      >
        <span className="font-sans text-xs font-medium uppercase tracking-widest text-muted/70">
          Amount Transferred
        </span>
        <span className="font-serif text-4xl text-success leading-none mt-1">
          {formatNgn(amountKobo)}
        </span>
      </div>

      {/* Receipt details */}
      <div className="w-full rounded-2xl border border-border bg-surface overflow-hidden">
        <div className="flex items-center justify-between px-5 py-3 border-b border-border bg-surface/50">
          <span className="font-sans text-xs font-semibold uppercase tracking-wider text-muted">
            Transaction Receipt
          </span>
          <CopyButton value={result.reference} label="Copy ref" />
        </div>

        <div className="flex flex-col divide-y divide-border/60">
          {successRows.map(({ label, value, mono }) => (
            <div
              key={label}
              className="flex items-center justify-between gap-4 px-5 py-3"
            >
              <span className="font-sans text-xs text-muted shrink-0">
                {label}
              </span>
              <span
                className={cn(
                  "font-sans text-xs text-text text-right break-all",
                  mono && "font-mono"
                )}
              >
                {value}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Reference highlight */}
      <div
        className={cn(
          "flex w-full items-center justify-between gap-3 rounded-xl border border-border/60 px-4 py-3",
          "bg-surface/50"
        )}
      >
        <div className="flex flex-col gap-0.5 min-w-0">
          <span className="font-sans text-[10px] font-medium uppercase tracking-widest text-muted/60">
            Transaction Reference
          </span>
          <span className="font-mono text-sm font-medium text-text truncate">
            {truncateReference(result.reference)}
          </span>
        </div>
        <CopyButton value={result.reference} label="Copy" />
      </div>

      {/* Actions */}
      <div className="flex w-full flex-col gap-3 pt-1">
        <Button
          variant="default"
          size="lg"
          fullWidth
          leftIcon={<RefreshCw className="h-4 w-4" aria-hidden="true" />}
          onClick={onReset}
        >
          Make Another Transfer
        </Button>
        <Button
          variant="secondary"
          size="md"
          fullWidth
          onClick={onViewTransactions}
        >
          View All Transactions
        </Button>
      </div>
    </div>
  );
};

// ─── Transfer Page ─────────────────────────────────────────────────────────────

const Transfer: React.FC = () => {
  const navigate = useNavigate();
  const [state, setState] = React.useState<WizardState>(INITIAL_STATE);

  const updateState = (patch: Partial<WizardState>) =>
    setState((prev) => ({ ...prev, ...patch }));

  const goToStep = (step: WizardStep) => updateState({ step });

  // ── Step 1 handlers ──────────────────────────────────────────────────────
  const handleStep1Next = () => {
    if (state.recipientAccount.length === 10) {
      goToStep(2);
    }
  };

  // ── Step 2 handlers ──────────────────────────────────────────────────────
  const handleStep2Next = () => {
    const amount = parseFloat(state.amountNaira);
    if (!isNaN(amount) && nairaToKobo(amount) >= 100) {
      goToStep(3);
    }
  };

  // ── Step 3: submit transfer ───────────────────────────────────────────────
  const handleConfirm = async () => {
    updateState({ isSubmitting: true, error: null });

    const amountKobo = nairaToKobo(parseFloat(state.amountNaira));

    try {
      const result = await transferFunds({
        recipient_account: state.recipientAccount,
        amount_kobo: amountKobo,
        reference: state.description || undefined,
      });

      // Immediately update the cached balance from the transfer response
      queryClient.setQueryData<WalletBalance>(BALANCE_QUERY_KEY, (prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          balance_kobo: result.new_balance_kobo,
          balance_naira: result.new_balance_kobo / 100,
        };
      });

      // Invalidate transactions so the new one appears in the list
      queryClient.invalidateQueries({ queryKey: ["transactions"] });

      toast.success("Transfer successful!", {
        description: `${formatNgn(amountKobo)} sent to ${formatAccountNumber(state.recipientAccount)}`,
      });

      updateState({ isSubmitting: false, result, step: 4 });
    } catch (err: unknown) {
      const message = getApiErrorMessage(err);
      updateState({ isSubmitting: false, error: message, step: 4 });
      toast.error("Transfer failed", { description: message });
    }
  };

  // ── Reset wizard ──────────────────────────────────────────────────────────
  const handleReset = () => {
    setState(INITIAL_STATE);
  };

  const amountKobo = nairaToKobo(parseFloat(state.amountNaira) || 0);

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-background text-text font-sans antialiased">
      <NavBar />

      {/* Background glow */}
      <div
        aria-hidden="true"
        className="pointer-events-none fixed inset-0 overflow-hidden"
      >
        <div className="absolute top-0 left-1/2 h-[500px] w-[500px] -translate-x-1/2 -translate-y-1/4 rounded-full bg-primary/6 blur-[100px]" />
      </div>

      <main className="relative z-10 mx-auto max-w-lg px-4 pb-16 pt-8 sm:px-6">

        {/* Page header */}
        <div className="mb-8 flex flex-col gap-1">
          <button
            type="button"
            onClick={() => navigate("/dashboard")}
            className={cn(
              "mb-3 inline-flex items-center gap-1.5 self-start",
              "font-sans text-sm font-medium text-muted",
              "hover:text-text transition-colors duration-150",
              "focus-visible:outline-none focus-visible:underline focus-visible:underline-offset-4"
            )}
          >
            <ArrowLeft className="h-4 w-4" aria-hidden="true" />
            Back to Dashboard
          </button>

          <h1 className="font-serif text-3xl text-text leading-tight">
            Send Money
          </h1>
          <p className="font-sans text-sm text-muted">
            Instant peer-to-peer transfers within PayVault
          </p>
        </div>

        {/* Stepper — hidden on step 4 (final done state) */}
        {state.step < 4 && (
          <div className="mb-8">
            <Stepper currentStep={state.step} />
          </div>
        )}

        {/* Card */}
        <Card
          variant="default"
          padding="lg"
          className={cn(
            "shadow-[0_8px_40px_rgba(0,0,0,0.5)]",
            state.step === 4 && state.result && "border-success/20"
          )}
        >
          {/* Step 1 */}
          {state.step === 1 && (
            <Step1Recipient
              recipientAccount={state.recipientAccount}
              onChange={(value) => updateState({ recipientAccount: value })}
              onNext={handleStep1Next}
            />
          )}

          {/* Step 2 */}
          {state.step === 2 && (
            <Step2Amount
              amountNaira={state.amountNaira}
              recipientAccount={state.recipientAccount}
              onChange={(value) => updateState({ amountNaira: value })}
              onNext={handleStep2Next}
              onBack={() => goToStep(1)}
            />
          )}

          {/* Step 3 */}
          {state.step === 3 && (
            <Step3Review
              recipientAccount={state.recipientAccount}
              amountNaira={state.amountNaira}
              description={state.description}
              onDescriptionChange={(value) =>
                updateState({ description: value })
              }
              onConfirm={handleConfirm}
              onBack={() => goToStep(2)}
              isSubmitting={state.isSubmitting}
            />
          )}

          {/* Step 4 */}
          {state.step === 4 && (
            <Step4Result
              result={state.result}
              error={state.error}
              amountKobo={amountKobo}
              recipientAccount={state.recipientAccount}
              onReset={handleReset}
              onViewTransactions={() => navigate("/transactions")}
            />
          )}
        </Card>

        {/* Step indicator text (except on done step) */}
        {state.step < 4 && (
          <p className="mt-4 text-center font-sans text-xs text-muted/50">
            Step {state.step} of 3
          </p>
        )}
      </main>
    </div>
  );
};

export default Transfer;
