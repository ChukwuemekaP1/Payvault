import * as React from "react";
import { cn } from "../../lib/utils";

export interface LabelProps extends React.LabelHTMLAttributes<HTMLLabelElement> {
  required?: boolean;
  hint?: string;
}

const Label = React.forwardRef<HTMLLabelElement, LabelProps>(
  ({ className, children, required, hint, ...props }, ref) => {
    return (
      <label
        ref={ref}
        className={cn(
          "block text-sm font-medium font-sans text-text leading-none",
          "peer-disabled:cursor-not-allowed peer-disabled:opacity-50",
          className
        )}
        {...props}
      >
        <span className="flex items-center gap-1.5">
          {children}
          {required && (
            <span className="text-primary text-xs" aria-hidden="true">
              *
            </span>
          )}
        </span>
        {hint && (
          <span className="mt-0.5 block text-xs font-normal text-muted">
            {hint}
          </span>
        )}
      </label>
    );
  }
);

Label.displayName = "Label";

export { Label };
