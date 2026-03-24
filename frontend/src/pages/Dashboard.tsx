import * as React from "react";
import { useNavigate, Link } from "react-router-dom";
import {
  ArrowUpRight,
  List,
  Settings,
  ChevronRight,
  Sparkles,
  BarChart3,
  Wallet,
} from "lucide-react";
import { cn } from "../lib/utils";
import { useBalance } from "../hooks/useBalance";
import { useTransactions } from "../hooks/useTransactions";
import { useAuthStore } from "../store/authStore";
import { NavBar } from "../components/layout/NavBar";
import { WalletCard } from "../components/common/WalletCard";
import {
  TransactionItem,
  TransactionItemSkeleton,
  TransactionEmptyState,
} from "../components/common/TransactionItem";
import { Card } from "../components/ui/card";

// ─── Quick Action Card ────────────────────────────────────────────────────────

interface QuickActionProps {
  icon: React.ReactNode;
  label: string;
  description: string;
  onClick: () => void;
  accent?: "primary" | "success" | "warning" | "muted";
}

const QuickActionCard: React.FC<QuickActionProps> = ({
  icon,
  label,
  description,
  onClick,
  accent = "primary",
}) => {
  const accentStyles: Record<NonNullable<QuickActionProps["accent"]>, string> = {
    primary: "bg-primary/10 border-primary/20 text-primary group-hover:bg-primary/15 group-hover:border-primary/35",
    success: "bg-success/10 border-success/20 text-success group-hover:bg-success/15 group-hover:border-success/35",
    warning: "bg-warning/10 border-warning/20 text-warning group-hover:bg-warning/15 group-hover:border-warning/35",
    muted:   "bg-surface border-border text-muted group-hover:bg-[#222228] group-hover:border-[#3a3a42]",
  };

  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "group relative flex flex-col items-start gap-3 rounded-2xl border border-border bg-surface p-4 sm:p-5",
        "text-left w-full",
        "hover:border-[#3a3a42] hover:bg-[#1e1e24]",
        "active:scale-[0.98]",
        "transition-all duration-150 ease-out",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60 focus-visible:ring-offset-2 focus-visible:ring-offset-background",
        "shadow-card hover:shadow-card-hover",
        "overflow-hidden"
      )}
    >
      {/* Subtle hover glow overlay */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300"
        style={{
          background:
            "radial-gradient(ellipse at top left, rgba(255,92,43,0.04) 0%, transparent 65%)",
        }}
      />

      {/* Icon */}
      <div
        className={cn(
          "relative z-10 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border transition-all duration-150",
          accentStyles[accent]
        )}
      >
        {icon}
      </div>

      {/* Text */}
      <div className="relative z-10 flex flex-col gap-0.5 min-w-0">
        <span className="font-sans text-sm font-semibold text-text leading-tight">
          {label}
        </span>
        <span className="font-sans text-xs text-muted leading-snug line-clamp-2">
          {description}
        </span>
      </div>

      {/* Arrow indicator */}
      <ChevronRight
        className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted/40 group-hover:text-muted transition-all duration-150 group-hover:translate-x-0.5"
        aria-hidden="true"
      />
    </button>
  );
};

// ─── Recent Transactions Section ──────────────────────────────────────────────

interface RecentTransactionsProps {
  currentUserId: string | undefined;
}

