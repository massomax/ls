"use client";

import { useCallback, useMemo, useState } from "react";
import { Button, Input, SectionTitle, Sheet } from "@ui/components";
import AdminFiltersBar from "@/components/admin/AdminFiltersBar";
import AdminListStates from "@/components/admin/AdminListStates";
import AdminTable, { type AdminTableColumn } from "@/components/admin/AdminTable";
import { useCursorParams } from "@/lib/admin/useCursorParams";
import { useCategories, useSubcategories } from "@/lib/queries/categories";
import {
  useApproveAdminSubcategory,
  useMergeAdminSubcategory,
  usePendingAdminSubcategories,
  useRejectAdminSubcategory,
} from "@/lib/queries/adminSubcategories";
import type { AdminSubcategoryListItem } from "@/lib/api/adminSubcategories";

const LIST_LIMIT = 50;

type ActionType = "approve" | "reject" | "merge";

type ActionState = {
  type: ActionType;
  item: AdminSubcategoryListItem;
} | null;

function formatDate(value: string | null | undefined) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString("ru-RU");
}

export default function PendingSubcategoriesPage() {
  const { limit, resetCursor } = useCursorParams({ limit: LIST_LIMIT });

  const categoriesQuery = useCategories();

  const [categoryId, setCategoryId] = useState("");
  const [appliedCategoryId, setAppliedCategoryId] = useState("");

  const pendingQuery = usePendingAdminSubcategories({
    categoryId: appliedCategoryId || undefined,
    limit,
  });

  const rows = useMemo<AdminSubcategoryListItem[]>(
    () => (pendingQuery.data?.pages ?? []).flatMap((page) => page.items),
    [pendingQuery.data?.pages],
  );


  const isLoading = pendingQuery.isLoading;
  const error = pendingQuery.error;
  const isEmpty = !isLoading && !error && rows.length === 0;

  const approveMutation = useApproveAdminSubcategory();
  const rejectMutation = useRejectAdminSubcategory();
  const mergeMutation = useMergeAdminSubcategory();

  const [action, setAction] = useState<ActionState>(null);

  const [approveName, setApproveName] = useState("");
  const [approveSlug, setApproveSlug] = useState("");
  const [approveDescription, setApproveDescription] = useState("");

  const [rejectReason, setRejectReason] = useState("");

  const [mergeTargetId, setMergeTargetId] = useState("");
  const subcategoriesQuery = useSubcategories(categoryId || null);
  const targetOptions = subcategoriesQuery.data ?? [];

  const closeAction = () => {
    setAction(null);
    setApproveName("");
    setApproveSlug("");
    setApproveDescription("");
    setRejectReason("");
    setMergeTargetId("");
  };

  const openAction = useCallback(
    (type: ActionType, item: AdminSubcategoryListItem) => {
      setAction({ type, item });
      setApproveName("");
      setApproveSlug("");
      setApproveDescription("");
      setRejectReason("");
      setMergeTargetId("");
    },
    [],
  );
  const columns = useMemo<AdminTableColumn<AdminSubcategoryListItem>[]>(
    () => [
      {
        key: "id",
        header: "ID",
        render: (row) => row.id,
      },
      {
        key: "name",
        header: "Name",
        render: (row) => row.name,
      },
      {
        key: "slug",
        header: "Slug",
        render: (row) => row.slug,
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
          <div className="flex flex-wrap items-center gap-2">
            <Button
              variant="secondary"
              onClick={() => openAction("approve", row)}
            >
              Approve
            </Button>
            <Button
              variant="secondary"
              onClick={() => openAction("reject", row)}
            >
              Reject
            </Button>
            <Button
              variant="secondary"
              onClick={() => openAction("merge", row)}
            >
              Merge
            </Button>
          </div>
        ),
      },
    ],
    [openAction],
  );

  const isBusy =
    approveMutation.isPending ||
    rejectMutation.isPending ||
    mergeMutation.isPending;

  const categoryOptions = categoriesQuery.data ?? [];

  return (
    <div className="space-y-4">
      <SectionTitle title="Pending subcategories" hint="Admin" />

      <AdminFiltersBar
        onReset={() => {
          setCategoryId("");
          setAppliedCategoryId("");
          resetCursor();
        }}
        onApply={() => {
          setAppliedCategoryId(categoryId);
          resetCursor();
        }}
      >
        <div className="w-full md:max-w-xs">
          <label className="text-xs font-semibold uppercase tracking-wide text-lp-muted">
            Category
          </label>
          <select
            className="mt-1 w-full rounded-2xl border border-lp-border bg-white px-3 py-2 text-sm text-lp-text"
            value={categoryId}
            onChange={(event) => setCategoryId(event.target.value)}
          >
            <option value="">All categories</option>
            {categoryOptions.map((category) => (
              <option key={category.id} value={category.id}>
                {category.name}
              </option>
            ))}
          </select>
        </div>
      </AdminFiltersBar>

      <AdminListStates
        isLoading={isLoading}
        error={error}
        isEmpty={isEmpty}
        emptyTitle="No pending subcategories"
        emptyDescription="New requests will appear here."
      />

      {!isLoading && !error && !isEmpty ? (
        <AdminTable
          columns={columns}
          rows={rows}
          getRowKey={(row) => row.id}
          loadMore={{
            hasMore: Boolean(pendingQuery.hasNextPage),
            isLoading: pendingQuery.isFetchingNextPage,
            onLoadMore: () => pendingQuery.fetchNextPage(),
            label: pendingQuery.isFetchingNextPage
              ? "Loading..."
              : "Load more",
          }}
        />
      ) : null}

      <Sheet
        open={Boolean(action)}
        onClose={closeAction}
        title={
          action?.type === "approve"
            ? "Approve subcategory"
            : action?.type === "reject"
              ? "Reject subcategory"
              : "Merge subcategory"
        }
        subtitle={action?.item.name}
      >
        {action?.type === "approve" ? (
          <div className="space-y-3">
            <Input
              value={approveName}
              onChange={(event) => setApproveName(event.target.value)}
              placeholder="Name (optional)"
            />
            <Input
              value={approveSlug}
              onChange={(event) => setApproveSlug(event.target.value)}
              placeholder="Slug (optional)"
            />
            <Input
              value={approveDescription}
              onChange={(event) => setApproveDescription(event.target.value)}
              placeholder="Description (optional)"
            />
            <Button
              onClick={() => {
                if (!action) return;
                approveMutation.mutate(
                  {
                    id: action.item.id,
                    payload: {
                      name: approveName.trim() || undefined,
                      slug: approveSlug.trim() || undefined,
                      description: approveDescription.trim() || undefined,
                    },
                  },
                  { onSuccess: closeAction },
                );
              }}
              disabled={isBusy}
            >
              Approve
            </Button>
          </div>
        ) : null}

        {action?.type === "reject" ? (
          <div className="space-y-3">
            <Input
              value={rejectReason}
              onChange={(event) => setRejectReason(event.target.value)}
              placeholder="Reason (optional)"
            />
            <Button
              variant="secondary"
              onClick={() => {
                if (!action) return;
                rejectMutation.mutate(
                  {
                    id: action.item.id,
                    reason: rejectReason.trim() || undefined,
                  },
                  { onSuccess: closeAction },
                );
              }}
              disabled={isBusy}
            >
              Reject
            </Button>
          </div>
        ) : null}

        {action?.type === "merge" ? (
          <div className="space-y-3">
            {categoryId ? (
              <>
                <div className="text-xs text-lp-muted">
                  Select an active subcategory to merge into.
                </div>
                <select
                  className="w-full rounded-2xl border border-lp-border bg-white px-3 py-2 text-sm text-lp-text"
                  value={mergeTargetId}
                  onChange={(event) => setMergeTargetId(event.target.value)}
                >
                  <option value="">Select target</option>
                  {targetOptions.map((subcategory) => (
                    <option key={subcategory.id} value={subcategory.id}>
                      {subcategory.name}
                    </option>
                  ))}
                </select>
                <Button
                  variant="secondary"
                  onClick={() => {
                    if (!action || !mergeTargetId) return;
                    mergeMutation.mutate(
                      { id: action.item.id, targetId: mergeTargetId },
                      { onSuccess: closeAction },
                    );
                  }}
                  disabled={isBusy || !mergeTargetId}
                >
                  Merge
                </Button>
              </>
            ) : (
              <div className="text-sm text-lp-muted">
                Select a category first to load merge targets.
              </div>
            )}
          </div>
        ) : null}
      </Sheet>
    </div>
  );
}
