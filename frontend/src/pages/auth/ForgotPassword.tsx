import * as React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Link } from "react-router-dom";
import { Mail, ArrowLeft, CheckCircle2, XCircle } from "lucide-react";
import { cn } from "../../lib/utils";
import { forgotPassword, getApiErrorMessage } from "../../lib/api";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { Label } from "../../components/ui/label";

// ─── Zod Schema ───────────────────────────────────────────────────────────────

const forgotPasswordSchema = z.object({
  email: z
    .string()
    .min(1, "Email is required")
    .email("Please enter a valid email address")
    .max(255, "Email must be 255 characters or fewer"),
});

type ForgotPasswordFormValues = z.infer<typeof forgotPasswordSchema>;

// ─── Success State ────────────────────────────────────────────────────────────

interface SuccessStateProps {
  email: string;
  onTryAgain: () => void;
}

const SuccessState: React.FC<SuccessStateProps> = ({ email, onTryAgain }) => (
  <div className="flex flex-col items-center gap-6 text-center animate-fade-in">
    {/* Success icon */}
    <div
      className={cn(
        "flex h-20 w-20 items-center justify-center rounded-full",
        "bg-success/10 border-2 border-success/30",
        "shadow-[0_0_32px_rgba(0,201,122,0.15)]"
      )}
    >
      <CheckCircle2 className="h-9 w-9 text-success" aria-hidden="true" />
    </div>

    {/* Heading */}
    <div className="space-y-2">
      <h2 className="font-serif text-2xl text-text leading-tight">
        Check your email
      </h2>
      <p className="font-sans text-sm text-muted leading-relaxed max-w-xs">
        We sent password reset instructions to
      </p>
      <p className="font-mono text-sm font-semibold text-text break-all">
        {email}
      </p>
    </div>

    {/* Info box */}
    <div
      className={cn(
        "w-full rounded-2xl border border-success/20 bg-success/5 px-5 py-4",
        "flex flex-col gap-2 text-left"
      )}
    >
      {[
        "Check your inbox (and spam folder)",
        "Click the link in the email",
        "You'll be taken to reset your password",
        "The link expires in 15 minutes",
      ].map((step, i) => (
        <div key={i} className="flex items-start gap-2.5">
          <span
            className={cn(
              "mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center",
              "rounded-full bg-success/20 border border-success/30",
              "font-sans text-[9px] font-bold text-success"
            )}
            aria-hidden="true"
          >
            {i + 1}
          </span>
          <span className="font-sans text-xs text-muted leading-tight">
            {step}
          </span>
        </div>
      ))}
    </div>

    {/* Actions */}
    <div className="flex w-full flex-col gap-3">
      <Link
        to="/auth/login"
        className={cn(
          "flex w-full items-center justify-center gap-2",
          "h-11 rounded-xl",
          "bg-primary border border-primary",
          "font-sans text-sm font-semibold text-white",
          "hover:bg-[#e64d20] hover:border-[#e64d20]",
          "active:scale-[0.97]",
          "transition-all duration-150 ease-out",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60 focus-visible:ring-offset-2 focus-visible:ring-offset-background",
          "shadow-glow-sm hover:shadow-glow"
        )}
      >
        Back to Login
      </Link>

      <button
        type="button"
        onClick={onTryAgain}
        className={cn(
          "font-sans text-xs text-muted",
          "hover:text-primary transition-colors duration-150",
          "focus-visible:outline-none focus-visible:underline underline-offset-4"
        )}
      >
        Didn't receive it? Try a different email
      </button>
    </div>
  </div>
);

// ─── ForgotPassword Page ──────────────────────────────────────────────────────

