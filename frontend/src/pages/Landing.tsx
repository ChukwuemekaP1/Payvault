import * as React from "react";
import { useNavigate } from "react-router-dom";
import { ArrowRight, ArrowUpRight, ArrowDownLeft, Wifi } from "lucide-react";
import { cn } from "../lib/utils";
import { Button } from "../components/ui/button";

// ─── Logo ─────────────────────────────────────────────────────────────────────

const Logo: React.FC = () => (
  <div className="flex items-center gap-2.5 select-none">
    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary shadow-glow-sm shrink-0">
      <span className="font-serif font-bold text-white text-sm leading-none">
        PV
      </span>
    </div>
    <span className="font-sans font-semibold text-text text-base tracking-tight leading-none">
      Pay<span className="text-primary">Vault</span>
    </span>
  </div>
);

// ─── Floating Wallet Card Mockup ──────────────────────────────────────────────

const WalletMockup: React.FC = () => {
  const [visible, setVisible] = React.useState(false);

  React.useEffect(() => {
    const t = setTimeout(() => setVisible(true), 200);
    return () => clearTimeout(t);
  }, []);

  return (
    <div
      className={cn(
        "relative transition-all duration-700 ease-out",
        visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8",
      )}
    >
      {/* Ambient glow */}
      <div
        aria-hidden="true"
        className="absolute -inset-8 rounded-[48px] bg-primary/20 blur-3xl opacity-70 pointer-events-none"
      />
      <div
        aria-hidden="true"
        className="absolute -inset-4 rounded-[40px] bg-primary/10 blur-2xl opacity-50 pointer-events-none"
      />

      {/* Card */}
      <div
        className="relative w-[320px] sm:w-[360px] rounded-3xl overflow-hidden"
        style={{
          background:
            "linear-gradient(#1a1a1f, #1a1a1f) padding-box, linear-gradient(145deg, rgba(255,92,43,0.6) 0%, rgba(255,92,43,0.08) 40%, rgba(42,42,48,0.9) 100%) border-box",
          border: "1px solid transparent",
        }}
        aria-label="PayVault wallet card preview"
      >
        {/* Decorative top-right glow blob */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -right-10 -top-10 h-48 w-48 rounded-full bg-primary/25 blur-3xl"
        />

        <div className="relative z-10 p-6 space-y-5">
          {/* Top row */}
          <div className="flex items-start justify-between">
            <div className="space-y-1">
              <p className="font-sans text-[10px] font-medium uppercase tracking-widest text-muted">
                PayVault Account
              </p>
              <p className="font-mono text-sm font-semibold text-text tracking-wider">
                3022-456789
              </p>
            </div>
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/15 border border-primary/25">
              <span className="font-serif font-bold text-primary text-xs">
                PV
              </span>
            </div>
          </div>

          {/* Balance */}
          <div className="space-y-1">
            <p className="font-sans text-[10px] font-medium uppercase tracking-widest text-muted">
              Available Balance
            </p>
            <div className="flex items-end gap-2">
              <p className="font-serif text-4xl leading-none text-text">
                ₦ 125,400.00
              </p>
              {/* Live dot */}
              <span className="mb-1 flex items-center gap-1.5 pb-0.5">
                <span className="relative flex h-2 w-2">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-success opacity-60" />
                  <span className="relative inline-flex h-2 w-2 rounded-full bg-success" />
                </span>
                <span className="font-sans text-[9px] font-medium text-success/70 tracking-wide">
                  LIVE
                </span>
              </span>
            </div>
          </div>

          {/* Mini transactions */}
          <div className="space-y-2 rounded-2xl bg-black/20 border border-white/[0.05] p-3">
            {/* Row 1 */}
            <div className="flex items-center gap-2.5">
              <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-success/10 border border-success/25">
                <ArrowDownLeft className="h-3.5 w-3.5 text-success" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-sans text-xs font-medium text-text truncate">
                  From: Paystack
                </p>
                <p className="font-mono text-[10px] text-muted">TXN-2026…</p>
              </div>
              <span className="font-mono text-xs font-semibold text-success shrink-0">
                +₦ 50,000
              </span>
            </div>

            {/* Divider */}
            <div className="h-px bg-white/[0.05]" />

            {/* Row 2 */}
            <div className="flex items-center gap-2.5">
              <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary/10 border border-primary/25">
                <ArrowUpRight className="h-3.5 w-3.5 text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-sans text-xs font-medium text-text truncate">
                  To: 0123-456789
                </p>
                <p className="font-mono text-[10px] text-muted">TXN-2025…</p>
              </div>
              <span className="font-mono text-xs font-semibold text-primary shrink-0">
                -₦ 12,000
              </span>
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex gap-2.5 pt-1">
            <div className="flex flex-1 items-center justify-center gap-1.5 h-9 rounded-xl border border-primary text-primary bg-transparent text-xs font-sans font-medium">
              <ArrowDownLeft className="h-3.5 w-3.5" />
              Fund Wallet
            </div>
            <div className="flex flex-1 items-center justify-center gap-1.5 h-9 rounded-xl bg-primary text-white text-xs font-sans font-medium">
              <ArrowUpRight className="h-3.5 w-3.5" />
              Send Money
            </div>
          </div>
        </div>

        {/* Decorative circles */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -bottom-6 -right-6 h-24 w-24 rounded-full border border-primary/10"
        />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -bottom-3 -right-3 h-14 w-14 rounded-full border border-primary/[0.07]"
        />
      </div>

      {/* Floating notification bubble */}
      <div
        className={cn(
          "absolute -top-4 -right-6 sm:-right-10",
          "flex items-center gap-2 rounded-2xl border border-border px-3 py-2",
          "bg-surface shadow-card backdrop-blur-sm",
          "transition-all duration-1000 ease-out delay-500",
          visible ? "opacity-100 translate-y-0" : "opacity-0 -translate-y-4",
        )}
      >
        <span className="text-base" aria-hidden="true">
          💸
        </span>
        <div>
          <p className="font-sans text-[11px] font-semibold text-text leading-tight">
            Transfer Sent!
          </p>
          <p className="font-sans text-[10px] text-muted">
            ₦ 12,000 → 0123-456789
          </p>
        </div>
      </div>

      {/* Floating SSE badge */}
      <div
        className={cn(
          "absolute -bottom-4 -left-4 sm:-left-8",
          "flex items-center gap-2 rounded-2xl border border-border px-3 py-2",
          "bg-surface shadow-card backdrop-blur-sm",
          "transition-all duration-1000 ease-out delay-700",
          visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4",
        )}
      >
        <Wifi className="h-3.5 w-3.5 text-success" aria-hidden="true" />
        <p className="font-sans text-[11px] font-medium text-success">
          Real-time updates
        </p>
      </div>
    </div>
  );
};

// ─── Feature Card ─────────────────────────────────────────────────────────────

interface FeatureCardProps {
  icon: string;
  title: string;
  description: string;
  delay: number;
}

const FeatureCard: React.FC<FeatureCardProps> = ({
  icon,
  title,
  description,
  delay,
}) => {
  const [visible, setVisible] = React.useState(false);
  const ref = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          const t = setTimeout(() => setVisible(true), delay);
          observer.disconnect();
          return () => clearTimeout(t);
        }
      },
      { threshold: 0.1 },
    );
    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, [delay]);

  return (
    <div
      ref={ref}
      className={cn(
        "group relative flex flex-col gap-4 rounded-2xl border border-border p-6",
        "bg-surface shadow-card",
        "hover:border-primary/30 hover:shadow-glow-sm",
        "transition-all duration-300 ease-out",
        "cursor-default",
        visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6",
        "transition-[opacity,transform] duration-500",
      )}
    >
      {/* Icon */}
      <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 border border-primary/20 text-2xl select-none">
        {icon}
      </div>

      {/* Content */}
      <div className="space-y-2">
        <h3 className="font-sans font-semibold text-text text-base leading-tight">
          {title}
        </h3>
        <p className="font-sans text-sm text-muted leading-relaxed">
          {description}
        </p>
      </div>

      {/* Subtle glow on hover */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300"
        style={{
          background:
            "radial-gradient(ellipse at top left, rgba(255,92,43,0.05) 0%, transparent 70%)",
        }}
      />
    </div>
  );
};

