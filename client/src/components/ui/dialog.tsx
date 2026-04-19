import { FloatingPortal } from "@floating-ui/react";
import { ReactNode, useEffect } from "react";

interface DialogProps {
  open: boolean;
  title: string;
  description?: string;
  onClose: () => void;
  children: ReactNode;
  footer?: ReactNode;
}

export const Dialog = ({
  open,
  title,
  description,
  onClose,
  children,
  footer,
}: DialogProps) => {
  useEffect(() => {
    if (!open) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <FloatingPortal>
      <div
        className="fixed inset-0 z-[10000] flex items-center justify-center"
        onClick={onClose}
      >
        <div className="absolute inset-0 bg-white/10 backdrop-blur-sm" />
        <div
          className="relative bg-default-2 border border-default-3 rounded-xl shadow-2xl p-6 max-w-md w-full mx-4 max-h-[85vh] overflow-y-auto"
          onClick={(e) => e.stopPropagation()}
        >
          <h3 className="text-lg font-semibold mb-2 text-text-primary">{title}</h3>
          {description && (
            <p className="text-sm text-text-secondary mb-4">{description}</p>
          )}
          <div className="mb-6">{children}</div>
          {footer && <div className="flex justify-end gap-3">{footer}</div>}
        </div>
      </div>
    </FloatingPortal>
  );
};
