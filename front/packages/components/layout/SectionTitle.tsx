import React from "react";

export function SectionTitle({
  title,
  hint,
  action,
}: {
  title: string;
  hint?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="mb-3 flex items-end justify-between gap-3">
      <div>
        <div className="text-base font-bold text-lp-text">{title}</div>
        {hint ? <div className="text-xs text-lp-muted">{hint}</div> : null}
      </div>
      {action}
    </div>
  );
}