// ─── Stat Item ────────────────────────────────────────────────────────────────

interface StatItemProps {
  value: string;
  label: string;
}

const StatItem: React.FC<StatItemProps> = ({ value, label }) => (
  <div className="flex flex-col items-center gap-1 text-center">
    <span className="font-serif text-3xl sm:text-4xl text-text leading-none">
      {value}
    </span>
    <span className="font-sans text-sm text-muted">{label}</span>
  </div>
);

// ─── Navbar ───────────────────────────────────────────────────────────────────

const LandingNavBar: React.FC = () => {
  const navigate = useNavigate();
  const [scrolled, setScrolled] = React.useState(false);

  React.useEffect(() => {
    const handler = () => setScrolled(window.scrollY > 16);
    window.addEventListener("scroll", handler, { passive: true });
    return () => window.removeEventListener("scroll", handler);
  }, []);

  return (
    <header
      className={cn(
        "sticky top-0 z-50 w-full transition-all duration-300",
        scrolled
          ? "bg-background/95 backdrop-blur-md border-b border-border shadow-[0_1px_0_rgba(255,255,255,0.03)]"
          : "bg-transparent",
      )}
    >
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
        <Logo />

        <div className="flex items-center gap-2 sm:gap-3">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate("/auth/login")}
          >
            Login
          </Button>
          <Button
            variant="default"
            size="sm"
            rightIcon={<ArrowRight className="h-3.5 w-3.5" />}
            onClick={() => navigate("/auth/register")}
          >
            Get Started
          </Button>
        </div>
      </div>
    </header>
  );
};

