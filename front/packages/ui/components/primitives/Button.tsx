import React from "react";
import { cn } from "./cn";

type Variant = "primary" | "secondary" | "ghost";

type Props = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: Variant;
};

export function Button({ variant = "primary", className, ...props }: Props) {
  const base =
    "inline-flex items-center justify-center rounded-2xl px-4 py-2.5 text-sm font-semibold transition focus:outline-none focus:ring-2 focus:ring-offset-2";

  const styles: Record<Variant, string> = {
    primary: "bg-lp-primary text-white shadow-lp-sm hover:shadow-lp-md focus:ring-lp-primary",
    secondary: "border border-lp-border bg-white text-lp-text hover:bg-slate-50 focus:ring-lp-primary",
    ghost: "bg-transparent text-lp-text hover:bg-slate-50 focus:ring-lp-primary",
  };

  return <button className={cn(base, styles[variant], className)} {...props} />;
}
