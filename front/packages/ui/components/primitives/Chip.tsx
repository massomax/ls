import React from "react";
import { cn } from "./cn";

export function Chip({
  active,
  className,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { active?: boolean }) {
  return (
    <button
      type="button"
      className={cn(
        "inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-sm transition",
        active ? "border-transparent bg-lp-primary text-white" : "border-lp-border bg-white text-slate-700 hover:bg-slate-50",
        className
      )}
      {...props}
    />
  );
}
