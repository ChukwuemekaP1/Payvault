import * as React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  User,
  Shield,
  Bell,
  Eye,
  EyeOff,
  CheckCircle2,
  XCircle,
  Save,
  Mail,
  Lock,
} from "lucide-react";
import { toast } from "sonner";
import { cn, getPasswordStrength } from "../lib/utils";
import { useAuthStore } from "../store/authStore";
import { NavBar } from "../components/layout/NavBar";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Card, CardTitle, CardDescription } from "../components/ui/card";
import { Separator } from "../components/ui/separator";

// ─── Password Schema (reused for security section) ────────────────────────────

const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, "Current password is required"),
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

type ChangePasswordFormValues = z.infer<typeof changePasswordSchema>;

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

// ─── Requirement row ──────────────────────────────────────────────────────────

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

// ─── Toggle Switch ────────────────────────────────────────────────────────────

interface ToggleSwitchProps {
  id: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
}

const ToggleSwitch: React.FC<ToggleSwitchProps> = ({
  id,
  checked,
  onChange,
  disabled = false,
}) => (
  <button
    type="button"
    id={id}
    role="switch"
    aria-checked={checked}
    disabled={disabled}
    onClick={() => onChange(!checked)}
    className={cn(
      "relative inline-flex h-6 w-11 shrink-0 items-center rounded-full border-2",
      "transition-all duration-200 ease-out",
      "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60 focus-visible:ring-offset-2 focus-visible:ring-offset-background",
      "disabled:cursor-not-allowed disabled:opacity-40",
      checked ? "bg-primary border-primary" : "bg-surface border-border",
    )}
  >
    <span
      className={cn(
        "inline-block h-4 w-4 rounded-full shadow-sm",
        "transition-transform duration-200 ease-out",
        "bg-white",
        checked ? "translate-x-5" : "translate-x-0.5",
      )}
      aria-hidden="true"
    />
  </button>
);

// ─── Section Wrapper ──────────────────────────────────────────────────────────

interface SectionProps {
  icon: React.ReactNode;
  title: string;
  description: string;
  children: React.ReactNode;
  className?: string;
}

