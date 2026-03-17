"use client";

import React from "react";
import { Button } from "@ui/components";

export type AdminTableColumn<T> = {
  key: string;
  header: string;
  render: (row: T) => React.ReactNode;
  headerClassName?: string;
  cellClassName?: string;
};

type LoadMoreProps = {
  hasMore: boolean;
  isLoading?: boolean;
  onLoadMore: () => void;
  label?: string;
};

type Props<T> = {
  columns: ReadonlyArray<AdminTableColumn<T>>;
  rows: ReadonlyArray<T>;
  getRowKey?: (row: T, index: number) => string;
  onRowClick?: (row: T) => void;
  loadMore?: LoadMoreProps;
};

export default function AdminTable<T>({
  columns,
  rows,
  getRowKey,
  onRowClick,
  loadMore,
}: Props<T>) {
  return (
    <div className="space-y-3">
      <div className="overflow-x-auto rounded-2xl border border-lp-border bg-white">
        <table className="min-w-full text-sm">
          <thead className="bg-lp-bg">
            <tr>
              {columns.map((column) => (
                <th
                  key={column.key}
                  className={`px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-lp-muted ${
                    column.headerClassName ?? ""
                  }`}
                >
                  {column.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, index) => (
              <tr
                key={getRowKey ? getRowKey(row, index) : String(index)}
                onClick={onRowClick ? () => onRowClick(row) : undefined}
                className={onRowClick ? "cursor-pointer hover:bg-slate-50" : undefined}
              >
                {columns.map((column) => (
                  <td
                    key={column.key}
                    className={`border-t border-lp-border px-4 py-3 text-lp-text ${
                      column.cellClassName ?? ""
                    }`}
                  >
                    {column.render(row)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {loadMore?.hasMore ? (
        <div className="flex justify-center">
          <Button
            variant="secondary"
            onClick={loadMore.onLoadMore}
            disabled={loadMore.isLoading}
          >
            {loadMore.label ?? "Load more"}
          </Button>
        </div>
      ) : null}
    </div>
  );
}
