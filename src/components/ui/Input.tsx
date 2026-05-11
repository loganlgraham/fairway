import { forwardRef } from "react";
import type { InputHTMLAttributes } from "react";

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  hint?: string;
  error?: string;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  { label, hint, error, id, className = "", ...rest },
  ref,
) {
  const inputId = id ?? rest.name ?? undefined;
  return (
    <div className="w-full">
      {label ? (
        <label htmlFor={inputId} className="label">
          {label}
        </label>
      ) : null}
      <input
        ref={ref}
        id={inputId}
        className={`input ${error ? "border-red-700 focus:border-red-700 focus:ring-red-700/15" : ""} ${className}`}
        aria-invalid={error ? true : undefined}
        {...rest}
      />
      {error ? (
        <p className="mt-1 text-xs text-red-800">{error}</p>
      ) : hint ? (
        <p className="mt-1 text-xs text-charcoal-muted">{hint}</p>
      ) : null}
    </div>
  );
});