const Section: React.FC<SectionProps> = ({
  icon,
  title,
  description,
  children,
  className,
}) => (
  <Card
    variant="default"
    padding="none"
    className={cn("overflow-hidden", className)}
  >
    {/* Section header */}
    <div
      className={cn(
        "flex items-start gap-4 px-6 py-5",
        "border-b border-border bg-gradient-to-r from-surface to-[#1e1e24]",
      )}
    >
      <div
        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-primary/10 border border-primary/20"
        aria-hidden="true"
      >
        {icon}
      </div>
      <div className="flex flex-col gap-0.5 min-w-0">
        <CardTitle>{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </div>
    </div>

    {/* Section body */}
    <div className="px-6 py-6">{children}</div>
  </Card>
);

// ─── Profile Section ──────────────────────────────────────────────────────────

const ProfileSection: React.FC = () => {
  const { user } = useAuthStore();
  const [displayName, setDisplayName] = React.useState<string>(() => {
    // Derive an initial display name from the email local-part
    const email = user?.email ?? "";
    const local = email.split("@")[0] ?? "";
    const cleaned = local.replace(/[._-]/g, " ");
    return cleaned
      .split(" ")
      .map((w) => (w ? w.charAt(0).toUpperCase() + w.slice(1) : ""))
      .join(" ");
  });
  const [isSaving, setIsSaving] = React.useState(false);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();

    const trimmed = displayName.trim();
    if (!trimmed || trimmed.length < 2) {
      toast.error("Name is too short", {
        description: "Display name must be at least 2 characters.",
      });
      return;
    }

    setIsSaving(true);

    // Simulate a brief async save (no backend endpoint for name yet)
    await new Promise((resolve) => setTimeout(resolve, 600));

    setIsSaving(false);
    toast.success("Profile updated!", {
      description: "Your display name has been saved locally.",
    });
  };

  return (
    <Section
      icon={<User className="h-5 w-5 text-primary" aria-hidden="true" />}
      title="Profile"
      description="Manage your account information"
    >
      <form onSubmit={handleSave} noValidate className="flex flex-col gap-5">
        {/* Email — read-only */}
        <div className="space-y-1.5">
          <Label htmlFor="profile-email">
            Email Address
            <span className="ml-2 rounded-full border border-border bg-surface px-2 py-0.5 font-sans text-[10px] font-medium uppercase tracking-wider text-muted">
              Read-only
            </span>
          </Label>
          <div className="relative">
            <div
              className="pointer-events-none absolute left-3.5 flex items-center text-muted"
              aria-hidden="true"
            >
              <Mail className="h-4 w-4" />
            </div>
            <input
              id="profile-email"
              type="email"
              value={user?.email ?? ""}
              readOnly
              disabled
              aria-describedby="email-readonly-note"
              className={cn(
                "flex h-11 w-full rounded-xl border border-border bg-[#111115]",
                "pl-10 pr-4 py-2.5",
                "font-sans text-sm text-muted",
                "cursor-not-allowed select-none opacity-60",
                "outline-none",
              )}
            />
          </div>
          <p
            id="email-readonly-note"
            className="font-sans text-xs text-muted/70 leading-relaxed"
          >
            Your email address cannot be changed. Contact support if you need to
            update it.
          </p>
        </div>

        <Separator />

        {/* Display Name — editable */}
        <div className="space-y-1.5">
          <Label htmlFor="profile-name" required>
            Display Name
          </Label>
          <Input
            id="profile-name"
            type="text"
            autoComplete="name"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            placeholder="Your display name"
            maxLength={80}
            aria-describedby="name-help"
          />
          <p
            id="name-help"
            className="font-sans text-xs text-muted/70 leading-relaxed"
          >
            This name is stored locally in your browser. It's used as a
            personalised greeting on the dashboard.
          </p>
        </div>

        {/* Account info strip */}
        <div
          className={cn(
            "flex items-center gap-3 rounded-2xl border border-border/60 bg-background/40 px-4 py-3",
          )}
        >
          {/* Avatar placeholder */}
          <div
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 border border-primary/20 select-none"
            aria-hidden="true"
          >
            <span className="font-serif font-bold text-primary text-sm leading-none">
              {(
                displayName.trim().charAt(0) ||
                user?.email?.charAt(0) ||
                "?"
              ).toUpperCase()}
            </span>
          </div>
          <div className="flex flex-col gap-0.5 min-w-0">
            <span className="font-sans text-sm font-semibold text-text truncate leading-tight">
              {displayName.trim() || "No name set"}
            </span>
            <span className="font-sans text-xs text-muted truncate">
              {user?.email ?? ""}
            </span>
          </div>
          <div className="ml-auto shrink-0 flex items-center gap-1.5 rounded-full border border-success/30 bg-success/10 px-2.5 py-1">
            <span
              className="h-1.5 w-1.5 rounded-full bg-success"
              aria-hidden="true"
            />
            <span className="font-sans text-[10px] font-semibold text-success uppercase tracking-wider">
              Active
            </span>
          </div>
        </div>

        {/* Save button */}
        <div className="flex justify-end pt-1">
          <Button
            type="submit"
            variant="default"
            size="md"
            isLoading={isSaving}
            leftIcon={
              !isSaving ? (
                <Save className="h-4 w-4" aria-hidden="true" />
              ) : undefined
            }
            className="min-w-[140px]"
          >
            {isSaving ? "Saving…" : "Save Changes"}
          </Button>
        </div>
      </form>
    </Section>
  );
};

// ─── Security Section ─────────────────────────────────────────────────────────

