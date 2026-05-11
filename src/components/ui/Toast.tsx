import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
} from "react";
import type { ReactNode } from "react";
import { CheckCircle2, AlertCircle, Info } from "lucide-react";

type ToastVariant = "success" | "error" | "info";
interface Toast {
  id: number;
  message: string;
  variant: ToastVariant;
}

interface ToastContextValue {
  show: (message: string, variant?: ToastVariant) => void;
}

const ToastContext = createContext<ToastContextValue | undefined>(undefined);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const show = useCallback(
    (message: string, variant: ToastVariant = "info") => {
      const id = Date.now() + Math.random();
      setToasts((t) => [...t, { id, message, variant }]);
      setTimeout(() => {
        setToasts((t) => t.filter((x) => x.id !== id));
      }, 4200);
    },
    [],
  );

  const value = useMemo<ToastContextValue>(() => ({ show }), [show]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="pointer-events-none fixed inset-x-0 top-3 z-[60] flex flex-col items-center gap-2 px-3">
        {toasts.map((t) => (
          <div
            key={t.id}
            className="pointer-events-auto flex w-full max-w-sm items-start gap-2 rounded-lg border border-line bg-white px-3 py-2.5 text-sm shadow-elevated"
          >
            {t.variant === "success" ? (
              <CheckCircle2 size={16} className="mt-0.5 text-forest" />
            ) : t.variant === "error" ? (
              <AlertCircle size={16} className="mt-0.5 text-red-700" />
            ) : (
              <Info size={16} className="mt-0.5 text-brass" />
            )}
            <span className="text-charcoal">{t.message}</span>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used inside <ToastProvider>");
  return ctx;
}
