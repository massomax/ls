"use client";

import { useMemo, useState } from "react";
import {
  Button,
  Card,
  CardBody,
  Input,
  SectionTitle,
  Sheet,
} from "@ui/components";
import AdminListStates from "@/components/admin/AdminListStates";
import AdminSectionHeader from "@/components/admin/AdminSectionHeader";
import AdminTable, { type AdminTableColumn } from "@/components/admin/AdminTable";
import { useCategories } from "@/lib/queries/categories";
import {
  useArchiveAdminCategory,
  useCreateAdminCategory,
  useRestoreAdminCategory,
  useUpdateAdminCategory,
} from "@/lib/queries/adminCategories";
import type { CategoryListItem } from "@/lib/api/categories";

const emptyForm = {
  name: "",
  slug: "",
  svgUrl: "",
  sortOrder: "0",
  description: "",
};

type CategoryFormState = typeof emptyForm;

type EditState = {
  id: string;
  form: CategoryFormState;
};

function coerceSortOrder(value: string) {
  const parsed = Number(value);
  return Number.isNaN(parsed) ? 0 : parsed;
}

export default function AdminCategoriesPage() {
  const categoriesQuery = useCategories();
  const createMutation = useCreateAdminCategory();
  const updateMutation = useUpdateAdminCategory();
  const archiveMutation = useArchiveAdminCategory();
  const restoreMutation = useRestoreAdminCategory();

  const [createForm, setCreateForm] = useState<CategoryFormState>(emptyForm);
  const [editState, setEditState] = useState<EditState | null>(null);
  const [restoreId, setRestoreId] = useState("");

  const categories = categoriesQuery.data ?? [];
  const isLoading = categoriesQuery.isLoading;
  const error = categoriesQuery.error;
  const isEmpty = !isLoading && !error && categories.length === 0;

  const isBusy =
    createMutation.isPending ||
    updateMutation.isPending ||
    archiveMutation.isPending ||
    restoreMutation.isPending;

  const columns = useMemo<AdminTableColumn<CategoryListItem>[]>(
    () => [
      { key: "name", header: "Name", render: (row) => row.name },
      { key: "slug", header: "Slug", render: (row) => row.slug },
      {
        key: "sortOrder",
        header: "Sort",
        render: (row) => String(row.sortOrder),
      },
      {
        key: "description",
        header: "Description",
        render: (row) => row.description ?? "—",
      },
      {
        key: "actions",
        header: "Actions",
        render: (row) => (
          <div className="flex flex-wrap gap-2">
            <Button
              variant="secondary"
              onClick={() =>
                setEditState({
                  id: row.id,
                  form: {
                    name: row.name,
                    slug: row.slug,
                    svgUrl: row.svgUrl,
                    sortOrder: String(row.sortOrder),
                    description: row.description ?? "",
                  },
                })
              }
            >
              Edit
            </Button>
            <Button
              variant="secondary"
              onClick={() => {
                const ok = window.confirm("Archive this category?");
                if (ok) archiveMutation.mutate(row.id);
              }}
              disabled={isBusy}
            >
              Archive
            </Button>
          </div>
        ),
      },
    ],
    [archiveMutation, isBusy],
  );

  const canCreate =
    createForm.name.trim() &&
    createForm.slug.trim() &&
    createForm.svgUrl.trim();

  return (
    <div className="space-y-4">
      <AdminSectionHeader title="Categories" description="Admin" />

      <Card>
        <CardBody className="space-y-3">
          <SectionTitle title="Create category" />
          <div className="grid gap-3 md:grid-cols-2">
            <Input
              value={createForm.name}
              onChange={(event) =>
                setCreateForm((prev) => ({
                  ...prev,
                  name: event.target.value,
                }))
              }
              placeholder="Name"
            />
            <Input
              value={createForm.slug}
              onChange={(event) =>
                setCreateForm((prev) => ({
                  ...prev,
                  slug: event.target.value,
                }))
              }
              placeholder="Slug"
            />
            <Input
              value={createForm.svgUrl}
              onChange={(event) =>
                setCreateForm((prev) => ({
                  ...prev,
                  svgUrl: event.target.value,
                }))
              }
              placeholder="SVG URL"
            />
            <Input
              type="number"
              value={createForm.sortOrder}
              onChange={(event) =>
                setCreateForm((prev) => ({
                  ...prev,
                  sortOrder: event.target.value,
                }))
              }
              placeholder="Sort order"
            />
            <textarea
              className="min-h-[96px] rounded-2xl border border-lp-border bg-white px-3 py-2 text-sm text-lp-text md:col-span-2"
              value={createForm.description}
              onChange={(event) =>
                setCreateForm((prev) => ({
                  ...prev,
                  description: event.target.value,
                }))
              }
              placeholder="Description (optional)"
            />
          </div>
          <div>
            <Button
              onClick={() => {
                createMutation
                  .mutateAsync({
                    name: createForm.name.trim(),
                    slug: createForm.slug.trim(),
                    svgUrl: createForm.svgUrl.trim(),
                    sortOrder: coerceSortOrder(createForm.sortOrder),
                    description: createForm.description.trim() || undefined,
                  })
                  .then(() => setCreateForm(emptyForm));
              }}
              disabled={!canCreate || isBusy}
            >
              Create
            </Button>
          </div>
        </CardBody>
      </Card>

      <Card>
        <CardBody className="space-y-3">
          <SectionTitle title="Active categories" />
          <AdminListStates
            isLoading={isLoading}
            error={error}
            isEmpty={isEmpty}
            emptyTitle="No categories"
            emptyDescription="Create the first category above."
          />
          {!isLoading && !error && !isEmpty ? (
            <AdminTable
              columns={columns}
              rows={categories}
              getRowKey={(row) => row.id}
            />
          ) : null}
        </CardBody>
      </Card>

      <Card>
        <CardBody className="space-y-3">
          <SectionTitle title="Advanced restore" hint="Requires archived ID" />
          <div className="flex flex-col gap-2 md:flex-row md:items-center">
            <Input
              value={restoreId}
              onChange={(event) => setRestoreId(event.target.value)}
              placeholder="Archived category ID"
            />
            <Button
              variant="secondary"
              onClick={() => restoreMutation.mutate(restoreId.trim())}
              disabled={!restoreId.trim() || isBusy}
            >
              Restore by ID
            </Button>
          </div>
        </CardBody>
      </Card>

      <Sheet
        open={Boolean(editState)}
        onClose={() => setEditState(null)}
        title="Edit category"
        subtitle={editState?.form.name}
      >
        {editState ? (
          <div className="space-y-3">
            <Input
              value={editState.form.name}
              onChange={(event) =>
                setEditState((prev) =>
                  prev
                    ? { ...prev, form: { ...prev.form, name: event.target.value } }
                    : prev,
                )
              }
              placeholder="Name"
            />
            <Input
              value={editState.form.slug}
              onChange={(event) =>
                setEditState((prev) =>
                  prev
                    ? { ...prev, form: { ...prev.form, slug: event.target.value } }
                    : prev,
                )
              }
              placeholder="Slug"
            />
            <Input
              value={editState.form.svgUrl}
              onChange={(event) =>
                setEditState((prev) =>
                  prev
                    ? { ...prev, form: { ...prev.form, svgUrl: event.target.value } }
                    : prev,
                )
              }
              placeholder="SVG URL"
            />
            <Input
              type="number"
              value={editState.form.sortOrder}
              onChange={(event) =>
                setEditState((prev) =>
                  prev
                    ? {
                        ...prev,
                        form: { ...prev.form, sortOrder: event.target.value },
                      }
                    : prev,
                )
              }
              placeholder="Sort order"
            />
            <textarea
              className="min-h-[96px] w-full rounded-2xl border border-lp-border bg-white px-3 py-2 text-sm text-lp-text"
              value={editState.form.description}
              onChange={(event) =>
                setEditState((prev) =>
                  prev
                    ? {
                        ...prev,
                        form: { ...prev.form, description: event.target.value },
                      }
                    : prev,
                )
              }
              placeholder="Description (optional)"
            />
            <div className="flex gap-2">
              <Button
                onClick={() => {
                  updateMutation
                    .mutateAsync({
                      id: editState.id,
                      payload: {
                        name: editState.form.name.trim(),
                        slug: editState.form.slug.trim(),
                        svgUrl: editState.form.svgUrl.trim(),
                        sortOrder: coerceSortOrder(editState.form.sortOrder),
                        description:
                          editState.form.description.trim() || undefined,
                      },
                    })
                    .then(() => setEditState(null));
                }}
                disabled={isBusy}
              >
                Save
              </Button>
              <Button variant="secondary" onClick={() => setEditState(null)}>
                Cancel
              </Button>
            </div>
          </div>
        ) : null}
      </Sheet>
    </div>
  );
}
