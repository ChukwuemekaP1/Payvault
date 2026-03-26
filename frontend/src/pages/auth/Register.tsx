import * as React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useNavigate, Link } from "react-router-dom";
import { Eye, EyeOff, ArrowRight, CheckCircle2, XCircle } from "lucide-react";
import { toast } from "sonner";
import { cn, getPasswordStrength } from "../../lib/utils";
import { registerUser, getApiErrorMessage } from "../../lib/api";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { Label } from "../../components/ui/label";

// ─── Zod Schema ───────────────────────────────────────────────────────────────

const registerSchema = z
  .object({
    name: z
      .string()
      .min(2, "Full name must be at least 2 characters")
      .max(80, "Full name must be 80 characters or fewer")
      .regex(/^[a-zA-Z\s'-]+$/, "Name may only contain letters, spaces, hyphens, and apostrophes"),
    email: z
      .string()
      .min(1, "Email is required")
      .email("Please enter a valid email address")
      .max(255, "Email must be 255 characters or fewer"),
    password: z
      .string()
      .min(8, "Password must be at least 8 characters")
      .max(128, "Password must be 128 characters or fewer")
      .regex(/[A-Z]/, "Password must contain at least one uppercase letter")
      .regex(/[0-9]/, "Password must contain at least one number"),
    confirmPassword: z.string().min(1, "Please confirm your password"),
  })
  .refine((data) => data.password === data.confirmPassword, {
    path: ["confirmPassword"],
    message: "Passwords do not match",
  });

type RegisterFormValues = z.infer<typeof registerSchema>;

// ─── Password Strength Bar ─────────────────────────────────────────────────────

interface StrengthBarProps {
  password: string;
}

const StrengthBar: React.FC<StrengthBarProps> = ({ password }) => {
  const { score, label, color } = getPasswordStrength(password);

  if (!password) return null;

  const segments = 4;

  return (
    <div className="mt-2 space-y-1.5">
      {/* Bar segments */}
      <div className="flex gap-1" role="progressbar" aria-valuenow={score} aria-valuemin={0} aria-valuemax={4} aria-label={`Password strength: ${label}`}>
        {Array.from({ length: segments }).map((_, i) => (
          <div
            key={i}
            className={cn(
              "h-1 flex-1 rounded-full transition-all duration-300 ease-out",
              i < score ? "opacity-100" : "bg-[#2a2a30] opacity-100"
            )}
            style={i < score ? { backgroundColor: color } : undefined}
          />
        ))}
      </div>

      {/* Label */}
      <p
        className="font-sans text-xs font-medium transition-colors duration-200"
        style={{ color: color || "#6b6872" }}
      >
        {label || "Enter a password"}
      </p>
    </div>
  );
};

// ─── Password Requirement Item ────────────────────────────────────────────────

interface RequirementProps {
  met: boolean;
  label: string;
}

const Requirement: React.FC<RequirementProps> = ({ met, label }) => (
  <div className="flex items-center gap-1.5">
    {met ? (
      <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-success" aria-hidden="true" />
    ) : (
      <XCircle className="h-3.5 w-3.5 shrink-0 text-muted" aria-hidden="true" />
    )}
    <span
      className={cn(
        "font-sans text-xs transition-colors duration-200",
        met ? "text-success" : "text-muted"
      )}
    >
      {label}
    </span>
  </div>
);

// ─── Brand Panel (Left Side) ──────────────────────────────────────────────────

const BrandPanel: React.FC = () => (
  <div
    className="hidden lg:flex flex-col justify-between p-12 xl:p-16"
    style={{
      background: "linear-gradient(145deg, #1a1108 0%, #2a1800 30%, #1a0d00 60%, #0d0d0f 100%)",
    }}
  >
    {/* Top: Logo */}
    <div className="flex items-center gap-3 select-none">
      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary shadow-glow">
        <span className="font-serif font-bold text-white text-base leading-none">PV</span>
      </div>
      <span className="font-sans font-semibold text-text text-lg tracking-tight">
        Pay<span className="text-primary">Vault</span>
      </span>
    </div>

    {/* Middle: Main copy */}
    <div className="flex flex-col gap-6">
      {/* Decorative quote mark */}
      <div
        className="font-serif text-[120px] leading-none text-primary/15 select-none -mb-8"
        aria-hidden="true"
      >
        "
      </div>

      <h2 className="font-serif text-4xl xl:text-5xl leading-[1.15] text-text">
        The wallet built{" "}
        <span className="text-primary">for the pace</span>{" "}
        of Nigerian life.
      </h2>

      <p className="font-sans text-base text-muted leading-relaxed max-w-sm">
        Send money in seconds, track every naira with live updates, and rest easy
        knowing your funds are protected by bank-level security.
      </p>

      {/* Trust bullets */}
      <div className="flex flex-col gap-3 pt-2">
        {[
          "🔐  Argon2 password encryption",
          "⚡  Instant peer-to-peer transfers",
          "📊  Real-time balance via SSE",
          "🇳🇬  Built natively for NGN",
        ].map((item) => (
          <div key={item} className="flex items-center gap-2.5">
            <div className="h-px w-4 bg-primary/40 shrink-0" />
            <span className="font-sans text-sm text-muted/80">{item}</span>
          </div>
        ))}
      </div>
    </div>

    {/* Bottom: Social proof */}
    <div className="flex items-center gap-4 rounded-2xl border border-border/40 bg-white/[0.02] px-5 py-4">
      {/* Avatars stack */}
      <div className="flex -space-x-2 shrink-0">
        {["#FF5C2B", "#00C97A", "#FFB800", "#a855f7"].map((bg) => (
          <div
            key={bg}
            className="h-8 w-8 rounded-full border-2 border-[#1a0d00]"
            style={{ backgroundColor: bg, opacity: 0.8 }}
            aria-hidden="true"
          />
        ))}
      </div>
      <div>
        <p className="font-sans text-sm font-semibold text-text leading-tight">
          10,000+ users trust PayVault
        </p>
        <p className="font-sans text-xs text-muted mt-0.5">
          ₦500M+ transferred and counting
        </p>
      </div>
    </div>
  </div>
);

// ─── Register Page ─────────────────────────────────────────────────────────────

const Register: React.FC = () => {
  const navigate = useNavigate();

  // ── Form state ────────────────────────────────────────────────────────────
  const {
    register,
    handleSubmit,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<RegisterFormValues>({
    resolver: zodResolver(registerSchema),
    mode: "onTouched", // validate on blur then keep live
    defaultValues: {
      name: "",
      email: "",
      password: "",
      confirmPassword: "",
    },
  });

  // Watch live password value for the strength bar + requirements checklist
  const passwordValue = watch("password");

  // ── UI state ──────────────────────────────────────────────────────────────
  const [showPassword, setShowPassword] = React.useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = React.useState(false);
  const [apiError, setApiError] = React.useState<string | null>(null);

  // Computed password requirements
  const requirements = React.useMemo(() => {
    const pw = passwordValue ?? "";
    return {
      length: pw.length >= 8,
      uppercase: /[A-Z]/.test(pw),
      number: /[0-9]/.test(pw),
    };
  }, [passwordValue]);

  // ── Submit ────────────────────────────────────────────────────────────────
  const onSubmit = async (values: RegisterFormValues) => {
    setApiError(null);
    try {
      await registerUser({
        email: values.email,
        password: values.password,
        name: values.name,
      });

      toast.success("Account created!", {
        description: "Please check your email for the verification code.",
      });

      // Auto-login with the registered credentials
      const { loginUser } = await import("../../lib/api");
      const authResponse = await loginUser({
        email: values.email,
        password: values.password,
      });

      // Store tokens in auth store using the login method
      const { useAuthStore } = await import("../../store/authStore");
      const authStore = useAuthStore.getState();
      authStore.login({
        user_id: authResponse.user_id,
        email: authResponse.email,
        access_token: authResponse.access_token,
        refresh_token: authResponse.refresh_token,
      });

      // Pass the email to the verify-email page so it can display it
      navigate("/auth/verify-email", {
        state: { email: values.email },
      });
    } catch (err: unknown) {
      const message = getApiErrorMessage(err);
      setApiError(message);
    }
  };

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-background text-text font-sans antialiased">
      <div className="grid min-h-screen lg:grid-cols-2">
        {/* ── Left: Brand panel ── */}
        <BrandPanel />

        {/* ── Right: Form panel ── */}
        <div className="flex flex-col items-center justify-center px-5 py-12 sm:px-8 lg:px-12 xl:px-16">
          {/* Mobile-only logo */}
          <div className="mb-10 flex items-center gap-2.5 select-none lg:hidden">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary shadow-glow-sm">
              <span className="font-serif font-bold text-white text-sm leading-none">PV</span>
            </div>
            <span className="font-sans font-semibold text-text text-base tracking-tight">
              Pay<span className="text-primary">Vault</span>
            </span>
          </div>

          {/* Form card */}
          <div className="w-full max-w-[440px] space-y-7">
            {/* Heading */}
            <div className="space-y-2">
              <h1 className="font-serif text-3xl text-text leading-tight">
                Create your account
              </h1>
              <p className="font-sans text-sm text-muted leading-relaxed">
                Already have an account?{" "}
                <Link
                  to="/auth/login"
                  className="font-medium text-primary underline-offset-4 hover:underline focus-visible:outline-none focus-visible:underline"
                >
                  Log in
                </Link>
              </p>
            </div>

            {/* ── API Error Banner ── */}
            {apiError && (
              <div
                role="alert"
                className={cn(
                  "flex items-start gap-3 rounded-xl border border-error/30 bg-error/8 px-4 py-3.5",
                  "animate-fade-in"
                )}
              >
                <XCircle
                  className="mt-0.5 h-4 w-4 shrink-0 text-error"
                  aria-hidden="true"
                />
                <p className="font-sans text-sm text-error leading-snug">{apiError}</p>
              </div>
            )}

            {/* ── Form ── */}
            <form
              onSubmit={handleSubmit(onSubmit)}
              noValidate
              className="space-y-5"
            >
              {/* Full Name */}
              <div className="space-y-1.5">
                <Label htmlFor="name" required>
                  Full Name
                </Label>
                <Input
                  id="name"
                  type="text"
                  autoComplete="name"
                  placeholder="Chukwuemeka Okonkwo"
                  error={Boolean(errors.name)}
                  aria-describedby={errors.name ? "name-error" : undefined}
                  {...register("name")}
                />
                {errors.name && (
                  <p
                    id="name-error"
                    role="alert"
                    className="font-sans text-xs text-error leading-tight"
                  >
                    {errors.name.message}
                  </p>
                )}
              </div>

              {/* Email */}
              <div className="space-y-1.5">
                <Label htmlFor="email" required>
                  Email Address
                </Label>
                <Input
                  id="email"
                  type="email"
                  autoComplete="email"
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
                <Label htmlFor="password" required>
                  Password
                </Label>
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  autoComplete="new-password"
                  placeholder="Min. 8 chars, 1 uppercase, 1 number"
                  error={Boolean(errors.password)}
                  aria-describedby="password-requirements"
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

                {/* Strength bar */}
                <StrengthBar password={passwordValue ?? ""} />

                {/* Requirements checklist */}
                {passwordValue && (
                  <div
                    id="password-requirements"
                    className="mt-2 flex flex-col gap-1.5 rounded-xl border border-border bg-surface/60 px-3.5 py-3"
                  >
                    <Requirement met={requirements.length} label="At least 8 characters" />
                    <Requirement met={requirements.uppercase} label="At least one uppercase letter (A-Z)" />
                    <Requirement met={requirements.number} label="At least one number (0-9)" />
                  </div>
                )}

                {errors.password && (
                  <p
                    role="alert"
                    className="font-sans text-xs text-error leading-tight"
                  >
                    {errors.password.message}
                  </p>
                )}
              </div>

              {/* Confirm Password */}
              <div className="space-y-1.5">
                <Label htmlFor="confirmPassword" required>
                  Confirm Password
                </Label>
                <Input
                  id="confirmPassword"
                  type={showConfirmPassword ? "text" : "password"}
                  autoComplete="new-password"
                  placeholder="Re-enter your password"
                  error={Boolean(errors.confirmPassword)}
                  aria-describedby={
                    errors.confirmPassword ? "confirm-password-error" : undefined
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
                        "focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary/60"
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

              {/* Terms notice */}
              <p className="font-sans text-xs text-muted leading-relaxed">
                By creating an account you agree to our{" "}
                <span className="text-primary cursor-default">Terms of Service</span>{" "}
                and{" "}
                <span className="text-primary cursor-default">Privacy Policy</span>.
              </p>

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
                {isSubmitting ? "Creating account…" : "Create Account"}
              </Button>
            </form>

            {/* Divider + login link (repeated at bottom for UX) */}
            <div className="flex items-center gap-3">
              <div className="h-px flex-1 bg-border" />
              <span className="font-sans text-xs text-muted shrink-0">or</span>
              <div className="h-px flex-1 bg-border" />
            </div>

            <p className="text-center font-sans text-sm text-muted">
              Already have an account?{" "}
              <Link
                to="/auth/login"
                className="font-semibold text-text underline-offset-4 hover:text-primary hover:underline transition-colors duration-150 focus-visible:outline-none focus-visible:underline"
              >
                Log in to PayVault
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Register;
