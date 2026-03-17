import React from "react";
import { cn } from "./cn";

export function Badge({ className, style, ...props }: React.HTMLAttributes<HTMLSpanElement>) {
  return (
    <span
      className={cn("inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium", className)}
      style={style}
      {...props}
    />
  );
}
