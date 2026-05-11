import { forwardRef } from "react";
import type { ButtonHTMLAttributes, ReactNode } from "react";
import { Spinner } from "./Spinner";

type Variant = "primary" | "secondary" | "ghost" | "danger";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  loading?: boolean;
  leadingIcon?: ReactNode;
  trailingIcon?: ReactNode;
  fullWidth?: boolean;
}

const variantClass: Record<Variant, string> = {
  primary: "btn-primary",
  secondary: "btn-secondary",
  ghost: "btn-ghost",
  danger: "btn-danger",
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  {
    variant = "primary",
    loading = false,
    leadingIcon,
    trailingIcon,
    fullWidth = false,
    className = "",
    children,
    disabled,
    type = "button",
    ...rest
  },
  ref,
) {
  return (
    <button
      ref={ref}
      type={type}
      className={[
        variantClass[variant],
        fullWidth ? "w-full" : "",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
      disabled={disabled || loading}
      {...rest}
    >
      {loading ? <Spinner size={16} className="text-current" /> : leadingIcon}
      <span>{children}</span>
      {trailingIcon}
    </button>
  );
});
