import * as React from "react";
import { X } from "lucide-react";
import { cn } from "../../lib/utils";
import { Button } from "./button";

// ─── Context ──────────────────────────────────────────────────────────────────

interface DialogContextValue {
  open: boolean;
  onClose: () => void;
}

const DialogContext = React.createContext<DialogContextValue | null>(null);

function useDialogContext() {
  const ctx = React.useContext(DialogContext);
  if (!ctx) {
    throw new Error("Dialog sub-components must be used inside <Dialog />");
  }
  return ctx;
}

// ─── Root ─────────────────────────────────────────────────────────────────────

export interface DialogProps {
  /** Whether the dialog is open */
  open: boolean;
  /** Called when the dialog should close (backdrop click, Escape key, or close button) */
  onOpenChange: (open: boolean) => void;
  children: React.ReactNode;
}

const Dialog: React.FC<DialogProps> = ({ open, onOpenChange, children }) => {
  const handleClose = React.useCallback(() => {
    onOpenChange(false);
  }, [onOpenChange]);

  // Close on Escape key
  React.useEffect(() => {
    if (!open) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        handleClose();
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [open, handleClose]);

  // Prevent body scroll while open
  React.useEffect(() => {
    if (open) {
      const originalOverflow = document.body.style.overflow;
      document.body.style.overflow = "hidden";
      return () => {
        document.body.style.overflow = originalOverflow;
      };
    }
  }, [open]);

  return (
    <DialogContext.Provider value={{ open, onClose: handleClose }}>
      {children}
    </DialogContext.Provider>
  );
};

Dialog.displayName = "Dialog";

// ─── Trigger ─────────────────────────────────────────────────────────────────

export interface DialogTriggerProps {
  children: React.ReactElement;
  asChild?: boolean;
}

const DialogTrigger: React.FC<DialogTriggerProps> = ({ children }) => {
  // Trigger must be used alongside a controlled open state — it's a passthrough
  // that simply renders children unchanged. Parent controls the open state.
  return <>{children}</>;
};

DialogTrigger.displayName = "DialogTrigger";

// ─── Portal / Overlay ─────────────────────────────────────────────────────────

export interface DialogOverlayProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Additional classes for the backdrop */
  backdropClassName?: string;
}

// ─── Content ─────────────────────────────────────────────────────────────────

export interface DialogContentProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Show the default × close button in the top-right corner */
  showCloseButton?: boolean;
  /** Max width variant */
  size?: "sm" | "md" | "lg" | "xl" | "full";
  /** Called when the close button is clicked (defaults to context onClose) */
  onClose?: () => void;
}

const sizeClasses: Record<NonNullable<DialogContentProps["size"]>, string> = {
  sm: "max-w-sm",
  md: "max-w-md",
  lg: "max-w-lg",
  xl: "max-w-xl",
  full: "max-w-[95vw]",
};

const DialogContent = React.forwardRef<HTMLDivElement, DialogContentProps>(
  (
    {
      className,
      children,
      showCloseButton = true,
      size = "md",
      onClose,
      ...props
    },
    ref
  ) => {
    const { open, onClose: contextClose } = useDialogContext();
    const handleClose = onClose ?? contextClose;

    if (!open) return null;

    return (
      // Portal-like — rendered as a fixed overlay at the document root level
      // We use a React.Fragment + fixed positioning instead of createPortal to
      // keep the component self-contained (no DOM refs needed for portal target).
      <>
        {/* Backdrop */}
        <div
          className={cn(
            "fixed inset-0 z-50",
            "bg-black/70 backdrop-blur-sm",
            "animate-fade-in"
          )}
          aria-hidden="true"
          onClick={handleClose}
        />

        {/* Dialog panel */}
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
        >
          <div
            ref={ref}
            className={cn(
              // Base
              "relative w-full",
              sizeClasses[size],
              // Visual
              "bg-surface border border-border rounded-2xl",
              "shadow-[0_24px_64px_rgba(0,0,0,0.7)]",
              // Animation
              "animate-scale-in",
              className
            )}
            // Stop clicks inside the panel from bubbling to the backdrop
            onClick={(e) => e.stopPropagation()}
            {...props}
          >
            {showCloseButton && (
              <button
                type="button"
                onClick={handleClose}
                aria-label="Close dialog"
                className={cn(
                  "absolute right-4 top-4 z-10",
                  "flex h-7 w-7 items-center justify-center rounded-lg",
                  "text-muted border border-transparent",
                  "hover:bg-[#2a2a30] hover:text-text hover:border-border",
                  "transition-colors duration-150",
                  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60"
                )}
              >
                <X className="h-4 w-4" aria-hidden="true" />
              </button>
            )}

            {children}
          </div>
        </div>
      </>
    );
  }
);