// ─── Landing Page ─────────────────────────────────────────────────────────────

const Landing: React.FC = () => {
  const navigate = useNavigate();

  const features: FeatureCardProps[] = [
    {
      icon: "⚡",
      title: "Instant Transfers",
      description:
        "Send money to any PayVault account in seconds — no delays, no queues. Funds arrive before you can blink.",
      delay: 0,
    },
    {
      icon: "📊",
      title: "Spending Insights",
      description:
        "Track every transaction in real time with live balance updates via SSE. Know exactly where every naira goes.",
      delay: 120,
    },
    {
      icon: "🔒",
      title: "Bank-Level Security",
      description:
        "Argon2 password hashing, JWT authentication, rate limiting, and idempotent transfers keep your money safe.",
      delay: 240,
    },
  ];

  const stats: StatItemProps[] = [
    { value: "10,000+", label: "Active Users" },
    { value: "₦500M+", label: "Transferred" },
    { value: "99.99%", label: "Uptime" },
  ];

  return (
    <div className="min-h-screen bg-background text-text font-sans antialiased">
      {/* ── Navbar ── */}
      <LandingNavBar />

      {/* ── Hero ── */}
      <section className="relative overflow-hidden">
        {/* Background grid pattern */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 opacity-[0.025]"
          style={{
            backgroundImage:
              "linear-gradient(rgba(255,255,255,0.3) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.3) 1px, transparent 1px)",
            backgroundSize: "40px 40px",
          }}
        />

        {/* Top-center ambient glow */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -top-40 left-1/2 h-[600px] w-[600px] -translate-x-1/2 rounded-full bg-primary/10 blur-[100px]"
        />

        <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col items-center gap-16 py-20 sm:py-28 lg:flex-row lg:items-center lg:gap-12 lg:py-32">
            {/* ── Left: Text ── */}
            <div className="flex flex-1 flex-col items-center gap-6 text-center lg:items-start lg:text-left">
              {/* Eyebrow */}
              <div className="inline-flex items-center gap-2 rounded-full border border-border bg-surface px-4 py-1.5 shadow-inner-border">
                <span className="text-base" aria-hidden="true">
                  🇳🇬
                </span>
                <span className="font-sans text-xs font-semibold uppercase tracking-widest text-muted">
                  Built for Nigeria
                </span>
              </div>

              {/* Headline */}
              <h1 className="font-serif text-4xl leading-[1.1] tracking-tight text-text sm:text-5xl lg:text-6xl xl:text-7xl">
                Your money{" "}
                <span className="relative inline-block">
                  <span className="relative z-10 text-primary">
                    moves faster
                  </span>
                  {/* Underline glow */}
                  <span
                    aria-hidden="true"
                    className="absolute bottom-0.5 left-0 right-0 h-px bg-gradient-to-r from-transparent via-primary/60 to-transparent"
                  />
                </span>{" "}
                with PayVault
              </h1>

              {/* Subtitle */}
              <p className="max-w-lg font-sans text-base text-muted leading-relaxed sm:text-lg">
                Send money in seconds, track every naira, and grow with
                bank-level security. The wallet built for the pace of Nigerian
                life.
              </p>

              {/* CTAs */}
              <div className="flex flex-col items-center gap-3 sm:flex-row lg:items-start">
                <Button
                  variant="default"
                  size="lg"
                  rightIcon={<ArrowRight className="h-4 w-4" />}
                  onClick={() => navigate("/auth/register")}
                  className="min-w-[180px]"
                >
                  Get Started
                </Button>
                <Button
                  variant="ghost"
                  size="lg"
                  onClick={() => navigate("/auth/login")}
                  className="min-w-[140px] border border-border hover:border-[#3a3a42]"
                >
                  Login
                </Button>
              </div>

              {/* Trust badges */}
              <div className="flex flex-wrap items-center justify-center gap-4 pt-2 lg:justify-start">
                {[
                  "🔐 SSL Encrypted",
                  "⚡ Instant Settlement",
                  "🇳🇬 NGN Native",
                ].map((badge) => (
                  <div
                    key={badge}
                    className="flex items-center gap-1.5 rounded-full border border-border px-3 py-1 bg-surface"
                  >
                    <span className="font-sans text-xs text-muted">
                      {badge}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* ── Right: Wallet Mockup ── */}
            <div className="flex flex-1 items-center justify-center lg:justify-end">
              <WalletMockup />
            </div>
          </div>
        </div>
      </section>

      {/* ── Stats bar ── */}
      <section className="relative border-y border-border">
        {/* Horizontal gradient lines for flair */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 bg-gradient-to-r from-transparent via-primary/5 to-transparent"
        />
        <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-3 divide-x divide-border py-10 sm:py-14">
            {stats.map((stat) => (
              <StatItem key={stat.label} {...stat} />
            ))}
          </div>
        </div>
      </section>

      {/* ── Features ── */}
      <section className="relative py-20 sm:py-28">
        {/* Background blobs */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute left-0 top-1/2 h-96 w-96 -translate-y-1/2 rounded-full bg-primary/5 blur-[80px]"
        />

        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          {/* Section header */}
          <div className="mb-12 flex flex-col items-center gap-3 text-center sm:mb-16">
            <span className="inline-block rounded-full border border-primary/30 bg-primary/10 px-3 py-1 font-sans text-xs font-semibold uppercase tracking-widest text-primary">
              Features
            </span>
            <h2 className="font-serif text-3xl text-text sm:text-4xl lg:text-5xl">
              Everything you need
            </h2>
            <p className="max-w-md font-sans text-sm text-muted leading-relaxed sm:text-base">
              PayVault packs enterprise-grade features into a wallet anyone can
              use.
            </p>
          </div>

          {/* Feature cards grid */}
          <div className="grid gap-5 sm:grid-cols-3">
            {features.map((feature) => (
              <FeatureCard key={feature.title} {...feature} />
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA banner ── */}
      <section className="py-16 sm:py-24">
        <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
          <div
            className="relative overflow-hidden rounded-3xl p-10 sm:p-16 text-center"
            style={{
              background:
                "linear-gradient(135deg, #1a1a1f 0%, #1e1a1a 50%, #1a1a1f 100%)",
              border: "1px solid rgba(255,92,43,0.25)",
              boxShadow:
                "0 0 60px rgba(255,92,43,0.12), 0 4px 24px rgba(0,0,0,0.4)",
            }}
          >
            {/* Glow */}
            <div
              aria-hidden="true"
              className="pointer-events-none absolute -top-16 left-1/2 h-64 w-64 -translate-x-1/2 rounded-full bg-primary/20 blur-3xl"
            />

            <div className="relative z-10 flex flex-col items-center gap-6">
              {/* Flag + emoji row */}
              <div
                className="flex items-center gap-2 text-3xl"
                aria-hidden="true"
              >
                🇳🇬 💸 ⚡
              </div>

              <h2 className="font-serif text-3xl text-text sm:text-4xl lg:text-5xl leading-tight">
                Ready to move your money?
              </h2>

              <p className="max-w-md font-sans text-sm text-muted leading-relaxed sm:text-base">
                Join thousands of Nigerians who trust PayVault to send, receive,
                and track every naira — instantly and securely.
              </p>

              <div className="flex flex-col items-center gap-3 sm:flex-row">
                <Button
                  variant="default"
                  size="lg"
                  rightIcon={<ArrowRight className="h-4 w-4" />}
                  onClick={() => navigate("/auth/register")}
                  className="min-w-[200px]"
                >
                  Create Free Account
                </Button>
                <Button
                  variant="ghost"
                  size="lg"
                  onClick={() => navigate("/auth/login")}
                  className="border border-border hover:border-[#3a3a42]"
                >
                  I already have an account
                </Button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className="border-t border-border">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col items-center gap-6 py-10 sm:flex-row sm:justify-between">
            <Logo />

            <p className="font-sans text-sm text-muted text-center">
              © 2025 PayVault. All rights reserved.
            </p>

            <div className="flex items-center gap-4">
              <button
                type="button"
                className="font-sans text-sm text-muted hover:text-text transition-colors duration-150 focus-visible:outline-none focus-visible:underline"
                onClick={() => navigate("/auth/register")}
              >
                Sign Up
              </button>
              <div className="h-3 w-px bg-border" aria-hidden="true" />
              <button
                type="button"
                className="font-sans text-sm text-muted hover:text-text transition-colors duration-150 focus-visible:outline-none focus-visible:underline"
                onClick={() => navigate("/auth/login")}
              >
                Login
              </button>
              <div className="h-3 w-px bg-border" aria-hidden="true" />
              <button
                type="button"
                className="font-sans text-xs text-gray-400 hover:text-gray-600 transition-colors duration-150 focus-visible:outline-none focus-visible:underline"
                onClick={() => navigate("/admin/login")}
              >
                Admin
              </button>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Landing;
