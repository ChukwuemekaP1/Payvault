import * as React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useNavigate, useSearchParams, Link } from "react-router-dom";
import {
  Eye,
  EyeOff,
  ArrowRight,
  XCircle,
  CheckCircle2,
  KeyRound,
  AlertTriangle,
} from "lucide-react";
import { toast } from "sonner";
import { cn, getPasswordStrength } from "../../lib/utils";
import { resetPassword, getApiErrorMessage } from "../../lib/api";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { Label } from "../../components/ui/label";

// ─── Zod Schema ───────────────────────────────────────────────────────────────

const resetPasswordSchema = z
  .object({
    newPassword: z
      .string()
      .min(8, "Password must be at least 8 characters")
      .max(128, "Password must be 128 characters or fewer")
      .regex(/[A-Z]/, "Password must contain at least one uppercase letter")
      .regex(/[0-9]/, "Password must contain at least one number"),
    confirmPassword: z.string().min(1, "Please confirm your new password"),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    path: ["confirmPassword"],
    message: "Passwords do not match",
  });

type ResetPasswordFormValues = z.infer<typeof resetPasswordSchema>;

// ─── Password Strength Bar ────────────────────────────────────────────────────

const StrengthBar: React.FC<{ password: string }> = ({ password }) => {
  const { score, label, color } = getPasswordStrength(password);
  if (!password) return null;

  return (
    <div className="mt-2 space-y-1.5">
      <div
        className="flex gap-1"
        role="progressbar"
        aria-valuenow={score}
        aria-valuemin={0}
        aria-valuemax={4}
        aria-label={`Password strength: ${label}`}
      >
        {Array.from({ length: 4 }).map((_, i) => (
          <div
            key={i}
            className={cn(
              "h-1 flex-1 rounded-full transition-all duration-300 ease-out",
              i < score ? "opacity-100" : "bg-[#2a2a30] opacity-100",
            )}
            style={i < score ? { backgroundColor: color } : undefined}
          />
        ))}
      </div>
      <p
        className="font-sans text-xs font-medium transition-colors duration-200"
        style={{ color: color || "#6b6872" }}
      >
        {label || "Enter a password"}
      </p>
    </div>
  );
};

// ─── Requirement Row ──────────────────────────────────────────────────────────

const Requirement: React.FC<{ met: boolean; label: string }> = ({
  met,
  label,
}) => (
  <div className="flex items-center gap-1.5">
    {met ? (
      <CheckCircle2
        className="h-3.5 w-3.5 shrink-0 text-success"
        aria-hidden="true"
      />
    ) : (
      <XCircle className="h-3.5 w-3.5 shrink-0 text-muted" aria-hidden="true" />
    )}
    <span
      className={cn(
        "font-sans text-xs transition-colors duration-200",
        met ? "text-success" : "text-muted",
      )}
    >
      {label}
    </span>
  </div>
);

// ─── Invalid Token State ──────────────────────────────────────────────────────

const InvalidTokenView: React.FC = () => {
  const navigate = useNavigate();
  return (
    <div className="flex flex-col items-center gap-5 text-center py-4">
      <div
        className={cn(
          "flex h-16 w-16 items-center justify-center rounded-2xl",
          "bg-warning/10 border border-warning/30",
        )}
      >
        <AlertTriangle className="h-7 w-7 text-warning" aria-hidden="true" />
      </div>

      <div className="space-y-2">
        <h2 className="font-serif text-2xl text-text leading-tight">
          Invalid reset link
        </h2>
        <p className="font-sans text-sm text-muted leading-relaxed max-w-xs">
          This password reset link is missing or invalid. Please request a new
          one from the forgot password page.
        </p>
      </div>

      <div className="flex flex-col gap-2.5 w-full max-w-xs">
        <Button
          variant="default"
          size="md"
          fullWidth
          onClick={() => navigate("/auth/forgot-password")}
        >
          Request new reset link
        </Button>
        <Button
          variant="ghost"
          size="md"
          fullWidth
          onClick={() => navigate("/auth/login")}
        >
          Back to login
        </Button>
      </div>
    </div>
  );
};

// ─── Success State ────────────────────────────────────────────────────────────

