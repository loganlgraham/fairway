import { useEffect } from "react";
import type { ReactNode } from "react";
import { X } from "lucide-react";

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  children: ReactNode;
  footer?: ReactNode;
  size?: "sm" | "md" | "lg";
}

const sizeClass = {
  sm: "max-w-sm",
  md: "max-w-lg",
  lg: "max-w-2xl",
};

export function Modal({
  open,
  onClose,
  title,
  children,
  footer,
  size = "md",
}: ModalProps) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-charcoal/40 p-0 sm:items-center sm:p-4"
      role="dialog"
      aria-modal="true"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className={`flex w-full ${sizeClass[size]} flex-col rounded-t-2xl bg-cream shadow-elevated sm:rounded-2xl`}
      >
        {title ? (
          <div className="flex items-center justify-between border-b border-line px-5 py-4">
            <h3 className="font-display text-lg font-semibold text-forest">
              {title}
            </h3>
            <button
              type="button"
              onClick={onClose}
              className="rounded-md p-1 text-charcoal-muted hover:bg-cream-200 hover:text-charcoal"
              aria-label="Close"
            >
              <X size={18} />
            </button>
          </div>
        ) : null}
        <div className="max-h-[80vh] overflow-y-auto px-5 py-5">{children}</div>
        {footer ? (
          <div className="flex items-center justify-end gap-2 border-t border-line bg-cream-50 px-5 py-3 rounded-b-2xl">
            {footer}
          </div>
        ) : null}
      </div>
    </div>
  );
}
