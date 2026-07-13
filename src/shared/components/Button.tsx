import type { ButtonHTMLAttributes, ReactNode } from "react";

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  icon?: ReactNode;
  variant?: "primary" | "secondary" | "ghost" | "danger";
};

const variants = {
  primary: "bg-gradient-to-br from-mint to-lavender text-white shadow-fairy hover:brightness-105",
  secondary:
    "border border-lavender/25 bg-white/80 text-ink hover:bg-white dark:border-lavender/20 dark:bg-neutral-900 dark:text-stone-50 dark:hover:bg-neutral-800",
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
