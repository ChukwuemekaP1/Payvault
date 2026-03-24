import * as React from "react";
import { cn } from "../../lib/utils";

export interface SeparatorProps extends React.HTMLAttributes<HTMLDivElement> {
  orientation?: "horizontal" | "vertical";
  decorative?: boolean;
  label?: string;
}

const Separator = React.forwardRef<HTMLDivElement, SeparatorProps>(
  (
    {
      className,
      orientation = "horizontal",
      decorative = true,
      label,
      ...props
    },
    ref
  ) => {
    const isHorizontal = orientation === "horizontal";

    if (label && isHorizontal) {
      return (
        <div
          ref={ref}
          role={decorative ? "none" : "separator"}
          aria-orientation={decorative ? undefined : orientation}
          className={cn("flex items-center gap-3 w-full", className)}
          {...props}
        >
          <div className="h-px flex-1 bg-border" />
          <span className="text-xs font-sans font-medium text-muted shrink-0 select-none">
            {label}
          </span>
          <div className="h-px flex-1 bg-border" />
        </div>
      );
    }

    return (
      <div
        ref={ref}
        role={decorative ? "none" : "separator"}
        aria-orientation={decorative ? undefined : orientation}
        className={cn(
          "shrink-0 bg-border",
          isHorizontal ? "h-px w-full" : "h-full w-px",
          className
        )}
        {...props}
      />
    );
  }
);

Separator.displayName = "Separator";

export { Separator };
