import * as React from "react";
import { NavLink, useNavigate } from "react-router-dom";
import {
  LayoutDashboard,
  ArrowLeftRight,
  List,
  Settings,
  LogOut,
  Menu,
  X,
  Wallet,
} from "lucide-react";
import { cn } from "../../lib/utils";
import { useAuthStore } from "../../store/authStore";
import { Button } from "../ui/button";

// ─── Nav Links Config ─────────────────────────────────────────────────────────

interface NavItem {
  label: string;
  to: string;
  icon: React.ElementType;
}

const NAV_ITEMS: NavItem[] = [
  { label: "Dashboard", to: "/dashboard", icon: LayoutDashboard },
  { label: "Transfer", to: "/transfer", icon: ArrowLeftRight },
  { label: "Transactions", to: "/transactions", icon: List },
  { label: "Settings", to: "/settings", icon: Settings },
];

// ─── Logo ─────────────────────────────────────────────────────────────────────

const Logo: React.FC<{ onClick?: () => void }> = ({ onClick }) => (
  <button
    type="button"
    onClick={onClick}
    className={cn(
      "flex items-center gap-2.5 select-none",
      "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60 rounded-xl p-1 -m-1"
    )}
    aria-label="PayVault home"
  >
    {/* Orange "PV" mark */}
    <div
      className={cn(
        "flex h-8 w-8 items-center justify-center rounded-lg",
        "bg-primary shadow-glow-sm",
        "shrink-0"
      )}
    >
      <span className="font-serif font-bold text-white text-sm leading-none select-none">
        PV
      </span>
    </div>

    {/* Wordmark */}
    <span className="font-sans font-semibold text-text text-base tracking-tight leading-none">
      Pay<span className="text-primary">Vault</span>
    </span>
  </button>
);

// ─── Desktop Nav Link ─────────────────────────────────────────────────────────

const DesktopNavLink: React.FC<{ item: NavItem }> = ({ item }) => {
  const Icon = item.icon;

  return (
    <NavLink
      to={item.to}
      className={({ isActive }) =>
        cn(
          "relative inline-flex items-center gap-2 px-3 py-2 rounded-xl",
          "font-sans text-sm font-medium",
          "transition-all duration-150 ease-out",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60",
          isActive
            ? [
                "text-primary",
                // Subtle underline indicator
                "after:absolute after:bottom-0 after:left-3 after:right-3 after:h-0.5",
                "after:rounded-full after:bg-primary",
              ]
            : [
                "text-muted",
                "hover:text-text hover:bg-white/[0.04]",
                "active:bg-white/[0.07]",
              ]
        )
      }
    >
      <Icon className="h-4 w-4 shrink-0" aria-hidden="true" />
      {item.label}
    </NavLink>
  );
};

// ─── Mobile Drawer Link ───────────────────────────────────────────────────────

const DrawerNavLink: React.FC<{ item: NavItem; onClose: () => void }> = ({
  item,
  onClose,
}) => {
  const Icon = item.icon;

  return (
    <NavLink
      to={item.to}
      onClick={onClose}
      className={({ isActive }) =>
        cn(
          "flex items-center gap-3.5 px-4 py-3.5 rounded-2xl",
          "font-sans text-base font-medium",
          "transition-all duration-150 ease-out",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60",
          isActive
            ? [
                "bg-primary/10 text-primary",
                "border border-primary/20",
              ]
            : [
                "text-muted border border-transparent",
                "hover:text-text hover:bg-white/[0.04] hover:border-border",
              ]
        )
      }
    >
      {({ isActive }) => (
        <>
          <div
            className={cn(
              "flex h-9 w-9 items-center justify-center rounded-xl border shrink-0",
              isActive
                ? "bg-primary/15 border-primary/30 text-primary"
                : "bg-surface border-border text-muted"
            )}
          >
            <Icon className="h-4.5 w-4.5" aria-hidden="true" />
          </div>
          {item.label}
        </>
      )}
    </NavLink>
  );
};

// ─── Mobile Drawer ────────────────────────────────────────────────────────────

interface MobileDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  userEmail: string | null | undefined;
  onLogout: () => void;
}

