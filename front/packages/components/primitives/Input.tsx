import React from "react";
import { cn } from "./cn";

export function Input({ className, ...props }: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      className={cn(
        "w-full rounded-2xl border border-lp-border bg-white px-4 py-3 text-sm text-lp-text outline-none focus:ring-2 focus:ring-lp-primary focus:ring-offset-2",
        className
      )}
      {...props}
    />
  );
}
