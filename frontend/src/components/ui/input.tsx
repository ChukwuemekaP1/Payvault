import * as React from "react";
import { cn } from "../../lib/utils";

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  /** Optional left-side icon or adornment */
  leftAdornment?: React.ReactNode;
  /** Optional right-side icon or adornment */
  rightAdornment?: React.ReactNode;
  /** Display the input in an error state */
  error?: boolean;
  /** Helper / error text rendered below the input */
  helperText?: string;
}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  (
    {
      className,
      type = "text",
      leftAdornment,
      rightAdornment,
      error = false,
      helperText,
      disabled,
      ...props
    },
    ref
  ) => {
    return (
      <div className="w-full">
        {/* Wrapper handles the adornment layout */}
        <div className="relative flex items-center">
          {/* Left adornment */}
          {leftAdornment && (
            <div
              className={cn(
                "pointer-events-none absolute left-3.5 flex items-center justify-center",
                "text-muted",
                disabled && "opacity-40"
              )}
            >
              {leftAdornment}
            </div>
          )}

          <input
            ref={ref}
            type={type}
            disabled={disabled}
            className={cn(
              // Base layout
              "flex h-11 w-full rounded-xl border px-4 py-2.5",
              "text-sm font-sans text-text placeholder:text-muted",
              // Background & border
              "bg-surface border-border",
              // Focus ring
              "outline-none ring-offset-background",
              "focus:border-primary focus:ring-2 focus:ring-primary/20",
              // Transition
              "transition-colors duration-150 ease-in-out",
              // Error state
              error &&
                "border-error focus:border-error focus:ring-error/20 text-error placeholder:text-error/60",
              // Disabled state
              "disabled:cursor-not-allowed disabled:opacity-40 disabled:select-none",
              // Adornment padding adjustments
              leftAdornment && "pl-10",
              rightAdornment && "pr-10",
              // File input reset
              "file:border-0 file:bg-transparent file:text-sm file:font-medium",
              // Number input — hide native arrows
              "[-moz-appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none",
              // Autofill override (Chrome overrides bg colour on autofill)
              "[&:-webkit-autofill]:shadow-[inset_0_0_0_1000px_#1a1a1f] [&:-webkit-autofill]:[-webkit-text-fill-color:#e8e6e0]",
              className
            )}
            {...props}
          />

          {/* Right adornment */}
          {rightAdornment && (
            <div
              className={cn(
                "absolute right-3.5 flex items-center justify-center",
                disabled && "opacity-40"
              )}
            >
              {rightAdornment}
            </div>
          )}
        </div>

        {/* Helper / error text */}
        {helperText && (
          <p
            className={cn(
              "mt-1.5 text-xs font-sans leading-tight",
              error ? "text-error" : "text-muted"
            )}
          >
            {helperText}
          </p>
        )}
      </div>
    );
  }
);

Input.displayName = "Input";

export { Input };