const ForgotPassword: React.FC = () => {
  const [succeeded, setSucceeded] = React.useState(false);
  const [submittedEmail, setSubmittedEmail] = React.useState("");
  const [apiError, setApiError] = React.useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    reset,
  } = useForm<ForgotPasswordFormValues>({
    resolver: zodResolver(forgotPasswordSchema),
    mode: "onTouched",
    defaultValues: { email: "" },
  });

  const onSubmit = async (values: ForgotPasswordFormValues) => {
    setApiError(null);
    try {
      await forgotPassword({ email: values.email });
      setSubmittedEmail(values.email);
      setSucceeded(true);
    } catch (err: unknown) {
      // For security, we don't reveal whether the email exists.
      // However, if the server returns a non-404 error we surface it.
      const message = getApiErrorMessage(err);
      // 404 "user not found" → show the success state anyway to prevent
      // email enumeration attacks.
      if (
        message.toLowerCase().includes("not found") ||
        message.toLowerCase().includes("no user") ||
        message.toLowerCase().includes("404")
      ) {
        // Show success to prevent email enumeration
        setSubmittedEmail(values.email);
        setSucceeded(true);
      } else {
        setApiError(message);
      }
    }
  };

  const handleTryAgain = () => {
    setSucceeded(false);
    setSubmittedEmail("");
    setApiError(null);
    reset();
  };

  return (
    <div className="min-h-screen bg-background text-text font-sans antialiased">
      {/* Full-page centered layout */}
      <div className="flex min-h-screen flex-col items-center justify-center px-4 py-12 sm:px-6">

        {/* Back to login — top-left positioned on desktop, inline on mobile */}
        <div className="w-full max-w-[440px]">
          <Link
            to="/auth/login"
            className={cn(
              "mb-8 inline-flex items-center gap-1.5",
              "font-sans text-sm font-medium text-muted",
              "hover:text-text transition-colors duration-150",
              "focus-visible:outline-none focus-visible:underline underline-offset-4",
              "group"
            )}
          >
            <ArrowLeft
              className="h-4 w-4 transition-transform duration-150 group-hover:-translate-x-0.5"
              aria-hidden="true"
            />
            Back to login
          </Link>
        </div>

        {/* Card */}
        <div
          className={cn(
            "w-full max-w-[440px]",
            "rounded-3xl border border-border bg-surface",
            "shadow-card",
            "p-8 sm:p-10"
          )}
        >
          {succeeded ? (
            <SuccessState email={submittedEmail} onTryAgain={handleTryAgain} />
          ) : (
            <div className="flex flex-col gap-7">
              {/* Icon + heading */}
              <div className="flex flex-col items-center gap-5 text-center">
                {/* Mail icon orb */}
                <div
                  className={cn(
                    "flex h-16 w-16 items-center justify-center rounded-2xl",
                    "bg-primary/10 border border-primary/25",
                    "shadow-[0_0_24px_rgba(255,92,43,0.12)]"
                  )}
                >
                  <Mail className="h-7 w-7 text-primary" aria-hidden="true" />
                </div>

                <div className="space-y-2">
                  <h1 className="font-serif text-2xl sm:text-3xl text-text leading-tight">
                    Forgot your password?
                  </h1>
                  <p className="font-sans text-sm text-muted leading-relaxed max-w-xs">
                    No worries — enter your email address and we'll send you
                    a link to reset your password.
                  </p>
                </div>
              </div>

              {/* ── API Error ── */}
              {apiError && (
                <div
                  role="alert"
                  aria-live="assertive"
                  className={cn(
                    "flex items-start gap-3 rounded-xl border border-error/30",
                    "bg-error/8 px-4 py-3.5 animate-fade-in"
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
                className="flex flex-col gap-5"
              >
                <div className="space-y-1.5">
                  <Label htmlFor="email" required>
                    Email Address
                  </Label>
                  <Input
                    id="email"
                    type="email"
                    autoComplete="email"
                    autoFocus
                    placeholder="you@example.com"
                    error={Boolean(errors.email)}
                    aria-describedby={errors.email ? "email-error" : undefined}
                    leftAdornment={
                      <Mail className="h-4 w-4" aria-hidden="true" />
                    }
                    {...register("email")}
                  />
                  {errors.email && (
                    <p
                      id="email-error"
                      role="alert"
                      className="font-sans text-xs text-error leading-tight"
                    >
                      {errors.email.message}
                    </p>
                  )}
                </div>

                <Button
                  type="submit"
                  variant="default"
                  size="lg"
                  fullWidth
                  isLoading={isSubmitting}
                  leftIcon={
                    !isSubmitting ? (
                      <Mail className="h-4 w-4" aria-hidden="true" />
                    ) : undefined
                  }
                >
                  {isSubmitting ? "Sending reset link…" : "Send Reset Link"}
                </Button>
              </form>

              {/* Divider + links */}
              <div className="flex flex-col items-center gap-3">
                <div className="flex w-full items-center gap-3">
                  <div className="h-px flex-1 bg-border" />
                  <span className="font-sans text-xs text-muted shrink-0">
                    or
                  </span>
                  <div className="h-px flex-1 bg-border" />
                </div>

                <div className="flex flex-wrap items-center justify-center gap-4">
                  <Link
                    to="/auth/login"
                    className={cn(
                      "font-sans text-sm font-medium text-muted",
                      "hover:text-text transition-colors duration-150",
                      "focus-visible:outline-none focus-visible:underline underline-offset-4"
                    )}
                  >
                    Remember your password?{" "}
                    <span className="text-primary">Log in</span>
                  </Link>
                </div>

                <Link
                  to="/auth/register"
                  className={cn(
                    "font-sans text-sm font-medium text-muted",
                    "hover:text-text transition-colors duration-150",
                    "focus-visible:outline-none focus-visible:underline underline-offset-4"
                  )}
                >
                  New here?{" "}
                  <span className="text-primary">Create a free account</span>
                </Link>
              </div>
            </div>
          )}
        </div>

        {/* Footer note */}
        <p className="mt-8 font-sans text-xs text-muted/40 text-center select-none">
          PayVault — Nigerian Fintech Wallet · © 2025
        </p>
      </div>
    </div>
  );
};

export default ForgotPassword;