DialogContent.displayName = "DialogContent";

// ─── Header ───────────────────────────────────────────────────────────────────

const DialogHeader = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn(
      "flex flex-col gap-1.5 px-6 pt-6 pb-4",
      "border-b border-border",
      className
    )}
    {...props}
  />
));

DialogHeader.displayName = "DialogHeader";

// ─── Title ────────────────────────────────────────────────────────────────────

const DialogTitle = React.forwardRef<
  HTMLHeadingElement,
  React.HTMLAttributes<HTMLHeadingElement>
>(({ className, ...props }, ref) => (
  <h2
    ref={ref}
    className={cn(
      "font-sans font-semibold text-lg leading-tight text-text",
      className
    )}
    {...props}
  />
));

DialogTitle.displayName = "DialogTitle";

// ─── Description ─────────────────────────────────────────────────────────────

const DialogDescription = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLParagraphElement>
>(({ className, ...props }, ref) => (
  <p
    ref={ref}
    className={cn("text-sm font-sans text-muted leading-relaxed", className)}
    {...props}
  />
));

DialogDescription.displayName = "DialogDescription";

// ─── Body ─────────────────────────────────────────────────────────────────────

const DialogBody = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn("px-6 py-4 text-sm text-text", className)}
    {...props}
  />
));

DialogBody.displayName = "DialogBody";

// ─── Footer ───────────────────────────────────────────────────────────────────

export interface DialogFooterProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Reverse the order of footer buttons on mobile (default true) */
  reverseOnMobile?: boolean;
}

const DialogFooter = React.forwardRef<HTMLDivElement, DialogFooterProps>(
  ({ className, reverseOnMobile = true, ...props }, ref) => (
    <div
      ref={ref}
      className={cn(
        "flex items-center justify-end gap-3 px-6 py-4",
        "border-t border-border",
        reverseOnMobile && "flex-col-reverse sm:flex-row",
        className
      )}
      {...props}
    />
  )
);

DialogFooter.displayName = "DialogFooter";

// ─── Confirm Dialog (convenience) ────────────────────────────────────────────

export interface ConfirmDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: "default" | "destructive";
  isLoading?: boolean;
  onConfirm: () => void;
  onCancel?: () => void;
  children?: React.ReactNode;
}

const ConfirmDialog: React.FC<ConfirmDialogProps> = ({
  open,
  onOpenChange,
  title,
  description,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  variant = "default",
  isLoading = false,
  onConfirm,
  onCancel,
  children,
}) => {
  const handleCancel = () => {
    onCancel?.();
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent size="sm">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          {description && <DialogDescription>{description}</DialogDescription>}
        </DialogHeader>

        {children && <DialogBody>{children}</DialogBody>}

        <DialogFooter>
          <Button
            variant="secondary"
            size="sm"
            onClick={handleCancel}
            disabled={isLoading}
          >
            {cancelLabel}
          </Button>
          <Button
            variant={variant === "destructive" ? "destructive" : "default"}
            size="sm"
            isLoading={isLoading}
            onClick={onConfirm}
          >
            {confirmLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

ConfirmDialog.displayName = "ConfirmDialog";

// ─── Exports ──────────────────────────────────────────────────────────────────

export {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogBody,
  DialogFooter,
  ConfirmDialog,
};
