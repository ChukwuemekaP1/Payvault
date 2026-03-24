import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "../../lib/utils";

const buttonVariants = cva(
  // Base styles shared by all variants
  [
    "inline-flex items-center justify-center gap-2 whitespace-nowrap",
    "font-sans font-medium text-sm leading-none",
    "rounded-xl border transition-all duration-200 ease-out",
    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60 focus-visible:ring-offset-2 focus-visible:ring-offset-background",
    "disabled:pointer-events-none disabled:opacity-40 disabled:cursor-not-allowed",
    "active:scale-[0.97]",
    "select-none",
  ],
  {
    variants: {
      variant: {
        // Solid orange primary — the main CTA style
        default: [
          "bg-primary border-primary text-white",
          "hover:bg-[#e64d20] hover:border-[#e64d20]",
          "shadow-glow-sm hover:shadow-glow",
        ],
        // Subdued secondary — dark surface with border
        secondary: [
          "bg-surface border-border text-text",
          "hover:bg-[#222228] hover:border-[#3a3a42]",
        ],
        // Transparent with orange border
        outline: [
          "bg-transparent border-primary text-primary",
          "hover:bg-primary/10",
        ],
        // Ghost — no border, subtle hover
        ghost: [
          "bg-transparent border-transparent text-muted",
          "hover:bg-surface hover:text-text",
        ],
        // Danger / destructive action
        destructive: [
          "bg-error/10 border-error/40 text-error",
          "hover:bg-error/20 hover:border-error",
        ],
        // Positive / success action
        success: [
          "bg-success/10 border-success/40 text-success",
          "hover:bg-success/20 hover:border-success",
        ],
        // Warning action
        warning: [
          "bg-warning/10 border-warning/40 text-warning",
          "hover:bg-warning/20 hover:border-warning",
        ],
        // Fully transparent — for icon-only or nav items
        link: [
          "bg-transparent border-transparent text-primary underline-offset-4",
          "hover:underline hover:text-[#ff7a50]",
          "h-auto p-0",
        ],
      },
      size: {
        xs: "h-7 px-3 text-xs rounded-lg gap-1.5",
        sm: "h-8 px-4 text-sm rounded-xl",
        md: "h-10 px-5 text-sm",
        lg: "h-12 px-7 text-base rounded-2xl",
        xl: "h-14 px-8 text-lg rounded-2xl",
        icon: "h-10 w-10 p-0 rounded-xl",
        "icon-sm": "h-8 w-8 p-0 rounded-lg",
        "icon-lg": "h-12 w-12 p-0 rounded-2xl",
      },
      fullWidth: {
        true: "w-full",
        false: "",
      },
      loading: {
        true: "pointer-events-none",
        false: "",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "md",
      fullWidth: false,
      loading: false,
    },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  /** Show a spinner and disable interaction */
  isLoading?: boolean;
  /** Icon rendered before the label */
  leftIcon?: React.ReactNode;
  /** Icon rendered after the label */
  rightIcon?: React.ReactNode;
  /** Render the button as a full-width block */
  fullWidth?: boolean;
}

const LoadingSpinnerInline = () => (
  <svg
    className="animate-spin shrink-0"
    xmlns="http://www.w3.org/2000/svg"
    fill="none"
    viewBox="0 0 24 24"
    width="1em"
    height="1em"
    aria-hidden="true"
  >
    <circle
      className="opacity-25"
      cx="12"
      cy="12"
      r="10"
      stroke="currentColor"
      strokeWidth="4"
    />
    <path
      className="opacity-75"
      fill="currentColor"
      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
    />
  </svg>
);

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      className,
      variant,
      size,
      fullWidth,
      isLoading = false,
      leftIcon,
      rightIcon,
      disabled,
      children,
      ...props
    },
    ref
  ) => {
    const isDisabled = disabled || isLoading;

    return (
      <button
        ref={ref}
        className={cn(
          buttonVariants({ variant, size, fullWidth, loading: isLoading }),
          className
        )}
        disabled={isDisabled}
        aria-busy={isLoading}
        {...props}
      >
        {isLoading ? (
          <LoadingSpinnerInline />
        ) : leftIcon ? (
          <span className="shrink-0 [&>svg]:h-[1.1em] [&>svg]:w-[1.1em]">
            {leftIcon}
          </span>
        ) : null}

        {children && (
          <span className={cn(isLoading && size !== "icon" && size !== "icon-sm" && size !== "icon-lg" ? "opacity-70" : "")}>
            {children}
          </span>
        )}

        {!isLoading && rightIcon && (
          <span className="shrink-0 [&>svg]:h-[1.1em] [&>svg]:w-[1.1em]">
            {rightIcon}
          </span>
        )}
      </button>
    );
  }
);

Button.displayName = "Button";

export { Button, buttonVariants };