const SuccessView: React.FC = () => {
  const navigate = useNavigate();

  React.useEffect(() => {
    const t = setTimeout(
      () => navigate("/auth/login", { replace: true }),
      3500,
    );
    return () => clearTimeout(t);
  }, [navigate]);

  return (
    <div className="flex flex-col items-center gap-5 text-center py-4 animate-fade-in">
      <div
        className={cn(
          "flex h-16 w-16 items-center justify-center rounded-2xl",
          "bg-success/10 border border-success/30",
          "shadow-[0_0_24px_rgba(0,201,122,0.15)]",
        )}
      >
        <CheckCircle2 className="h-7 w-7 text-success" aria-hidden="true" />
      </div>

      <div className="space-y-2">
        <h2 className="font-serif text-2xl text-text leading-tight">
          Password reset!
        </h2>
        <p className="font-sans text-sm text-muted leading-relaxed max-w-xs">
          Your password has been updated successfully. Redirecting you to login…
        </p>
      </div>

      {/* Animated redirect indicator */}
      <div className="w-full max-w-xs rounded-full bg-border overflow-hidden h-1">
        <div
          className="h-full bg-success rounded-full"
          style={{
            animation: "grow-bar 3.5s linear forwards",
          }}
        />
      </div>

      <style>{`
        @keyframes grow-bar {
          from { width: 0%; }
          to   { width: 100%; }
        }
      `}</style>

      <Button
        variant="default"
        size="md"
        fullWidth
        className="max-w-xs"
        onClick={() => navigate("/auth/login", { replace: true })}
      >
        Go to Login now
      </Button>
    </div>
  );
};

// ─── Reset Password Page ──────────────────────────────────────────────────────

