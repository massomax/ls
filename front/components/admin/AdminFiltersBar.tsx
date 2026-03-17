"use client";

import React from "react";
import { Button } from "@ui/components";

type Props = {
  onReset: () => void;
  onApply: () => void;
  children?: React.ReactNode;
  isApplyDisabled?: boolean;
  isResetDisabled?: boolean;
};

export default function AdminFiltersBar({
  onReset,
  onApply,
  children,
  isApplyDisabled,
  isResetDisabled,
}: Props) {
  return (
    <div className="flex flex-col gap-3 rounded-2xl border border-lp-border bg-white p-3 md:flex-row md:items-center md:justify-between">
      <div className="flex flex-1 flex-wrap items-center gap-3">
        {children}
      </div>
      <div className="flex items-center gap-2">
        <Button
          variant="secondary"
          onClick={onReset}
          disabled={isResetDisabled}
        >
          Reset
        </Button>
        <Button onClick={onApply} disabled={isApplyDisabled}>
          Apply
        </Button>
      </div>
    </div>
  );
}
