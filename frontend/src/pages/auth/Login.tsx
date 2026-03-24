import * as React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useNavigate, Link } from "react-router-dom";
import { Eye, EyeOff, ArrowRight, XCircle, Wallet } from "lucide-react";
import { toast } from "sonner";
import { cn } from "../../lib/utils";
import { loginUser, getApiErrorMessage } from "../../lib/api";
import { useAuthStore } from "../../store/authStore";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { Label } from "../../components/ui/label";

// ─── Zod Schema ───────────────────────────────────────────────────────────────

const loginSchema = z.object({
  email: z
    .string()
    .min(1, "Email is required")
    .email("Please enter a valid email address"),
  password: z
    .string()
    .min(1, "Password is required")
    .min(8, "Password must be at least 8 characters"),
});

type LoginFormValues = z.infer<typeof loginSchema>;

// ─── Brand Panel (Right Side) ─────────────────────────────────────────────────

const BrandPanel: React.FC = () => (
  <div
    className="hidden lg:flex flex-col justify-between p-12 xl:p-16"
    style={{
      background:
        "linear-gradient(145deg, #0d0d0f 0%, #1a1108 30%, #2a1800 60%, #1a0a00 100%)",
    }}
  >
    {/* Top: Logo */}
    <div className="flex items-center gap-3 select-none">
      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary shadow-glow">
        <span className="font-serif font-bold text-white text-base leading-none">
          PV
        </span>
      </div>
      <span className="font-sans font-semibold text-text text-lg tracking-tight">
        Pay<span className="text-primary">Vault</span>
      </span>
    </div>

    {/* Middle: Illustration / copy */}
    <div className="flex flex-col gap-8">
      {/* Mock wallet card */}
      <div
        className="relative w-full max-w-[320px] rounded-3xl p-6 overflow-hidden"
        style={{
          background:
            "linear-gradient(#1a1a1f, #1a1a1f) padding-box, linear-gradient(145deg, rgba(255,92,43,0.55) 0%, rgba(255,92,43,0.06) 45%, rgba(42,42,48,0.8) 100%) border-box",
          border: "1px solid transparent",
        }}
      >
        {/* Glow blob */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -right-10 -top-10 h-44 w-44 rounded-full bg-primary/20 blur-3xl"
        />

        <div className="relative z-10 space-y-4">
          <div className="space-y-0.5">
            <p className="font-sans text-[9px] font-medium uppercase tracking-widest text-muted">
              PayVault Account
            </p>
            <p className="font-mono text-sm font-semibold text-text tracking-wider">
              3022-456789
            </p>
          </div>

          <div className="space-y-0.5">
            <p className="font-sans text-[9px] font-medium uppercase tracking-widest text-muted">
              Available Balance
            </p>
            <div className="flex items-end gap-2">
              <p className="font-serif text-3xl leading-none text-text">
                ₦ 125,400.00
              </p>
              <span className="mb-0.5 flex items-center gap-1 pb-0.5">
                <span className="relative flex h-1.5 w-1.5">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-success opacity-60" />
                  <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-success" />
                </span>
                <span className="font-sans text-[9px] font-medium text-success/70 tracking-wide">
                  LIVE
                </span>
              </span>
            </div>
          </div>

          {/* Decorative circles */}
          <div
            aria-hidden="true"
            className="pointer-events-none absolute -bottom-5 -right-5 h-20 w-20 rounded-full border border-primary/10"
          />
        </div>
      </div>

      {/* Headline */}
      <div className="space-y-3">
        <h2 className="font-serif text-3xl xl:text-4xl leading-[1.2] text-text">
          Welcome back to{" "}
          <span className="text-primary">PayVault</span>
        </h2>
        <p className="font-sans text-sm text-muted leading-relaxed max-w-xs">
          Your balance is safe, your history is intact. Log in and pick up
          exactly where you left off.
        </p>
      </div>

      {/* Feature bullets */}
      <div className="flex flex-col gap-3">
        {[
          { icon: "⚡", text: "Instant peer-to-peer transfers" },
          { icon: "📊", text: "Real-time balance updates" },
          { icon: "🔒", text: "Bank-level security" },
          { icon: "🇳🇬", text: "Built natively for NGN" },
        ].map(({ icon, text }) => (
          <div key={text} className="flex items-center gap-3">
            <div
              className={cn(
                "flex h-8 w-8 shrink-0 items-center justify-center rounded-xl",
                "bg-primary/10 border border-primary/20 text-sm"
              )}
              aria-hidden="true"
            >
              {icon}
            </div>
            <span className="font-sans text-sm text-muted/80">{text}</span>
          </div>
        ))}
      </div>
    </div>

    {/* Bottom: Tagline */}
    <p className="font-sans text-xs text-muted/50 select-none">
      © 2025 PayVault. All rights reserved.
    </p>
  </div>
);

// ─── Login Page ───────────────────────────────────────────────────────────────

const Login: React.FC = () => {
  const navigate = useNavigate();
  const storeLogin = useAuthStore((s) => s.login);

  // ── Form state ────────────────────────────────────────────────────────────
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    mode: "onTouched",
    defaultValues: {
      email: "",
      password: "",
    },
  });

  // ── UI state ──────────────────────────────────────────────────────────────
  const [showPassword, setShowPassword] = React.useState(false);
  const [apiError, setApiError] = React.useState<string | null>(null);

  // ── Submit ────────────────────────────────────────────────────────────────
  const onSubmit = async (values: LoginFormValues) => {
    setApiError(null);
    try {
      const authResponse = await loginUser({
        email: values.email,
        password: values.password,
      });

      // Persist tokens + user info in Zustand (persisted to localStorage)
      storeLogin(authResponse);

      toast.success("Welcome back!", {
        description: `Logged in as ${authResponse.email}`,
      });

      navigate("/dashboard", { replace: true });
    } catch (err: unknown) {
      const raw = getApiErrorMessage(err);
      // Surface a user-friendly message for credential errors
      const message =
        raw.toLowerCase().includes("invalid") ||
        raw.toLowerCase().includes("credentials") ||
        raw.toLowerCase().includes("password") ||
        raw.toLowerCase().includes("email")
          ? "Invalid email or password. Please try again."
          : raw;
      setApiError(message);
    }
  };

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-background text-text font-sans antialiased">
      {/*
       * Split layout: form on the LEFT, brand panel on the RIGHT
       * (mirrored from Register which has brand left, form right)
       */}
      <div className="grid min-h-screen lg:grid-cols-2">

        {/* ── Left: Form panel ── */}
        <div className="flex flex-col items-center justify-center px-5 py-12 sm:px-8 lg:px-12 xl:px-16">
          {/* Mobile-only logo */}
          <div className="mb-10 flex items-center gap-2.5 select-none lg:hidden">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary shadow-glow-sm">
              <span className="font-serif font-bold text-white text-sm leading-none">
                PV
              </span>
            </div>
            <span className="font-sans font-semibold text-text text-base tracking-tight">
              Pay<span className="text-primary">Vault</span>
            </span>
          </div>

          {/* Form card */}
          <div className="w-full max-w-[440px] space-y-7">

            {/* Heading */}
            <div className="space-y-2">
              {/* Icon — desktop shows a wallet icon in a subtle orange orb */}
              <div className="hidden lg:flex mb-5">
                <div
                  className={cn(
                    "flex h-12 w-12 items-center justify-center rounded-2xl",
                    "bg-primary/10 border border-primary/20",
                    "shadow-[0_0_24px_rgba(255,92,43,0.15)]"
                  )}
                >
                  <Wallet className="h-5 w-5 text-primary" aria-hidden="true" />
                </div>
              </div>

              <h1 className="font-serif text-3xl text-text leading-tight">
                Log in to PayVault
              </h1>
              <p className="font-sans text-sm text-muted leading-relaxed">
                Don't have an account?{" "}
                <Link
                  to="/auth/register"
                  className="font-medium text-primary underline-offset-4 hover:underline focus-visible:outline-none focus-visible:underline"
                >
                  Create one free
                </Link>
              </p>
            </div>

            {/* ── Form ── */}
            <form
              onSubmit={handleSubmit(onSubmit)}
              noValidate
              className="space-y-5"
            >
              {/* Email */}
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

              {/* Password */}
              <div className="space-y-1.5">
                {/* Label row with "Forgot password?" on the right */}
                <div className="flex items-center justify-between gap-2">
                  <Label htmlFor="password" required>
                    Password
                  </Label>
                  <Link
                    to="/auth/forgot-password"
                    className={cn(
                      "font-sans text-xs font-medium text-muted",
                      "underline-offset-4 hover:text-primary hover:underline",
                      "transition-colors duration-150",
                      "focus-visible:outline-none focus-visible:underline"
                    )}
                    tabIndex={0}
                  >
                    Forgot password?
                  </Link>
                </div>

                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  autoComplete="current-password"
                  placeholder="Enter your password"
                  error={Boolean(errors.password)}
                  aria-describedby={
                    errors.password ? "password-error" : undefined
                  }
                  rightAdornment={
                    <button
                      type="button"
                      tabIndex={-1}
                      onClick={() => setShowPassword((v) => !v)}
                      aria-label={showPassword ? "Hide password" : "Show password"}
                      className={cn(
                        "flex items-center justify-center h-7 w-7 rounded-lg",
                        "text-muted border border-transparent",
                        "hover:text-text hover:bg-white/5 hover:border-border",
                        "transition-colors duration-150",
                        "focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary/60"
                      )}
                    >
                      {showPassword ? (
                        <EyeOff className="h-4 w-4" aria-hidden="true" />
                      ) : (
                        <Eye className="h-4 w-4" aria-hidden="true" />
                      )}
                    </button>
                  }
                  {...register("password")}
                />

                {errors.password && (
                  <p
                    id="password-error"
                    role="alert"
                    className="font-sans text-xs text-error leading-tight"
                  >
                    {errors.password.message}
                  </p>
                )}
              </div>

              {/* ── Inline API Error ── */}
              {apiError && (
                <div
                  role="alert"
                  aria-live="assertive"
                  className={cn(
                    "flex items-start gap-2.5 rounded-xl border border-error/30",
                    "bg-error/8 px-4 py-3 animate-fade-in"
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
                className="mt-1"
              >
                {isSubmitting ? "Logging in…" : "Log In"}
              </Button>
            </form>

            {/* Divider */}
            <div className="flex items-center gap-3">
              <div className="h-px flex-1 bg-border" />
              <span className="font-sans text-xs text-muted shrink-0">
                new here?
              </span>
              <div className="h-px flex-1 bg-border" />
            </div>

            {/* Create account CTA */}
            <Link
              to="/auth/register"
              className={cn(
                "flex w-full items-center justify-center gap-2",
                "h-11 rounded-xl border border-border",
                "font-sans text-sm font-medium text-muted",
                "bg-transparent",
                "hover:bg-white/[0.03] hover:border-[#3a3a42] hover:text-text",
                "active:scale-[0.98]",
                "transition-all duration-150 ease-out",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60 focus-visible:ring-offset-2 focus-visible:ring-offset-background"
              )}
            >
              Create a free account
            </Link>

            {/* Security note */}
            <p className="text-center font-sans text-xs text-muted/60 leading-relaxed">
              🔐 Your session is protected with JWT authentication
              and your password is encrypted with Argon2.
            </p>
          </div>
        </div>

        {/* ── Right: Brand panel ── */}
        <BrandPanel />
      </div>
    </div>
  );
};

export default Login;
