import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "../../lib/utils";

const badgeVariants = cva(
  [
    "inline-flex items-center justify-center gap-1.5",
    "rounded-full border px-2.5 py-0.5",
    "text-xs font-medium font-sans leading-none whitespace-nowrap",
    "transition-colors duration-150",
    "select-none",
  ],
  {
    variants: {
      variant: {
        default: [
          "bg-surface border-border text-text",
        ],
        primary: [
          "bg-primary/15 border-primary/40 text-primary",
        ],
        success: [
          "bg-success/15 border-success/40 text-success",
        ],
        warning: [
          "bg-warning/15 border-warning/40 text-warning",
        ],
        error: [
          "bg-error/15 border-error/40 text-error",
        ],
        muted: [
          "bg-surface border-border text-muted",
        ],
        outline: [
          "bg-transparent border-border text-muted",
        ],
      },
      size: {
        sm: "px-2 py-0.5 text-[10px]",
        md: "px-2.5 py-0.5 text-xs",
        lg: "px-3 py-1 text-sm",
      },
      dot: {
        true: "",
        false: "",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "md",
      dot: false,
    },
  }
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof badgeVariants> {
  /** Show a small coloured dot before the label */
  dot?: boolean;
}

/**
 * Map a transaction/status string to the appropriate badge variant.
 * Usage: <Badge variant={statusVariant("completed")}>Completed</Badge>
 */
export function statusVariant(
  status: string
): VariantProps<typeof badgeVariants>["variant"] {
  switch (status.toLowerCase()) {
    case "completed":
    case "success":
    case "active":
    case "verified":
      return "success";
    case "pending":
    case "processing":
    case "queued":
      return "warning";
    case "failed":
    case "error":
    case "rejected":
    case "cancelled":
    case "canceled":
      return "error";
    case "credit":
      return "success";
    case "transfer":
    case "debit":
      return "primary";
    default:
      return "muted";
  }
}

/**
 * Map a status string to a human-readable label.
 */
export function statusLabel(status: string): string {
  switch (status.toLowerCase()) {
    case "completed":
      return "Completed";
    case "pending":
      return "Pending";
    case "failed":
      return "Failed";
    case "processing":
      return "Processing";
    case "credit":
      return "Credit";
    case "transfer":
      return "Transfer";
    case "debit":
      return "Debit";
    case "cancelled":
    case "canceled":
      return "Cancelled";
    default:
      return status.charAt(0).toUpperCase() + status.slice(1);
  }
}

const DotIcon = ({
  variant,
}: {
  variant: VariantProps<typeof badgeVariants>["variant"];
}) => {
  const colourMap: Record<string, string> = {
    success: "bg-success",
    warning: "bg-warning",
    error: "bg-error",
    primary: "bg-primary",
    default: "bg-text",
    muted: "bg-muted",
    outline: "bg-muted",
  };

  const colourClass =
    colourMap[variant ?? "default"] ?? "bg-muted";

  return (
    <span
      className={cn("inline-block h-1.5 w-1.5 rounded-full shrink-0", colourClass)}
      aria-hidden="true"
    />
  );
};

const Badge = React.forwardRef<HTMLSpanElement, BadgeProps>(
  ({ className, variant, size, dot = false, children, ...props }, ref) => {
    return (
      <span
        ref={ref}
        className={cn(badgeVariants({ variant, size, dot }), className)}
        {...props}
      >
        {dot && <DotIcon variant={variant} />}
        {children}
      </span>
    );
  }
);

Badge.displayName = "Badge";

export { Badge, badgeVariants };
