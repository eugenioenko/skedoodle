import { FloatingPortal } from "@floating-ui/react";
import { useEffect, useRef } from "react";

interface ConfirmDialogProps {
  open: boolean;
  title: string;
  description?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: "primary" | "danger";
  onConfirm: () => void;
  onCancel: () => void;
}

export const ConfirmDialog = ({
  open,
  title,
  description,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  variant = "primary",
  onConfirm,
  onCancel,
}: ConfirmDialogProps) => {
  const confirmRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (open) {
      confirmRef.current?.focus();
    }
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onCancel();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [open, onCancel]);

  if (!open) return null;

  const confirmClass =
    variant === "danger"
      ? "bg-red-600 hover:bg-red-700 text-white"
      : "bg-primary hover:opacity-90 text-text-primary";

  return (
    <FloatingPortal>
      <div
        className="fixed inset-0 z-[10000] flex items-center justify-center"
        onClick={onCancel}
      >
        <div className="absolute inset-0 bg-black/50" />
        <div
          className="relative bg-default-2 border border-default-3 rounded-xl shadow-2xl p-6 max-w-sm w-full mx-4"
          onClick={(e) => e.stopPropagation()}
        >
          <h3 className="text-lg font-semibold mb-2">{title}</h3>
          {description && (
            <p className="text-sm text-text-secondary mb-6">{description}</p>
          )}
          <div className="flex justify-end gap-3">
            <button
              type="button"
              onClick={onCancel}
              className="px-4 py-2 rounded-lg text-sm font-medium text-text-secondary hover:bg-default-3 transition-colors"
            >
              {cancelLabel}
            </button>
            <button
              ref={confirmRef}
              type="button"
              onClick={onConfirm}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${confirmClass}`}
            >
              {confirmLabel}
            </button>
          </div>
        </div>
      </div>
    </FloatingPortal>
  );
};
