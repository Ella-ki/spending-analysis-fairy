import type { ButtonHTMLAttributes, ReactNode } from "react";

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  icon?: ReactNode;
  variant?: "primary" | "secondary" | "ghost" | "danger";
};

const variants = {
  primary: "bg-ink text-white hover:bg-neutral-800 dark:bg-stone-50 dark:text-ink dark:hover:bg-stone-200",
  secondary:
    "border border-stone-200 bg-white text-ink hover:bg-stone-100 dark:border-neutral-800 dark:bg-neutral-900 dark:text-stone-50 dark:hover:bg-neutral-800",
  ghost: "text-ink hover:bg-stone-100 dark:text-stone-50 dark:hover:bg-neutral-900",
  danger: "bg-coral text-white hover:bg-red-600",
};

export function Button({ children, icon, variant = "primary", className = "", ...props }: ButtonProps) {
  return (
    <button
      className={`inline-flex min-h-11 items-center justify-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-50 ${variants[variant]} ${className}`}
      {...props}
    >
      {icon}
      {children}
    </button>
  );
}