const MobileDrawer: React.FC<MobileDrawerProps> = ({
  isOpen,
  onClose,
  userEmail,
  onLogout,
}) => {
  // Close on Escape key
  React.useEffect(() => {
    if (!isOpen) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [isOpen, onClose]);

  // Prevent body scroll while drawer is open
  React.useEffect(() => {
    if (isOpen) {
      const prev = document.body.style.overflow;
      document.body.style.overflow = "hidden";
      return () => {
        document.body.style.overflow = prev;
      };
    }
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className={cn(
          "fixed inset-0 z-40",
          "bg-black/60 backdrop-blur-sm",
          "animate-fade-in"
        )}
        aria-hidden="true"
        onClick={onClose}
      />

      {/* Drawer panel */}
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Navigation menu"
        className={cn(
          "fixed inset-y-0 left-0 z-50",
          "flex w-[300px] flex-col",
          "bg-surface border-r border-border",
          "shadow-[8px_0_40px_rgba(0,0,0,0.6)]",
          "animate-slide-in"
        )}
      >
        {/* Drawer header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-border">
          <Logo onClick={onClose} />
          <button
            type="button"
            onClick={onClose}
            aria-label="Close navigation menu"
            className={cn(
              "flex h-8 w-8 items-center justify-center rounded-xl",
              "text-muted border border-transparent",
              "hover:bg-white/[0.04] hover:text-text hover:border-border",
              "transition-colors duration-150",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60"
            )}
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>

        {/* Nav links */}
        <nav
          className="flex flex-1 flex-col gap-1.5 overflow-y-auto px-4 py-5"
          aria-label="Main navigation"
        >
          {NAV_ITEMS.map((item) => (
            <DrawerNavLink key={item.to} item={item} onClose={onClose} />
          ))}
        </nav>

        {/* Drawer footer — user info + logout */}
        <div className="border-t border-border px-4 py-5 space-y-3">
          {/* User chip */}
          <div
            className={cn(
              "flex items-center gap-3 rounded-2xl px-3 py-3",
              "bg-background border border-border"
            )}
          >
            {/* Avatar placeholder */}
            <div
              className={cn(
                "flex h-9 w-9 shrink-0 items-center justify-center rounded-xl",
                "bg-primary/15 border border-primary/25"
              )}
              aria-hidden="true"
            >
              <Wallet className="h-4 w-4 text-primary" />
            </div>
            <div className="flex flex-col min-w-0">
              <span className="font-sans text-xs font-medium text-muted leading-tight">
                Signed in as
              </span>
              <span className="font-sans text-sm font-medium text-text truncate leading-tight">
                {userEmail ?? "—"}
              </span>
            </div>
          </div>

          {/* Logout */}
          <Button
            variant="destructive"
            size="md"
            fullWidth
            leftIcon={<LogOut className="h-4 w-4" aria-hidden="true" />}
            onClick={() => {
              onLogout();
              onClose();
            }}
          >
            Log Out
          </Button>
        </div>
      </div>
    </>
  );
};

// ─── NavBar ───────────────────────────────────────────────────────────────────

const NavBar: React.FC = () => {
  const navigate = useNavigate();
  const { user, logout } = useAuthStore();
  const [drawerOpen, setDrawerOpen] = React.useState(false);

  const handleLogout = () => {
    logout();
    navigate("/auth/login", { replace: true });
  };

  // Truncate email for display: "chukwuemeka@example.com" → "chukwuemeka@…"
  const truncatedEmail = React.useMemo(() => {
    const email = user?.email ?? "";
    if (!email) return "";
    const [local, domain] = email.split("@");
    if (!domain) return email;
    const shortLocal = local.length > 10 ? `${local.slice(0, 10)}…` : local;
    return `${shortLocal}@${domain}`;
  }, [user?.email]);

  return (
    <>
      <header
        className={cn(
          // Positioning
          "sticky top-0 z-30 w-full",
          // Visual
          "bg-background/90 backdrop-blur-md",
          "border-b border-border",
          // Subtle shadow
          "shadow-[0_1px_0_rgba(255,255,255,0.03)]"
        )}
      >
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">

          {/* ── Left: Logo ── */}
          <div className="flex items-center">
            <Logo onClick={() => navigate("/dashboard")} />
          </div>

          {/* ── Center: Desktop nav links ── */}
          <nav
            className="hidden md:flex items-center gap-1"
            aria-label="Main navigation"
          >
            {NAV_ITEMS.map((item) => (
              <DesktopNavLink key={item.to} item={item} />
            ))}
          </nav>

          {/* ── Right: User info + Logout (desktop) / Hamburger (mobile) ── */}
          <div className="flex items-center gap-2 sm:gap-3">
            {/* User email pill — desktop only */}
            {user?.email && (
              <div
                className={cn(
                  "hidden sm:flex items-center gap-2 rounded-xl px-3 py-1.5",
                  "bg-surface border border-border"
                )}
                title={user.email}
              >
                <div
                  className="h-2 w-2 rounded-full bg-success shrink-0"
                  aria-hidden="true"
                />
                <span className="font-sans text-xs font-medium text-muted max-w-[140px] truncate">
                  {truncatedEmail}
                </span>
              </div>
            )}

            {/* Logout button — desktop only */}
            <Button
              variant="ghost"
              size="sm"
              className="hidden md:inline-flex"
              leftIcon={<LogOut className="h-4 w-4" aria-hidden="true" />}
              onClick={handleLogout}
              aria-label="Log out"
            >
              Log Out
            </Button>

            {/* Hamburger — mobile only */}
            <button
              type="button"
              className={cn(
                "md:hidden",
                "flex h-9 w-9 items-center justify-center rounded-xl",
                "text-muted border border-border",
                "hover:bg-white/[0.04] hover:text-text hover:border-[#3a3a42]",
                "active:scale-95",
                "transition-all duration-150",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60"
              )}
              aria-label={drawerOpen ? "Close menu" : "Open menu"}
              aria-expanded={drawerOpen}
              aria-controls="mobile-nav-drawer"
              onClick={() => setDrawerOpen(true)}
            >
              <Menu className="h-5 w-5" aria-hidden="true" />
            </button>
          </div>
        </div>
      </header>

      {/* Mobile slide-in drawer */}
      <MobileDrawer
        isOpen={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        userEmail={user?.email}
        onLogout={handleLogout}
      />
    </>
  );
};

NavBar.displayName = "NavBar";

export { NavBar };
