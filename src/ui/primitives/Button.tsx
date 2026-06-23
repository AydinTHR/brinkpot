import type { ButtonHTMLAttributes, ReactNode } from "react";

type Variant = "primary" | "ghost" | "danger";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  children: ReactNode;
}

const VARIANT: Record<Variant, string> = {
  primary: "bg-gold text-void hover:bg-king disabled:bg-surface-2 disabled:text-muted",
  ghost: "bg-surface-2 text-ink hover:bg-line disabled:text-muted",
  danger: "bg-brink text-white hover:bg-brink-deep disabled:bg-surface-2",
};

export function Button({ variant = "primary", className = "", children, ...rest }: ButtonProps) {
  return (
    <button
      className={`rounded-xl px-5 py-3 font-semibold tracking-tight transition-colors disabled:cursor-not-allowed ${VARIANT[variant]} ${className}`}
      {...rest}
    >
      {children}
    </button>
  );
}
