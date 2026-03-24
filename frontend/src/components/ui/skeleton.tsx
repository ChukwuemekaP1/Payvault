import * as React from "react";
import { cn } from "../../lib/utils";

export interface SkeletonProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Width of the skeleton — accepts any valid CSS value */
  width?: string | number;
  /** Height of the skeleton — accepts any valid CSS value */
  height?: string | number;
  /** Render as a circle (for avatars, icons) */
  circle?: boolean;
  /** Disable the shimmer animation */
  static?: boolean;
}

/**
 * Skeleton — animated placeholder shown while content is loading.
 * Matches the PayVault dark design system: dark surface + shimmer sweep.
 */
const Skeleton = React.forwardRef<HTMLDivElement, SkeletonProps>(
  (
    {
      className,
      width,
      height,
      circle = false,
      static: isStatic = false,
      style,
      ...props
    },
    ref
  ) => {
    const inlineStyle: React.CSSProperties = {
      ...(width !== undefined
        ? { width: typeof width === "number" ? `${width}px` : width }
        : {}),
      ...(height !== undefined
        ? { height: typeof height === "number" ? `${height}px` : height }
        : {}),
      ...style,
    };

    return (
      <div
        ref={ref}
        aria-hidden="true"
        style={inlineStyle}
        className={cn(
          // Base shape
          "relative overflow-hidden rounded-xl",
          // Dark background matching the surface colour
          "bg-[#222228]",
          // Circle variant
          circle && "rounded-full",
          // Shimmer animation (unless static)
          !isStatic && [
            "before:absolute before:inset-0",
            "before:bg-[linear-gradient(90deg,transparent_0%,rgba(255,255,255,0.04)_50%,transparent_100%)]",
            "before:bg-[length:200%_100%]",
            "before:animate-shimmer",
          ],
          className
        )}
        {...props}
      />
    );
  }
);

Skeleton.displayName = "Skeleton";

// ─── Preset Composites ────────────────────────────────────────────────────────
// Common ready-made skeleton shapes for specific UI patterns.

/** A single line of text — specify width to control length */
export const SkeletonText: React.FC<{ width?: string | number; className?: string }> = ({
  width = "100%",
  className,
}) => (
  <Skeleton
    width={width}
    height={14}
    className={cn("rounded-md", className)}
  />
);

/** A block of N skeleton text lines, mimicking a paragraph */
export const SkeletonParagraph: React.FC<{
  lines?: number;
  className?: string;
}> = ({ lines = 3, className }) => (
  <div className={cn("flex flex-col gap-2 w-full", className)}>
    {Array.from({ length: lines }).map((_, i) => (
      <SkeletonText
        key={i}
        // Last line is shorter to look natural
        width={i === lines - 1 ? "65%" : "100%"}
      />
    ))}
  </div>
);

/** Circle skeleton — for avatars or icon placeholders */
export const SkeletonAvatar: React.FC<{
  size?: number;
  className?: string;
}> = ({ size = 40, className }) => (
  <Skeleton circle width={size} height={size} className={className} />
);

/** A transaction row skeleton — icon + two lines of text + amount */
export const SkeletonTransactionRow: React.FC<{ className?: string }> = ({
  className,
}) => (
  <div
    className={cn(
      "flex items-center gap-4 px-4 py-3.5 border-b border-border/50 last:border-0",
      className
    )}
  >
    {/* Icon circle */}
    <SkeletonAvatar size={40} />

    {/* Text lines */}
    <div className="flex-1 flex flex-col gap-2 min-w-0">
      <SkeletonText width="55%" />
      <SkeletonText width="35%" />
    </div>

    {/* Amount + date on the right */}
    <div className="flex flex-col items-end gap-2 shrink-0">
      <SkeletonText width={72} />
      <SkeletonText width={48} />
    </div>
  </div>
);

/** A wallet card skeleton */
export const SkeletonWalletCard: React.FC<{ className?: string }> = ({
  className,
}) => (
  <Skeleton
    height={200}
    className={cn("w-full rounded-3xl", className)}
  />
);

/** A stat / summary block skeleton */
export const SkeletonStat: React.FC<{ className?: string }> = ({
  className,
}) => (
  <div className={cn("flex flex-col gap-2 p-4 rounded-2xl bg-surface border border-border", className)}>
    <SkeletonText width="40%" />
    <Skeleton height={32} width="70%" className="rounded-lg" />
    <SkeletonText width="55%" />
  </div>
);

/** Generic card skeleton */
export const SkeletonCard: React.FC<{
  height?: number;
  className?: string;
}> = ({ height = 120, className }) => (
  <Skeleton height={height} className={cn("w-full rounded-2xl", className)} />
);

export { Skeleton };
