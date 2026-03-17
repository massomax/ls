"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Input } from "@ui/components";
import AdminFiltersBar from "@/components/admin/AdminFiltersBar";
import AdminListStates from "@/components/admin/AdminListStates";
import AdminSectionHeader from "@/components/admin/AdminSectionHeader";
import AdminTable, { type AdminTableColumn } from "@/components/admin/AdminTable";
import {
  type AdminSellerListItem,
  type AdminSellerStatusFilter,
} from "@/lib/api/adminSellers";
import { useAdminSellersList } from "@/lib/queries/adminSellers";

const STATUS_OPTIONS: ReadonlyArray<{
  value: AdminSellerStatusFilter;
  label: string;
}> = [
  { value: "pending", label: "Pending" },
  { value: "active", label: "Active" },
  { value: "rejected", label: "Rejected" },
  { value: "suspended", label: "Suspended" },
  { value: "all", label: "All" },
];

const DEFAULT_STATUS: AdminSellerStatusFilter = "pending";
const LIST_LIMIT = 50;

function formatDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString("ru-RU");
}

export default function AdminSellersPage() {
  const router = useRouter();
  const [status, setStatus] = useState<AdminSellerStatusFilter>(DEFAULT_STATUS);
  const [query, setQuery] = useState("");
  const [applied, setApplied] = useState<{
    status: AdminSellerStatusFilter;
    q: string;
  }>({
    status: DEFAULT_STATUS,
    q: "",
  });

  const filters = useMemo(
    () => ({
      status: applied.status,
      q: applied.q.trim() ? applied.q.trim() : undefined,
      limit: LIST_LIMIT,
    }),
    [applied],
  );

  const sellersQuery = useAdminSellersList(filters);
  const rows = useMemo<AdminSellerListItem[]>(
    () => (sellersQuery.data?.pages ?? []).flatMap((page) => page.items),
    [sellersQuery.data?.pages],
  );

  const columns = useMemo<AdminTableColumn<AdminSellerListItem>[]>(
    () => [
      {
        key: "companyName",
        header: "Company",
        render: (row) => row.companyName,
      },
      {
        key: "status",
        header: "Status",
        render: (row) => row.status,
      },
      {
        key: "tier",
        header: "Tier",
        render: (row) => row.tier,
      },
      {
        key: "createdAt",
        header: "Created",
        render: (row) => formatDate(row.createdAt),
      },
      {
        key: "actions",
        header: "Actions",
        render: (row) => (
          <Link
            className="text-sm font-semibold text-lp-primary"
            href={`/admin/sellers/${row.id}`}
            onClick={(event) => event.stopPropagation()}
          >
            Open
          </Link>
        ),
      },
    ],
    [],
  );

  const isLoading = sellersQuery.isLoading;
  const error = sellersQuery.error;
  const isEmpty = !isLoading && !error && rows.length === 0;

  return (
    <div className="space-y-4">
      <AdminSectionHeader title="Sellers" description="Admin" />
      <AdminFiltersBar
        onReset={() => {
          setStatus(DEFAULT_STATUS);
          setQuery("");
          setApplied({ status: DEFAULT_STATUS, q: "" });
        }}
        onApply={() => {
          setApplied({ status, q: query });
        }}
      >
        <div className="w-full md:max-w-xs">
          <Input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search by name, INN, or email"
          />
        </div>
        <div className="w-full md:max-w-xs">
          <label className="text-xs font-semibold uppercase tracking-wide text-lp-muted">
            Status
          </label>
          <select
            className="mt-1 w-full rounded-2xl border border-lp-border bg-white px-3 py-2 text-sm text-lp-text"
            value={status}
            onChange={(event) =>
              setStatus(event.target.value as AdminSellerStatusFilter)
            }
          >
            {STATUS_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>
      </AdminFiltersBar>
      <AdminListStates
        isLoading={isLoading}
        error={error}
        isEmpty={isEmpty}
        emptyTitle="No sellers yet"
        emptyDescription="Try adjusting filters or check back later."
      />
      {!isLoading && !error && !isEmpty ? (
        <AdminTable
          columns={columns}
          rows={rows}
          getRowKey={(row) => row.id}
          onRowClick={(row) => router.push(`/admin/sellers/${row.id}`)}
          loadMore={{
            hasMore: Boolean(sellersQuery.hasNextPage),
            isLoading: sellersQuery.isFetchingNextPage,
            onLoadMore: () => sellersQuery.fetchNextPage(),
            label: sellersQuery.isFetchingNextPage
              ? "Loading..."
              : "Load more",
          }}
        />
      ) : null}
    </div>
  );
}