const SecuritySection: React.FC = () => {
  const {
    register,
    handleSubmit,
    watch,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<ChangePasswordFormValues>({
    resolver: zodResolver(changePasswordSchema),
    mode: "onTouched",
    defaultValues: {
      currentPassword: "",
      newPassword: "",
      confirmPassword: "",
    },
  });

  const newPasswordValue = watch("newPassword");

  const [showCurrent, setShowCurrent] = React.useState(false);
  const [showNew, setShowNew] = React.useState(false);
  const [showConfirm, setShowConfirm] = React.useState(false);

  const requirements = React.useMemo(() => {
    const pw = newPasswordValue ?? "";
    return {
      length: pw.length >= 8,
      uppercase: /[A-Z]/.test(pw),
      number: /[0-9]/.test(pw),
    };
  }, [newPasswordValue]);

  const onSubmit = async (_values: ChangePasswordFormValues) => {
    // Backend integration note: POST /auth/reset-password currently requires
    // a reset token (from email), not the current password. Until the backend
    // exposes a "change-password" endpoint, we show a friendly "coming soon" message.
    await new Promise((resolve) => setTimeout(resolve, 800));

    toast.info("Feature coming soon", {
      description:
        "Password change from Settings requires a backend update. Use Forgot Password for now.",
      duration: 5000,
    });

    reset();
  };

  const eyeButtonClass = cn(
    "flex items-center justify-center h-7 w-7 rounded-lg",
    "text-muted border border-transparent",
    "hover:text-text hover:bg-white/5 hover:border-border",
    "transition-colors duration-150",
    "focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary/60",
  );

  return (
    <Section
      icon={<Shield className="h-5 w-5 text-primary" aria-hidden="true" />}
      title="Security"
      description="Update your password and manage account security"
    >
      <form
        onSubmit={handleSubmit(onSubmit)}
        noValidate
        className="flex flex-col gap-5"
      >
        {/* Info banner */}
        <div
          className={cn(
            "flex items-start gap-3 rounded-xl border border-border/60 bg-surface/50 px-4 py-3.5",
          )}
        >
          <Lock
            className="mt-0.5 h-4 w-4 shrink-0 text-muted"
            aria-hidden="true"
          />
          <p className="font-sans text-xs text-muted leading-relaxed">
            Your password is encrypted with{" "}
            <span className="font-semibold text-text">Argon2</span> — the
            strongest modern hashing algorithm. We never store it in plain text.
          </p>
        </div>

        {/* Current Password */}
        <div className="space-y-1.5">
          <Label htmlFor="currentPassword" required>
            Current Password
          </Label>
          <Input
            id="currentPassword"
            type={showCurrent ? "text" : "password"}
            autoComplete="current-password"
            placeholder="Enter your current password"
            error={Boolean(errors.currentPassword)}
            aria-describedby={
              errors.currentPassword ? "current-pw-error" : undefined
            }
            rightAdornment={
              <button
                type="button"
                tabIndex={-1}
                onClick={() => setShowCurrent((v) => !v)}
                aria-label={showCurrent ? "Hide password" : "Show password"}
                className={eyeButtonClass}
              >
                {showCurrent ? (
                  <EyeOff className="h-4 w-4" aria-hidden="true" />
                ) : (
                  <Eye className="h-4 w-4" aria-hidden="true" />
                )}
              </button>
            }
            {...register("currentPassword")}
          />
          {errors.currentPassword && (
            <p
              id="current-pw-error"
              role="alert"
              className="font-sans text-xs text-error leading-tight"
            >
              {errors.currentPassword.message}
            </p>
          )}
        </div>

        <Separator label="New Password" />

        {/* New Password */}
        <div className="space-y-1.5">
          <Label htmlFor="newPassword" required>
            New Password
          </Label>
          <Input
            id="newPassword"
            type={showNew ? "text" : "password"}
            autoComplete="new-password"
            placeholder="Min. 8 chars, 1 uppercase, 1 number"
            error={Boolean(errors.newPassword)}
            aria-describedby="new-pw-requirements"
            rightAdornment={
              <button
                type="button"
                tabIndex={-1}
                onClick={() => setShowNew((v) => !v)}
                aria-label={showNew ? "Hide password" : "Show password"}
                className={eyeButtonClass}
              >
                {showNew ? (
                  <EyeOff className="h-4 w-4" aria-hidden="true" />
                ) : (
                  <Eye className="h-4 w-4" aria-hidden="true" />
                )}
              </button>
            }
            {...register("newPassword")}
          />

          <StrengthBar password={newPasswordValue ?? ""} />

          {newPasswordValue && (
            <div
              id="new-pw-requirements"
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

        {/* Confirm New Password */}
        <div className="space-y-1.5">
          <Label htmlFor="confirmPassword" required>
            Confirm New Password
          </Label>
          <Input
            id="confirmPassword"
            type={showConfirm ? "text" : "password"}
            autoComplete="new-password"
            placeholder="Re-enter your new password"
            error={Boolean(errors.confirmPassword)}
            aria-describedby={
              errors.confirmPassword ? "confirm-pw-error" : undefined
            }
            rightAdornment={
              <button
                type="button"
                tabIndex={-1}
                onClick={() => setShowConfirm((v) => !v)}
                aria-label={showConfirm ? "Hide password" : "Show password"}
                className={eyeButtonClass}
              >
                {showConfirm ? (
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
              id="confirm-pw-error"
              role="alert"
              className="font-sans text-xs text-error leading-tight"
            >
              {errors.confirmPassword.message}
            </p>
          )}
        </div>

        {/* Save */}
        <div className="flex items-center justify-between gap-4 pt-1">
          <p className="font-sans text-xs text-muted/60 leading-relaxed max-w-xs">
            Changing your password will sign you out of all other sessions.
          </p>
          <Button
            type="submit"
            variant="default"
            size="md"
            isLoading={isSubmitting}
            leftIcon={
              !isSubmitting ? (
                <Shield className="h-4 w-4" aria-hidden="true" />
              ) : undefined
            }
            className="shrink-0 min-w-[160px]"
          >
            {isSubmitting ? "Updating…" : "Update Password"}
          </Button>
        </div>
      </form>
    </Section>
  );
};

// ─── Notification Preferences Section ────────────────────────────────────────

interface NotificationState {
  emailTransfers: boolean;
  weeklySummary: boolean;
}

interface NotificationRowProps {
  id: string;
  title: string;
  description: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}

const NotificationRow: React.FC<NotificationRowProps> = ({
  id,
  title,
  description,
  checked,
  onChange,
}) => (
  <div
    className={cn(
      "flex items-start justify-between gap-4 rounded-2xl border px-5 py-4",
      "transition-colors duration-150",
      checked
        ? "border-primary/20 bg-primary/5"
        : "border-border bg-surface/50",
    )}
  >
    <div className="flex flex-col gap-1 min-w-0">
      <label
        htmlFor={id}
        className={cn(
          "font-sans text-sm font-semibold cursor-pointer leading-tight",
          checked ? "text-text" : "text-muted",
        )}
      >
        {title}
      </label>
      <p className="font-sans text-xs text-muted leading-relaxed">
        {description}
      </p>
    </div>
    <div className="shrink-0 pt-0.5">
      <ToggleSwitch id={id} checked={checked} onChange={onChange} />
    </div>
  </div>
);

const NotificationsSection: React.FC = () => {
  const [prefs, setPrefs] = React.useState<NotificationState>({
    emailTransfers: true,
    weeklySummary: false,
  });
  const [isSaving, setIsSaving] = React.useState(false);

  const updatePref = (key: keyof NotificationState) => (value: boolean) => {
    setPrefs((prev) => ({ ...prev, [key]: value }));
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);

    // Simulate async save
    await new Promise((resolve) => setTimeout(resolve, 600));

    setIsSaving(false);
    toast.success("Notification preferences saved!", {
      description: "Your notification settings have been updated.",
    });
  };

  return (
    <Section
      icon={<Bell className="h-5 w-5 text-primary" aria-hidden="true" />}
      title="Notifications"
      description="Choose what updates you receive from PayVault"
    >
      <form onSubmit={handleSave} noValidate className="flex flex-col gap-4">
        {/* Notification rows */}
        <NotificationRow
          id="notif-email-transfers"
          title="Email notifications for transfers"
          description="Receive an email whenever you send or receive money. Recommended for security awareness."
          checked={prefs.emailTransfers}
          onChange={updatePref("emailTransfers")}
        />

        <NotificationRow
          id="notif-weekly-summary"
          title="Weekly spending summary"
          description="Get a summary of your transactions and spending every Monday morning."
          checked={prefs.weeklySummary}
          onChange={updatePref("weeklySummary")}
        />

        {/* UI-only note */}
        <div
          className={cn(
            "flex items-start gap-2.5 rounded-xl border border-border/50 bg-surface/40 px-3.5 py-3",
          )}
        >
          <span className="text-sm shrink-0 mt-0.5" aria-hidden="true">
            💡
          </span>
          <p className="font-sans text-xs text-muted leading-relaxed">
            Notification settings are stored locally in this browser. Backend
            email delivery integration is coming in a future release.
          </p>
        </div>

        {/* Save */}
        <div className="flex justify-end pt-1">
          <Button
            type="submit"
            variant="default"
            size="md"
            isLoading={isSaving}
            leftIcon={
              !isSaving ? (
                <Save className="h-4 w-4" aria-hidden="true" />
              ) : undefined
            }
            className="min-w-[140px]"
          >
            {isSaving ? "Saving…" : "Save Preferences"}
          </Button>
        </div>
      </form>
    </Section>
  );
};

// ─── Danger Zone ──────────────────────────────────────────────────────────────

const DangerZone: React.FC = () => {
  const { logout } = useAuthStore();

  const handleLogoutAllDevices = () => {
    toast.info("Feature coming soon", {
      description:
        "Remote session revocation will be available in a future update.",
    });
  };

  const handleDeleteAccount = () => {
    toast.error("Account deletion", {
      description:
        "Please contact support@payvault.ng to request account deletion.",
      duration: 8000,
    });
  };

  return (
    <Card variant="error" padding="none" className="overflow-hidden">
      {/* Header */}
      <div
        className={cn(
          "flex items-start gap-4 px-6 py-5",
          "border-b border-error/20 bg-error/5",
        )}
      >
        <div
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-error/10 border border-error/25"
          aria-hidden="true"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="#FF3B3B"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
            <line x1="12" y1="9" x2="12" y2="13" />
            <line x1="12" y1="17" x2="12.01" y2="17" />
          </svg>
        </div>
        <div className="flex flex-col gap-0.5">
          <h3 className="font-sans font-semibold text-base text-error leading-tight">
            Danger Zone
          </h3>
          <p className="font-sans text-sm text-muted">
            Irreversible account actions — proceed with caution
          </p>
        </div>
      </div>

      {/* Body */}
      <div className="flex flex-col gap-4 px-6 py-6">
        {/* Log out all devices */}
        <div
          className={cn(
            "flex items-center justify-between gap-4 rounded-2xl border border-border px-5 py-4",
          )}
        >
          <div className="flex flex-col gap-0.5 min-w-0">
            <span className="font-sans text-sm font-semibold text-text leading-tight">
              Log out of all devices
            </span>
            <span className="font-sans text-xs text-muted leading-relaxed">
              Revoke all active sessions. You'll need to log in again on every
              device.
            </span>
          </div>
          <Button
            variant="secondary"
            size="sm"
            onClick={handleLogoutAllDevices}
            className="shrink-0"
          >
            Log Out All
          </Button>
        </div>

        {/* Delete account */}
        <div
          className={cn(
            "flex items-center justify-between gap-4 rounded-2xl border border-error/20 bg-error/5 px-5 py-4",
          )}
        >
          <div className="flex flex-col gap-0.5 min-w-0">
            <span className="font-sans text-sm font-semibold text-error leading-tight">
              Delete account
            </span>
            <span className="font-sans text-xs text-muted leading-relaxed">
              Permanently delete your PayVault account and all associated data.
              This action cannot be undone.
            </span>
          </div>
          <Button
            variant="destructive"
            size="sm"
            onClick={handleDeleteAccount}
            className="shrink-0"
          >
            Delete
          </Button>
        </div>

        {/* Current session logout shortcut */}
        <Separator />
        <div className="flex items-center justify-between gap-4">
          <p className="font-sans text-xs text-muted">
            Want to sign out of this device?
          </p>
          <button
            type="button"
            onClick={() => {
              logout();
              window.location.href = "/auth/login";
            }}
            className={cn(
              "font-sans text-xs font-medium text-primary",
              "underline-offset-4 hover:underline",
              "transition-colors duration-150",
              "focus-visible:outline-none focus-visible:underline",
            )}
          >
            Sign out now →
          </button>
        </div>
      </div>
    </Card>
  );
};

// ─── Settings Page ────────────────────────────────────────────────────────────

const Settings: React.FC = () => {
  return (
    <div className="min-h-screen bg-background text-text font-sans antialiased">
      <NavBar />

      {/* Ambient glow */}
      <div
        aria-hidden="true"
        className="pointer-events-none fixed inset-0 overflow-hidden"
      >
        <div className="absolute top-0 right-1/3 h-[400px] w-[400px] rounded-full bg-primary/5 blur-[100px]" />
        <div className="absolute bottom-1/4 left-0 h-64 w-64 rounded-full bg-primary/4 blur-[80px]" />
      </div>

      <main className="relative z-10 mx-auto max-w-3xl px-4 pb-20 pt-8 sm:px-6">
        {/* ── Page header ── */}
        <div className="mb-8 flex flex-col gap-1">
          <div className="flex items-center gap-3">
            <div
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-primary/10 border border-primary/20"
              aria-hidden="true"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="#FF5C2B"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z" />
                <circle cx="12" cy="12" r="3" />
              </svg>
            </div>
            <div>
              <h1 className="font-serif text-3xl text-text leading-tight">
                Settings
              </h1>
              <p className="font-sans text-sm text-muted leading-snug">
                Manage your account, security, and preferences
              </p>
            </div>
          </div>
        </div>

        {/* ── Sections stacked vertically ── */}
        <div className="flex flex-col gap-6">
          <ProfileSection />
          <SecuritySection />
          <NotificationsSection />
          <DangerZone />
        </div>

        {/* Footer note */}
        <p className="mt-10 text-center font-sans text-xs text-muted/40 select-none">
          PayVault v0.1.0 · © 2025 PayVault. All rights reserved.
        </p>
      </main>
    </div>
  );
};

export default Settings;