const ResetPassword: React.FC = () => {
  const [searchParams] = useSearchParams();

  // Read the reset token from the URL: /auth/reset-password?token=xxx
  const token = searchParams.get("token");

  // ── Form state ────────────────────────────────────────────────────────────
  const {
    register,
    handleSubmit,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<ResetPasswordFormValues>({
    resolver: zodResolver(resetPasswordSchema),
    mode: "onTouched",
    defaultValues: {
      newPassword: "",
      confirmPassword: "",
    },
  });

  const newPasswordValue = watch("newPassword");

  // ── UI state ──────────────────────────────────────────────────────────────
  const [showNewPassword, setShowNewPassword] = React.useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = React.useState(false);
  const [apiError, setApiError] = React.useState<string | null>(null);
  const [succeeded, setSucceeded] = React.useState(false);

  // Computed requirements
  const requirements = React.useMemo(() => {
    const pw = newPasswordValue ?? "";
    return {
      length: pw.length >= 8,
      uppercase: /[A-Z]/.test(pw),
      number: /[0-9]/.test(pw),
    };
  }, [newPasswordValue]);

  // ── Submit ────────────────────────────────────────────────────────────────
  const onSubmit = async (values: ResetPasswordFormValues) => {
    if (!token) return;
    setApiError(null);

    try {
      await resetPassword({
        token,
        new_password: values.newPassword,
      });

      toast.success("Password reset!", {
        description:
          "Your password has been updated. Please log in with your new password.",
      });

      setSucceeded(true);
    } catch (err: unknown) {
      const message = getApiErrorMessage(err);
      // Surface token-specific errors more clearly
      const lowerMsg = message.toLowerCase();
      if (
        lowerMsg.includes("token") ||
        lowerMsg.includes("expired") ||
        lowerMsg.includes("invalid")
      ) {
        setApiError(
          "This reset link has expired or is no longer valid. Please request a new one.",
        );
      } else {
        setApiError(message);
      }
    }
  };

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-background text-text font-sans antialiased flex flex-col">
      {/* Ambient glow */}
      <div
        aria-hidden="true"
        className="pointer-events-none fixed inset-0 overflow-hidden"
      >
        <div className="absolute top-0 left-1/2 h-[400px] w-[400px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-primary/8 blur-[80px]" />
        <div className="absolute bottom-0 right-0 h-64 w-64 rounded-full bg-primary/5 blur-[60px]" />
      </div>

      {/* Back to login link */}
      <nav className="relative z-10 flex items-center px-5 py-5 sm:px-8">
        <Link
          to="/auth/login"
          className={cn(
            "inline-flex items-center gap-1.5",
            "font-sans text-sm font-medium text-muted",
            "hover:text-text transition-colors duration-150",
            "focus-visible:outline-none focus-visible:underline focus-visible:underline-offset-4",
          )}
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <path d="m12 19-7-7 7-7" />
            <path d="M19 12H5" />
          </svg>
          Back to login
        </Link>
      </nav>

      {/* Main content */}
      <main className="relative z-10 flex flex-1 items-center justify-center px-5 py-8 sm:px-8">
        <div className="w-full max-w-[440px]">
          {/* Card container */}
          <div
            className={cn(
              "rounded-2xl border border-border bg-surface p-7 sm:p-9",
              "shadow-[0_4px_40px_rgba(0,0,0,0.5)]",
            )}
          >
            {/* ── No token: show error state ── */}
            {!token && <InvalidTokenView />}

            {/* ── Success state ── */}
            {token && succeeded && <SuccessView />}

            {/* ── Form state ── */}
            {token && !succeeded && (
              <div className="space-y-7">
                {/* Header */}
                <div className="space-y-4">
                  {/* Icon */}
                  <div
                    className={cn(
                      "flex h-12 w-12 items-center justify-center rounded-2xl",
                      "bg-primary/10 border border-primary/20",
                      "shadow-[0_0_20px_rgba(255,92,43,0.12)]",
                    )}
                  >
                    <KeyRound
                      className="h-5 w-5 text-primary"
                      aria-hidden="true"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <h1 className="font-serif text-3xl text-text leading-tight">
                      Set new password
                    </h1>
                    <p className="font-sans text-sm text-muted leading-relaxed">
                      Choose a strong password you haven't used before.
                    </p>
                  </div>
                </div>

                {/* ── API Error Banner ── */}
                {apiError && (
                  <div
                    role="alert"
                    aria-live="assertive"
                    className={cn(
                      "flex items-start gap-3 rounded-xl border border-error/30 bg-error/8 px-4 py-3.5",
                      "animate-fade-in",
                    )}
                  >
                    <XCircle
                      className="mt-0.5 h-4 w-4 shrink-0 text-error"
                      aria-hidden="true"
                    />
                    <p className="font-sans text-sm text-error leading-snug">
                      {apiError}
                    </p>
                  </div>
                )}

                {/* ── Form ── */}
                <form
                  onSubmit={handleSubmit(onSubmit)}
                  noValidate
                  className="space-y-5"
                >
                  {/* New Password */}
                  <div className="space-y-1.5">
                    <Label htmlFor="newPassword" required>
                      New Password
                    </Label>
                    <Input
                      id="newPassword"
                      type={showNewPassword ? "text" : "password"}
                      autoComplete="new-password"
                      autoFocus
                      placeholder="Min. 8 chars, 1 uppercase, 1 number"
                      error={Boolean(errors.newPassword)}
                      aria-describedby="new-password-requirements"
                      rightAdornment={
                        <button
                          type="button"
                          tabIndex={-1}
                          onClick={() => setShowNewPassword((v) => !v)}
                          aria-label={
                            showNewPassword ? "Hide password" : "Show password"
                          }
                          className={cn(
                            "flex items-center justify-center h-7 w-7 rounded-lg",
                            "text-muted border border-transparent",
                            "hover:text-text hover:bg-white/5 hover:border-border",
                            "transition-colors duration-150",
                            "focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary/60",
                          )}
                        >
                          {showNewPassword ? (
                            <EyeOff className="h-4 w-4" aria-hidden="true" />
                          ) : (
                            <Eye className="h-4 w-4" aria-hidden="true" />
                          )}
                        </button>
                      }
                      {...register("newPassword")}
                    />

                    {/* Strength bar */}
                    <StrengthBar password={newPasswordValue ?? ""} />

                    {/* Requirements checklist */}
                    {newPasswordValue && (
                      <div
                        id="new-password-requirements"
                        className="mt-2 flex flex-col gap-1.5 rounded-xl border border-border bg-background/50 px-3.5 py-3"
                      >
                        <Requirement
                          met={requirements.length}
                          label="At least 8 characters"
                        />
                        <Requirement
                          met={requirements.uppercase}
                          label="At least one uppercase letter (A–Z)"
                        />
                        <Requirement
                          met={requirements.number}
                          label="At least one number (0–9)"
                        />
                      </div>
                    )}

                    {errors.newPassword && (
                      <p
                        role="alert"
                        className="font-sans text-xs text-error leading-tight"
                      >
                        {errors.newPassword.message}
                      </p>
                    )}
                  </div>

                  {/* Confirm Password */}
                  <div className="space-y-1.5">
                    <Label htmlFor="confirmPassword" required>
                      Confirm New Password
                    </Label>
                    <Input
                      id="confirmPassword"
                      type={showConfirmPassword ? "text" : "password"}
                      autoComplete="new-password"
                      placeholder="Re-enter your new password"
                      error={Boolean(errors.confirmPassword)}
                      aria-describedby={
                        errors.confirmPassword
                          ? "confirm-password-error"
                          : undefined
                      }
                      rightAdornment={
                        <button
                          type="button"
                          tabIndex={-1}
                          onClick={() => setShowConfirmPassword((v) => !v)}
                          aria-label={
                            showConfirmPassword
                              ? "Hide confirm password"
                              : "Show confirm password"
                          }
                          className={cn(
                            "flex items-center justify-center h-7 w-7 rounded-lg",
                            "text-muted border border-transparent",
                            "hover:text-text hover:bg-white/5 hover:border-border",
                            "transition-colors duration-150",
                            "focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary/60",
                          )}
                        >
                          {showConfirmPassword ? (
                            <EyeOff className="h-4 w-4" aria-hidden="true" />
                          ) : (
                            <Eye className="h-4 w-4" aria-hidden="true" />
                          )}
                        </button>
                      }
                      {...register("confirmPassword")}
                    />
                    {errors.confirmPassword && (
                      <p
                        id="confirm-password-error"
                        role="alert"
                        className="font-sans text-xs text-error leading-tight"
                      >
                        {errors.confirmPassword.message}
                      </p>
                    )}
                  </div>

                  {/* Security reminder */}
                  <div
                    className={cn(
                      "flex items-start gap-2.5 rounded-xl border border-border/60",
                      "bg-surface/50 px-3.5 py-3",
                    )}
                  >
                    <span
                      className="text-sm mt-0.5 shrink-0"
                      aria-hidden="true"
                    >
                      💡
                    </span>
                    <p className="font-sans text-xs text-muted leading-relaxed">
                      Use a unique password that you don't use on any other
                      site. Mix uppercase, numbers, and symbols for best
                      security.
                    </p>
                  </div>

                  {/* Submit */}
                  <Button
                    type="submit"
                    variant="default"
                    size="lg"
                    fullWidth
                    isLoading={isSubmitting}
                    rightIcon={
                      !isSubmitting ? (
                        <ArrowRight className="h-4 w-4" aria-hidden="true" />
                      ) : undefined
                    }
                  >
                    {isSubmitting ? "Resetting password…" : "Reset Password"}
                  </Button>
                </form>

                {/* Footer link */}
                <p className="text-center font-sans text-sm text-muted">
                  Remembered your password?{" "}
                  <Link
                    to="/auth/login"
                    className={cn(
                      "font-semibold text-text",
                      "underline-offset-4 hover:text-primary hover:underline",
                      "transition-colors duration-150",
                      "focus-visible:outline-none focus-visible:underline",
                    )}
                  >
                    Log in
                  </Link>
                </p>
              </div>
            )}
          </div>

          {/* Token debug info (only in dev) */}
          {import.meta.env.DEV && token && (
            <div className="mt-4 rounded-xl border border-border/40 bg-surface/40 px-4 py-3">
              <p className="font-mono text-[10px] text-muted/60 break-all">
                <span className="text-muted/40">token: </span>
                {token}
              </p>
            </div>
          )}
        </div>
      </main>

      {/* Footer */}
      <footer className="relative z-10 py-5 text-center">
        <p className="font-sans text-xs text-muted/40">
          © 2025 PayVault. All rights reserved.
        </p>
      </footer>
    </div>
  );
};

export default ResetPassword;
