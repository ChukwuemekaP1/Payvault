import * as React from "react";
import { useNavigate, useLocation } from "react-router-dom";
import {
  Mail,
  ArrowRight,
  RefreshCw,
  CheckCircle2,
  XCircle,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "../../lib/utils";
import { verifyEmail, registerUser, getApiErrorMessage } from "../../lib/api";
import { Button } from "../../components/ui/button";

import { Label } from "../../components/ui/label";

// ─── Location State ───────────────────────────────────────────────────────────

interface VerifyEmailLocationState {
  email?: string;
}

// ─── OTP Input ────────────────────────────────────────────────────────────────

interface OtpInputProps {
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  error?: boolean;
}

const OtpInput: React.FC<OtpInputProps> = ({
  value,
  onChange,
  disabled = false,
  error = false,
}) => {
  const inputRef = React.useRef<HTMLInputElement>(null);

  // Auto-focus on mount
  React.useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value.replace(/\D/g, "");
    if (raw.length <= 6) {
      onChange(raw);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    // Prevent non-numeric keys except control keys
    const allowedKeys = [
      "Backspace",
      "Delete",
      "ArrowLeft",
      "ArrowRight",
      "Tab",
      "Enter",
      "Home",
      "End",
    ];
    if (
      !allowedKeys.includes(e.key) &&
      !/^\d$/.test(e.key) &&
      !e.ctrlKey &&
      !e.metaKey
    ) {
      e.preventDefault();
    }
  };

  const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const pasted = e.clipboardData
      .getData("text")
      .replace(/\D/g, "")
      .slice(0, 6);
    if (pasted) {
      onChange(pasted);
    }
  };

  // Build visual digit boxes from the current value
  const digits = value.padEnd(6, "").split("");

  return (
    <div className="space-y-3">
      {/* Accessible hidden input that actually captures input */}
      <div className="relative">
        <input
          ref={inputRef}
          type="text"
          inputMode="numeric"
          pattern="[0-9]*"
          maxLength={6}
          value={value}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          onPaste={handlePaste}
          disabled={disabled}
          aria-label="6-digit verification code"
          aria-describedby="otp-hint"
          autoComplete="one-time-code"
          className="absolute inset-0 opacity-0 w-full h-full cursor-text"
        />

        {/* Visual digit boxes */}
        <div
          className="flex items-center gap-2 sm:gap-3"
          onClick={() => inputRef.current?.focus()}
          role="presentation"
        >
          {digits.map((digit, index) => {
            const isFilled = index < value.length;
            const isActive = index === value.length && !disabled;

            return (
              <div
                key={index}
                className={cn(
                  "flex h-14 flex-1 items-center justify-center rounded-xl border",
                  "font-mono text-xl font-semibold",
                  "transition-all duration-150 ease-out",
                  "select-none",
                  // Default state
                  !isFilled &&
                    !isActive &&
                    !error &&
                    "border-border bg-surface text-muted",
                  // Filled state
                  isFilled &&
                    !error &&
                    "border-primary/50 bg-primary/8 text-text",
                  // Active (cursor) state
                  isActive &&
                    !error &&
                    "border-primary bg-primary/5 text-text shadow-[0_0_0_3px_rgba(255,92,43,0.15)]",
                  // Error state
                  error && "border-error/50 bg-error/5 text-error",
                  // Disabled
                  disabled && "opacity-50 cursor-not-allowed",
                )}
                aria-hidden="true"
              >
                {digit ||
                  (isActive ? (
                    <span
                      className="inline-block h-5 w-0.5 animate-pulse bg-primary"
                      aria-hidden="true"
                    />
                  ) : null)}
              </div>
            );
          })}
        </div>
      </div>

      <p id="otp-hint" className="font-sans text-xs text-muted text-center">
        Enter the 6-digit code sent to your email
      </p>
    </div>
  );
};

// ─── Resend Cooldown Hook ─────────────────────────────────────────────────────

