import * as React from "react";
import { cn } from "../../lib/utils";

export interface LoadingSpinnerProps {
  /** Size of the spinner in pixels */
  size?: "xs" | "sm" | "md" | "lg" | "xl";
  /** Optional label shown below the spinner */
  label?: string;
  /** Additional class names for the wrapper */
  className?: string;
  /** Fill the entire parent container and center the spinner */
  fullscreen?: boolean;
  /** Color variant */
  variant?: "primary" | "white" | "muted";
}

const sizeMap = {
  xs: { spinner: 16, stroke: 2 },
  sm: { spinner: 24, stroke: 2.5 },
  md: { spinner: 36, stroke: 3 },
  lg: { spinner: 48, stroke: 3.5 },
  xl: { spinner: 64, stroke: 4 },
};

const variantClasses = {
  primary: "text-primary",
  white: "text-white",
  muted: "text-muted",
};

const Spinner: React.FC<{
  size: keyof typeof sizeMap;
  variant: keyof typeof variantClasses;
  className?: string;
}> = ({ size, variant, className }) => {
  const { spinner, stroke } = sizeMap[size];
  const radius = (spinner - stroke * 2) / 2;
  const circumference = 2 * Math.PI * radius;
  const dashOffset = circumference * 0.75;

  return (
    <svg
      width={spinner}
      height={spinner}
      viewBox={`0 0 ${spinner} ${spinner}`}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
      className={cn("animate-spin", variantClasses[variant], className)}
      style={{ animationDuration: "0.75s", animationTimingFunction: "linear" }}
    >
      {/* Track circle */}
      <circle
        cx={spinner / 2}
        cy={spinner / 2}
        r={radius}
        stroke="currentColor"
        strokeWidth={stroke}
        strokeOpacity={0.12}
      />
      {/* Active arc */}
      <circle
        cx={spinner / 2}
        cy={spinner / 2}
        r={radius}
        stroke="currentColor"
        strokeWidth={stroke}
        strokeLinecap="round"
        strokeDasharray={circumference}
        strokeDashoffset={dashOffset}
        transform={`rotate(-90 ${spinner / 2} ${spinner / 2})`}
      />
    </svg>
  );
};

/**
 * LoadingSpinner — used throughout the app wherever async content is loading.
 *
 * Usage:
 *   <LoadingSpinner />                          // inline, default size
 *   <LoadingSpinner fullscreen label="Loading..." />  // full-page overlay
 *   <LoadingSpinner size="sm" variant="white" />
 */
const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({
  size = "md",
  label,
  className,
  fullscreen = false,
  variant = "primary",
}) => {
  if (fullscreen) {
    return (
      <div
        className={cn(
          "fixed inset-0 z-[9999]",
          "flex flex-col items-center justify-center gap-4",
          "bg-background",
          className
        )}
        role="status"
        aria-label={label ?? "Loading"}
        aria-live="polite"
      >
        {/* PayVault logo mark behind the spinner for brand recognition */}
        <div className="relative flex items-center justify-center">
          {/* Glow ring */}
          <div className="absolute inset-0 rounded-full bg-primary/10 blur-xl scale-150" />

          {/* Orange "PV" logo mark */}
          <div className="relative z-10 flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10 border border-primary/20">
            <span
              className="font-serif font-bold text-primary select-none"
              style={{ fontSize: "1.5rem" }}
            >
              PV
            </span>
          </div>

          {/* Orbiting spinner */}
          <div className="absolute inset-0 flex items-center justify-center -m-4">
            <Spinner size="xl" variant="primary" />
          </div>
        </div>

        {label && (
          <p className="font-sans text-sm text-muted animate-pulse mt-2">
            {label}
          </p>
        )}
      </div>
    );
  }

  return (
    <div
      className={cn(
        "inline-flex flex-col items-center justify-center gap-2",
        className
      )}
      role="status"
      aria-label={label ?? "Loading"}
      aria-live="polite"
    >
      <Spinner size={size} variant={variant} />
      {label && (
        <p className="font-sans text-xs text-muted">{label}</p>
      )}
      {/* Screen-reader only text when there's no visible label */}
      {!label && <span className="sr-only">Loading…</span>}
    </div>
  );
};

LoadingSpinner.displayName = "LoadingSpinner";

/**
 * PageLoader — full-page centered spinner with an optional message.
 * Lighter-weight alternative to LoadingSpinner with fullscreen prop.
 */
export const PageLoader: React.FC<{ message?: string }> = ({
  message = "Loading…",
}) => (
  <div
    className="flex min-h-[60vh] flex-col items-center justify-center gap-4"
    role="status"
    aria-live="polite"
  >
    <LoadingSpinner size="lg" />
    <p className="font-sans text-sm text-muted animate-pulse">{message}</p>
  </div>
);

/**
 * InlineLoader — a tiny spinner for use inside buttons or inline in text.
 */
export const InlineLoader: React.FC<{
  variant?: keyof typeof variantClasses;
  className?: string;
}> = ({ variant = "primary", className }) => (
  <Spinner size="xs" variant={variant} className={className} />
);

export { LoadingSpinner };
