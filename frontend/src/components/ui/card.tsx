import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "../../lib/utils";

const cardVariants = cva(
  // Base styles
  [
    "relative rounded-2xl border transition-all duration-200 ease-out",
    "text-text",
  ],
  {
    variants: {
      variant: {
        // Standard surface card — the default workhorse
        default: [
          "bg-surface border-border",
          "shadow-card",
        ],
        // Elevated — slightly lighter surface, more prominent shadow
        elevated: [
          "bg-[#222228] border-[#333340]",
          "shadow-card-hover",
        ],
        // Outlined only — transparent background with visible border
        outlined: [
          "bg-transparent border-border",
        ],
        // Ghost — nearly invisible, just a subtle area delimiter
        ghost: [
          "bg-transparent border-transparent",
        ],
        // Primary accent card — orange tinted border + glow
        primary: [
          "bg-surface border-primary/40",
          "shadow-[0_0_0_1px_rgba(255,92,43,0.15),0_4px_24px_rgba(0,0,0,0.4)]",
        ],
        // Success state card
        success: [
          "bg-success/5 border-success/30",
        ],
        // Error / danger state card
        error: [
          "bg-error/5 border-error/30",
        ],
        // Warning state card
        warning: [
          "bg-warning/5 border-warning/30",
        ],
        // Gradient card — uses a subtle gradient background
        gradient: [
          "bg-gradient-card border-border",
          "shadow-card",
        ],
        // Interactive card — shows hover + active states; for clickable cards
        interactive: [
          "bg-surface border-border cursor-pointer",
          "shadow-card",
          "hover:bg-[#222228] hover:border-[#3a3a42] hover:shadow-card-hover",
          "active:scale-[0.99]",
        ],
      },
      padding: {
        none: "p-0",
        xs: "p-3",
        sm: "p-4",
        md: "p-5",
        lg: "p-6",
        xl: "p-8",
      },
      radius: {
        sm: "rounded-xl",
        md: "rounded-2xl",
        lg: "rounded-3xl",
      },
    },
    defaultVariants: {
      variant: "default",
      padding: "lg",
      radius: "md",
    },
  }
);

export interface CardProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof cardVariants> {
  /** Render as a different HTML element (e.g. "section", "article") */
  as?: React.ElementType;
}

const Card = React.forwardRef<HTMLDivElement, CardProps>(
  ({ className, variant, padding, radius, as: Component = "div", ...props }, ref) => {
    return (
      <Component
        ref={ref}
        className={cn(cardVariants({ variant, padding, radius }), className)}
        {...props}
      />
    );
  }
);

Card.displayName = "Card";

// ─── Sub-components ───────────────────────────────────────────────────────────

export interface CardHeaderProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Adds a bottom border separator */
  bordered?: boolean;
}

const CardHeader = React.forwardRef<HTMLDivElement, CardHeaderProps>(
  ({ className, bordered = false, ...props }, ref) => (
    <div
      ref={ref}
      className={cn(
        "flex flex-col gap-1.5",
        bordered && "border-b border-border pb-4 mb-4",
        className
      )}
      {...props}
    />
  )
);

CardHeader.displayName = "CardHeader";

const CardTitle = React.forwardRef<
  HTMLHeadingElement,
  React.HTMLAttributes<HTMLHeadingElement>
>(({ className, children, ...props }, ref) => (
  <h3
    ref={ref}
    className={cn(
      "font-sans font-semibold text-base leading-tight tracking-tight text-text",
      className
    )}
    {...props}
  >
    {children}
  </h3>
));

CardTitle.displayName = "CardTitle";

const CardDescription = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLParagraphElement>
>(({ className, ...props }, ref) => (
  <p
    ref={ref}
    className={cn("text-sm font-sans text-muted leading-relaxed", className)}
    {...props}
  />
));

CardDescription.displayName = "CardDescription";

const CardContent = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div ref={ref} className={cn("text-sm text-text", className)} {...props} />
));

CardContent.displayName = "CardContent";

export interface CardFooterProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Adds a top border separator */
  bordered?: boolean;
}

const CardFooter = React.forwardRef<HTMLDivElement, CardFooterProps>(
  ({ className, bordered = false, ...props }, ref) => (
    <div
      ref={ref}
      className={cn(
        "flex items-center",
        bordered && "border-t border-border pt-4 mt-4",
        className
      )}
      {...props}
    />
  )
);

CardFooter.displayName = "CardFooter";

// ─── Stat / Info Row sub-component ───────────────────────────────────────────
// Useful for receipt-style rows: "Label ............... Value"

interface CardRowProps extends React.HTMLAttributes<HTMLDivElement> {
  label: React.ReactNode;
  value: React.ReactNode;
  /** Make the value text monospaced (good for amounts, IDs) */
  mono?: boolean;
  /** Accent color for the value */
  accent?: "default" | "primary" | "success" | "error" | "warning" | "muted";
}

const accentClasses: Record<NonNullable<CardRowProps["accent"]>, string> = {
  default: "text-text",
  primary: "text-primary",
  success: "text-success",
  error: "text-error",
  warning: "text-warning",
  muted: "text-muted",
};

const CardRow: React.FC<CardRowProps> = ({
  label,
  value,
  mono = false,
  accent = "default",
  className,
  ...props
}) => (
  <div
    className={cn(
      "flex items-center justify-between gap-4 py-2.5",
      "border-b border-border/60 last:border-0",
      className
    )}
    {...props}
  >
    <span className="text-sm font-sans text-muted shrink-0">{label}</span>
    <span
      className={cn(
        "text-sm font-sans text-right break-all",
        mono && "font-mono",
        accentClasses[accent]
      )}
    >
      {value}
    </span>
  </div>
);

CardRow.displayName = "CardRow";

export {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
  CardRow,
  cardVariants,
};