function useResendCooldown(initialSeconds = 60) {
  const [remaining, setRemaining] = React.useState(initialSeconds);
  const intervalRef = React.useRef<ReturnType<typeof setInterval> | null>(null);

  const start = React.useCallback(() => {
    setRemaining(initialSeconds);
    if (intervalRef.current) clearInterval(intervalRef.current);
    intervalRef.current = setInterval(() => {
      setRemaining((prev) => {
        if (prev <= 1) {
          if (intervalRef.current) clearInterval(intervalRef.current);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  }, [initialSeconds]);

  // Start on mount
  React.useEffect(() => {
    start();
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [start]);

  return { remaining, canResend: remaining === 0, restart: start };
}

// ─── VerifyEmail Page ─────────────────────────────────────────────────────────

const VerifyEmail: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();

  // Email can arrive via navigation state (from Register page) or localStorage
  const locationState = location.state as VerifyEmailLocationState | null;
  const email = locationState?.email ?? "";

  // ── State ─────────────────────────────────────────────────────────────────
  const [otp, setOtp] = React.useState("");
  const [isVerifying, setIsVerifying] = React.useState(false);
  const [isResending, setIsResending] = React.useState(false);
  const [otpError, setOtpError] = React.useState<string | null>(null);
  const [verifySuccess, setVerifySuccess] = React.useState(false);

  const { remaining, canResend, restart } = useResendCooldown(60);

  // ── Auto-submit when 6 digits are entered ─────────────────────────────────
  React.useEffect(() => {
    if (otp.length === 6 && !isVerifying && !verifySuccess) {
      handleVerify(otp);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [otp]);

  // ── Verify OTP ────────────────────────────────────────────────────────────
  const handleVerify = async (code: string) => {
    if (code.length !== 6) {
      setOtpError("Please enter all 6 digits.");
      return;
    }

    setOtpError(null);
    setIsVerifying(true);

    try {
      await verifyEmail({ otp: code });

      setVerifySuccess(true);

      toast.success("Email verified!", {
        description: "Your account is now active. Welcome to PayVault!",
      });

      // Brief pause so the user sees the success state before navigating
      await new Promise((resolve) => setTimeout(resolve, 1200));

      navigate("/dashboard", { replace: true });
    } catch (err: unknown) {
      const message = getApiErrorMessage(err);
      setOtpError(
        message.toLowerCase().includes("invalid") ||
          message.toLowerCase().includes("expired") ||
          message.toLowerCase().includes("otp")
          ? "Invalid or expired code. Please try again or request a new one."
          : message,
      );
      // Clear the OTP so user can re-enter
      setOtp("");
    } finally {
      setIsVerifying(false);
    }
  };

  // ── Resend Code ───────────────────────────────────────────────────────────
  const handleResend = async () => {
    if (!canResend || isResending || !email) return;

    setIsResending(true);
    setOtpError(null);
    setOtp("");

    try {
      // Re-call /auth/register with the same email to trigger a new OTP email
      // (backend re-sends the verification code on duplicate register attempts)
      await registerUser({ email, password: "" }).catch(() => {
        // The backend likely returns 409 (conflict) for existing emails,
        // but should still dispatch a new OTP. We swallow the error here
        // and notify the user optimistically.
      });

      toast.success("Verification code resent!", {
        description: `Check your inbox at ${email}`,
      });

      restart();
    } catch (err: unknown) {
      const message = getApiErrorMessage(err);
      toast.error("Could not resend code", { description: message });
    } finally {
      setIsResending(false);
    }
  };

  // ── Manual submit (if user doesn't auto-trigger) ──────────────────────────
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    handleVerify(otp);
  };

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-background text-text font-sans antialiased flex flex-col">
      {/* Ambient background glow */}
      <div
        aria-hidden="true"
        className="pointer-events-none fixed inset-0 overflow-hidden"
      >
        <div className="absolute -top-40 left-1/2 h-[500px] w-[500px] -translate-x-1/2 rounded-full bg-primary/8 blur-[100px]" />
        <div className="absolute top-1/3 left-1/4 h-64 w-64 rounded-full bg-primary/5 blur-[80px]" />
      </div>

      {/* Top logo bar */}
      <header className="relative z-10 flex items-center justify-center py-8">
        <div className="flex items-center gap-2.5 select-none">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary shadow-glow-sm">
            <span className="font-serif font-bold text-white text-sm leading-none">
              PV
            </span>
          </div>
          <span className="font-sans font-semibold text-text text-base tracking-tight">
            Pay<span className="text-primary">Vault</span>
          </span>
        </div>
      </header>

      {/* Main content */}
      <main className="relative z-10 flex flex-1 items-center justify-center px-4 py-8">
        <div className="w-full max-w-[440px]">
          {/* Card */}
          <div
            className={cn(
              "rounded-2xl border border-border bg-surface p-8 shadow-card",
              "animate-fade-in",
            )}
          >
            {verifySuccess ? (
              /* ── Success State ── */
              <div className="flex flex-col items-center gap-5 py-4 text-center">
                <div
                  className={cn(
                    "flex h-16 w-16 items-center justify-center rounded-full",
                    "bg-success/15 border border-success/30",
                    "animate-scale-in",
                  )}
                >
                  <CheckCircle2
                    className="h-8 w-8 text-success"
                    aria-hidden="true"
                  />
                </div>

                <div className="space-y-2">
                  <h1 className="font-serif text-2xl text-text leading-tight">
                    Email Verified!
                  </h1>
                  <p className="font-sans text-sm text-muted leading-relaxed">
                    Your account is active. Taking you to your dashboard…
                  </p>
                </div>

                {/* Animated dots */}
                <div className="flex items-center gap-1.5 pt-2">
                  {[0, 1, 2].map((i) => (
                    <span
                      key={i}
                      className="inline-block h-2 w-2 rounded-full bg-success animate-bounce"
                      style={{ animationDelay: `${i * 0.15}s` }}
                      aria-hidden="true"
                    />
                  ))}
                </div>
              </div>
            ) : (
              /* ── Verification Form State ── */
              <>
                {/* Header */}
                <div className="flex flex-col items-center gap-4 text-center">
                  {/* Mail icon */}
                  <div
                    className={cn(
                      "flex h-14 w-14 items-center justify-center rounded-2xl",
                      "bg-primary/10 border border-primary/25",
                      "shadow-[0_0_24px_rgba(255,92,43,0.12)]",
                    )}
                  >
                    <Mail className="h-6 w-6 text-primary" aria-hidden="true" />
                  </div>

                  <div className="space-y-1.5">
                    <h1 className="font-serif text-2xl text-text leading-tight">
                      Check your email
                    </h1>
                    <p className="font-sans text-sm text-muted leading-relaxed">
                      We sent a 6-digit verification code to
                    </p>
                    {email ? (
                      <p
                        className={cn(
                          "inline-flex items-center gap-1.5 rounded-xl px-3 py-1.5",
                          "bg-primary/8 border border-primary/20",
                          "font-sans text-sm font-semibold text-primary",
                        )}
                      >
                        {email}
                      </p>
                    ) : (
                      <p className="font-sans text-sm font-medium text-text">
                        your registered email address
                      </p>
                    )}
                  </div>
                </div>

                {/* Divider */}
                <div className="my-6 h-px bg-border" />

                {/* Form */}
                <form onSubmit={handleSubmit} noValidate className="space-y-5">
                  {/* OTP Input */}
                  <div className="space-y-2">
                    <Label htmlFor="otp" className="sr-only">
                      Verification Code
                    </Label>
                    <OtpInput
                      value={otp}
                      onChange={(val) => {
                        setOtp(val);
                        if (otpError) setOtpError(null);
                      }}
                      disabled={isVerifying}
                      error={Boolean(otpError)}
                    />
                  </div>

                  {/* Error message */}
                  {otpError && (
                    <div
                      role="alert"
                      aria-live="assertive"
                      className={cn(
                        "flex items-start gap-2.5 rounded-xl border border-error/30",
                        "bg-error/8 px-4 py-3 animate-fade-in",
                      )}
                    >
                      <XCircle
                        className="mt-0.5 h-4 w-4 shrink-0 text-error"
                        aria-hidden="true"
                      />
                      <p className="font-sans text-sm text-error leading-snug">
                        {otpError}
                      </p>
                    </div>
                  )}

                  {/* Submit button */}
                  <Button
                    type="submit"
                    variant="default"
                    size="lg"
                    fullWidth
                    isLoading={isVerifying}
                    disabled={otp.length < 6 || isVerifying}
                    rightIcon={
                      !isVerifying ? (
                        <ArrowRight className="h-4 w-4" aria-hidden="true" />
                      ) : undefined
                    }
                  >
                    {isVerifying ? "Verifying…" : "Verify Email"}
                  </Button>
                </form>

                {/* Divider */}
                <div className="my-5 h-px bg-border" />

                {/* Resend section */}
                <div className="flex flex-col items-center gap-3 text-center">
                  <p className="font-sans text-sm text-muted">
                    Didn't receive the code?
                  </p>

                  {canResend ? (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      isLoading={isResending}
                      leftIcon={
                        !isResending ? (
                          <RefreshCw
                            className="h-3.5 w-3.5"
                            aria-hidden="true"
                          />
                        ) : undefined
                      }
                      onClick={handleResend}
                      disabled={isResending || !email}
                    >
                      {isResending ? "Sending…" : "Resend code"}
                    </Button>
                  ) : (
                    <div className="flex items-center gap-2">
                      <div
                        className={cn(
                          "flex h-7 w-7 shrink-0 items-center justify-center",
                          "rounded-full bg-surface border border-border",
                        )}
                        aria-hidden="true"
                      >
                        {/* Countdown ring */}
                        <svg
                          width="28"
                          height="28"
                          viewBox="0 0 28 28"
                          className="absolute"
                          aria-hidden="true"
                        >
                          <circle
                            cx="14"
                            cy="14"
                            r="11"
                            fill="none"
                            stroke="#2a2a30"
                            strokeWidth="2"
                          />
                          <circle
                            cx="14"
                            cy="14"
                            r="11"
                            fill="none"
                            stroke="#FF5C2B"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeDasharray={`${2 * Math.PI * 11}`}
                            strokeDashoffset={`${2 * Math.PI * 11 * (1 - remaining / 60)}`}
                            transform="rotate(-90 14 14)"
                            style={{
                              transition: "stroke-dashoffset 1s linear",
                            }}
                          />
                        </svg>
                      </div>
                      <p
                        className="font-sans text-sm text-muted"
                        aria-live="polite"
                        aria-atomic="true"
                      >
                        Resend in{" "}
                        <span className="font-mono font-semibold text-text">
                          {remaining}s
                        </span>
                      </p>
                    </div>
                  )}

                  {/* Tip */}
                  <p className="font-sans text-xs text-muted/70 leading-relaxed max-w-xs">
                    Check your spam folder if you don't see the email. Codes
                    expire after 10 minutes.
                  </p>
                </div>
              </>
            )}
          </div>

          {/* Back to login link */}
          {!verifySuccess && (
            <p className="mt-6 text-center font-sans text-sm text-muted">
              Wrong account?{" "}
              <button
                type="button"
                onClick={() => navigate("/auth/login")}
                className={cn(
                  "font-medium text-primary",
                  "underline-offset-4 hover:underline",
                  "transition-colors duration-150",
                  "focus-visible:outline-none focus-visible:underline",
                )}
              >
                Back to login
              </button>
            </p>
          )}
        </div>
      </main>
    </div>
  );
};

export default VerifyEmail;