const RecentTransactions: React.FC<RecentTransactionsProps> = ({
  currentUserId,
}) => {
  const { data, isLoading, isError, error } = useTransactions({
    page: 1,
    limit: 5,
  });

  const transactions = data?.transactions ?? [];

  return (
    <section aria-labelledby="recent-activity-heading">
      {/* Section header */}
      <div className="flex items-center justify-between gap-4 mb-4">
        <h2
          id="recent-activity-heading"
          className="font-sans text-base font-semibold text-text"
        >
          Recent Activity
        </h2>

        <Link
          to="/transactions"
          className={cn(
            "inline-flex items-center gap-1 font-sans text-sm font-medium text-primary",
            "underline-offset-4 hover:underline",
            "transition-colors duration-150",
            "focus-visible:outline-none focus-visible:underline"
          )}
        >
          View all
          <ChevronRight className="h-3.5 w-3.5" aria-hidden="true" />
        </Link>
      </div>

      {/* Card wrapper */}
      <div
        className={cn(
          "rounded-2xl border border-border bg-surface overflow-hidden",
          "shadow-card"
        )}
      >
        {/* Loading state */}
        {isLoading && (
          <div role="status" aria-label="Loading recent transactions">
            {Array.from({ length: 3 }).map((_, i) => (
              <TransactionItemSkeleton key={i} />
            ))}
            <span className="sr-only">Loading recent transactions…</span>
          </div>
        )}

        {/* Error state */}
        {isError && !isLoading && (
          <div className="flex flex-col items-center gap-3 px-6 py-10 text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-error/10 border border-error/25">
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
                <circle cx="12" cy="12" r="10" />
                <line x1="12" y1="8" x2="12" y2="12" />
                <line x1="12" y1="16" x2="12.01" y2="16" />
              </svg>
            </div>
            <div className="space-y-1">
              <p className="font-sans text-sm font-medium text-text">
                Could not load transactions
              </p>
              <p className="font-sans text-xs text-muted leading-relaxed max-w-xs">
                {error?.message ?? "Please try refreshing the page."}
              </p>
            </div>
          </div>
        )}

        {/* Empty state */}
        {!isLoading && !isError && transactions.length === 0 && (
          <TransactionEmptyState message="No transactions yet" />
        )}

        {/* Transaction list */}
        {!isLoading && !isError && transactions.length > 0 && (
          <ul role="list" aria-label="Recent transactions">
            {transactions.map((tx) => (
              <li key={tx.id}>
                <TransactionItem
                  transaction={tx}
                  currentUserId={currentUserId}
                  showStatus={false}
                  showFullDate={false}
                  clickable
                />
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
};

// ─── Stats Strip ─────────────────────────────────────────────────────────────

const StatsStrip: React.FC = () => {
  const { data: balance } = useBalance();

  return (
    <div className="grid grid-cols-3 divide-x divide-border rounded-2xl border border-border bg-surface overflow-hidden shadow-card">
      {[
        {
          label: "Account Status",
          value: "Active",
          valueClass: "text-success",
          icon: (
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-success opacity-50" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-success" />
            </span>
          ),
        },
        {
          label: "Account Number",
          value: balance?.account_number
            ? balance.account_number.slice(0, 4) + "…"
            : "—",
          valueClass: "text-text font-mono",
          icon: null,
        },
        {
          label: "Currency",
          value: "NGN ₦",
          valueClass: "text-primary",
          icon: null,
        },
      ].map(({ label, value, valueClass, icon }) => (
        <div
          key={label}
          className="flex flex-col items-center justify-center gap-1.5 p-4 text-center"
        >
          <div className="flex items-center gap-1.5">
            {icon}
            <span
              className={cn(
                "font-sans text-sm font-semibold leading-none",
                valueClass
              )}
            >
              {value}
            </span>
          </div>
          <span className="font-sans text-[10px] text-muted uppercase tracking-wider select-none">
            {label}
          </span>
        </div>
      ))}
    </div>
  );
};

// ─── Welcome Banner ────────────────────────────────────────────────────────────

interface WelcomeBannerProps {
  email: string | undefined;
}

const WelcomeBanner: React.FC<WelcomeBannerProps> = ({ email }) => {
  const firstName = React.useMemo(() => {
    if (!email) return "";
    const local = email.split("@")[0] ?? "";
    // Capitalise first character, strip numbers/symbols
    const cleaned = local.replace(/[^a-zA-Z]/g, "");
    if (!cleaned) return "";
    return cleaned.charAt(0).toUpperCase() + cleaned.slice(1);
  }, [email]);

  const greeting = React.useMemo(() => {
    const hour = new Date().getHours();
    if (hour < 12) return "Good morning";
    if (hour < 17) return "Good afternoon";
    return "Good evening";
  }, []);

  return (
    <div className="flex items-center justify-between gap-4">
      <div className="flex flex-col gap-1">
        <h1 className="font-serif text-2xl sm:text-3xl text-text leading-tight">
          {greeting}
          {firstName ? (
            <>
              ,{" "}
              <span className="text-primary">{firstName}</span>
            </>
          ) : (
            ""
          )}{" "}
          👋
        </h1>
        <p className="font-sans text-sm text-muted leading-relaxed">
          Here's an overview of your PayVault wallet.
        </p>
      </div>

      {/* Sparkle accent — purely decorative */}
      <div
        className="shrink-0 hidden sm:flex h-10 w-10 items-center justify-center rounded-2xl bg-primary/10 border border-primary/20"
        aria-hidden="true"
      >
        <Sparkles className="h-4.5 w-4.5 text-primary" />
      </div>
    </div>
  );
};

// ─── Dashboard ────────────────────────────────────────────────────────────────

const Dashboard: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const { data: balance, isLoading: balanceLoading } = useBalance();

  const quickActions = [
    {
      icon: <ArrowUpRight className="h-5 w-5" aria-hidden="true" />,
      label: "Send Money",
      description: "Transfer funds to any PayVault account instantly",
      onClick: () => navigate("/transfer"),
      accent: "primary" as const,
    },
    {
      icon: <List className="h-5 w-5" aria-hidden="true" />,
      label: "Transactions",
      description: "View your full transaction history",
      onClick: () => navigate("/transactions"),
      accent: "success" as const,
    },
    {
      icon: <Settings className="h-5 w-5" aria-hidden="true" />,
      label: "Settings",
      description: "Manage your profile and security",
      onClick: () => navigate("/settings"),
      accent: "muted" as const,
    },
    {
      icon: <BarChart3 className="h-5 w-5" aria-hidden="true" />,
      label: "Analytics",
      description: "Spending insights — coming soon",
      onClick: () => {},
      accent: "warning" as const,
    },
  ];

  return (
    <div className="min-h-screen bg-background text-text font-sans antialiased">
      <NavBar />

      {/* Page wrapper */}
      <main className="mx-auto max-w-7xl px-4 pb-16 pt-8 sm:px-6 lg:px-8">

        {/* ── Welcome banner ── */}
        <div className="mb-8">
          <WelcomeBanner email={user?.email} />
        </div>

        {/* ── Main two-column grid ── */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-5 xl:grid-cols-3">

          {/* ── Left column: Wallet card + stats ── */}
          <div className="flex flex-col gap-5 lg:col-span-3 xl:col-span-2">

            {/* Wallet card */}
            <WalletCard
              balance={balance}
              isLoading={balanceLoading}
              enableStream
            />

            {/* Stats strip */}
            <StatsStrip />

            {/* Recent Transactions — shown below wallet on mobile,
                also visible in this column on desktop */}
            <div className="lg:hidden">
              <RecentTransactions currentUserId={user?.user_id} />
            </div>
          </div>

          {/* ── Right column: Quick actions + recent transactions (desktop) ── */}
          <div className="flex flex-col gap-5 lg:col-span-2 xl:col-span-1">

            {/* Quick actions header */}
            <div className="flex items-center justify-between">
              <h2 className="font-sans text-base font-semibold text-text">
                Quick Actions
              </h2>
            </div>

            {/* Quick action cards grid */}
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-2">
              {quickActions.map((action) => (
                <QuickActionCard key={action.label} {...action} />
              ))}
            </div>

            {/* Wallet info card — desktop sidebar supplement */}
            <Card variant="outlined" padding="md" className="hidden lg:block">
              <div className="flex flex-col gap-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary/10 border border-primary/20">
                    <Wallet className="h-4 w-4 text-primary" aria-hidden="true" />
                  </div>
                  <div className="flex flex-col gap-0.5">
                    <span className="font-sans text-sm font-semibold text-text leading-tight">
                      PayVault Wallet
                    </span>
                    <span className="font-sans text-xs text-muted">
                      Your digital wallet
                    </span>
                  </div>
                </div>

                <div className="flex flex-col gap-2">
                  {[
                    { label: "Instant P2P transfers", icon: "⚡" },
                    { label: "Real-time balance updates", icon: "📊" },
                    { label: "Bank-level encryption", icon: "🔐" },
                    { label: "NGN native currency", icon: "🇳🇬" },
                  ].map(({ label, icon }) => (
                    <div key={label} className="flex items-center gap-2.5">
                      <span className="text-sm" aria-hidden="true">{icon}</span>
                      <span className="font-sans text-xs text-muted">{label}</span>
                    </div>
                  ))}
                </div>
              </div>
            </Card>

            {/* Recent transactions — desktop only (shown in right column) */}
            <div className="hidden lg:block">
              <RecentTransactions currentUserId={user?.user_id} />
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default Dashboard;
