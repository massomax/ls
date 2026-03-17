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
import { useOfferTypes } from "@/lib/queries/offerTypes";
import {
  useArchiveAdminOfferType,
  useCreateAdminOfferType,
  useMergeAdminOfferType,
  useUpdateAdminOfferType,
} from "@/lib/queries/adminOfferTypes";
import type { OfferType } from "@ui/components";

const emptyForm = {
  name: "",
  slug: "",
  sortOrder: "0",
  boostMultiplier: "1",
  badgeText: "",
  badgeColor: "",
  description: "",
};

type OfferTypeFormState = typeof emptyForm;

type EditState = {
  id: string;
  form: OfferTypeFormState;
};

type MergeState = {
  id: string;
  targetId: string;
};

function coerceNumber(value: string, fallback: number) {
  const parsed = Number(value);
  return Number.isNaN(parsed) ? fallback : parsed;
}

function buildUpdatePayload(form: OfferTypeFormState) {
  const payload: {
    name?: string;
    slug?: string;
    sortOrder?: number;
    boostMultiplier?: number;
    badgeText?: string;
    badgeColor?: string;
    description?: string;
  } = {};

  if (form.name.trim()) payload.name = form.name.trim();
  if (form.slug.trim()) payload.slug = form.slug.trim();
  if (form.sortOrder.trim()) {
    payload.sortOrder = coerceNumber(form.sortOrder, 0);
  }
  if (form.boostMultiplier.trim()) {
    payload.boostMultiplier = coerceNumber(form.boostMultiplier, 1);
  }
  if (form.badgeText.trim()) payload.badgeText = form.badgeText.trim();
  if (form.badgeColor.trim()) payload.badgeColor = form.badgeColor.trim();
  if (form.description.trim()) payload.description = form.description.trim();

  return payload;
}

export default function AdminOfferTypesPage() {
  const offerTypesQuery = useOfferTypes();
  const createMutation = useCreateAdminOfferType();
  const updateMutation = useUpdateAdminOfferType();
  const archiveMutation = useArchiveAdminOfferType();
  const mergeMutation = useMergeAdminOfferType();

  const [createForm, setCreateForm] = useState<OfferTypeFormState>(emptyForm);
  const [editState, setEditState] = useState<EditState | null>(null);
  const [mergeState, setMergeState] = useState<MergeState | null>(null);

  const offerTypes = offerTypesQuery.data ?? [];
  const isLoading = offerTypesQuery.isLoading;
  const error = offerTypesQuery.error;
  const isEmpty = !isLoading && !error && offerTypes.length === 0;

  const isBusy =
    createMutation.isPending ||
    updateMutation.isPending ||
    archiveMutation.isPending ||
    mergeMutation.isPending;

  const columns = useMemo<AdminTableColumn<OfferType>[]>(
    () => [
      { key: "name", header: "Name", render: (row) => row.name },
      { key: "slug", header: "Slug", render: (row) => row.slug },
      {
        key: "badgeText",
        header: "Badge",
        render: (row) => row.badgeText ?? "—",
      },
      {
        key: "badgeColor",
        header: "Badge color",
        render: (row) => row.badgeColor ?? "—",
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
                    sortOrder: "",
                    boostMultiplier: "",
                    badgeText: row.badgeText ?? "",
                    badgeColor: row.badgeColor ?? "",
                    description: "",
                  },
                })
              }
            >
              Edit
            </Button>
            <Button
              variant="secondary"
              onClick={() => setMergeState({ id: row.id, targetId: "" })}
            >
              Merge
            </Button>
            <Button
              variant="secondary"
              onClick={() => {
                const ok = window.confirm("Archive this offer type?");
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
    createForm.sortOrder.trim() &&
    createForm.boostMultiplier.trim();

  return (
    <div className="space-y-4">
      <AdminSectionHeader title="Offer types" description="Admin" />

      <Card>
        <CardBody className="space-y-3">
          <SectionTitle title="Create offer type" />
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
            <Input
              type="number"
              value={createForm.boostMultiplier}
              onChange={(event) =>
                setCreateForm((prev) => ({
                  ...prev,
                  boostMultiplier: event.target.value,
                }))
              }
              placeholder="Boost multiplier"
            />
            <Input
              value={createForm.badgeText}
              onChange={(event) =>
                setCreateForm((prev) => ({
                  ...prev,
                  badgeText: event.target.value,
                }))
              }
              placeholder="Badge text (optional)"
            />
            <Input
              value={createForm.badgeColor}
              onChange={(event) =>
                setCreateForm((prev) => ({
                  ...prev,
                  badgeColor: event.target.value,
                }))
              }
              placeholder="Badge color (optional)"
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
                    sortOrder: coerceNumber(createForm.sortOrder, 0),
                    boostMultiplier: coerceNumber(createForm.boostMultiplier, 1),
                    badgeText: createForm.badgeText.trim() || undefined,
                    badgeColor: createForm.badgeColor.trim() || undefined,
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
          <SectionTitle title="Active offer types" />
          <AdminListStates
            isLoading={isLoading}
            error={error}
            isEmpty={isEmpty}
            emptyTitle="No offer types"
            emptyDescription="Create the first offer type above."
          />
          {!isLoading && !error && !isEmpty ? (
            <AdminTable
              columns={columns}
              rows={offerTypes}
              getRowKey={(row) => row.id}
            />
          ) : null}
        </CardBody>
      </Card>

      <Sheet
        open={Boolean(editState)}
        onClose={() => setEditState(null)}
        title="Edit offer type"
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
              placeholder="Sort order (leave blank to keep)"
            />
            <Input
              type="number"
              value={editState.form.boostMultiplier}
              onChange={(event) =>
                setEditState((prev) =>
                  prev
                    ? {
                        ...prev,
                        form: {
                          ...prev.form,
                          boostMultiplier: event.target.value,
                        },
                      }
                    : prev,
                )
              }
              placeholder="Boost multiplier (leave blank to keep)"
            />
            <Input
              value={editState.form.badgeText}
              onChange={(event) =>
                setEditState((prev) =>
                  prev
                    ? {
                        ...prev,
                        form: { ...prev.form, badgeText: event.target.value },
                      }
                    : prev,
                )
              }
              placeholder="Badge text (optional)"
            />
            <Input
              value={editState.form.badgeColor}
              onChange={(event) =>
                setEditState((prev) =>
                  prev
                    ? {
                        ...prev,
                        form: { ...prev.form, badgeColor: event.target.value },
                      }
                    : prev,
                )
              }
              placeholder="Badge color (optional)"
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
                  const payload = buildUpdatePayload(editState.form);
                  updateMutation
                    .mutateAsync({ id: editState.id, payload })
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

      <Sheet
        open={Boolean(mergeState)}
        onClose={() => setMergeState(null)}
        title="Merge offer type"
        subtitle="Select a target offer type"
      >
        {mergeState ? (
          <div className="space-y-3">
            <div className="text-sm text-lp-muted">
              Source: {mergeState.id}
            </div>
            <select
              className="w-full rounded-2xl border border-lp-border bg-white px-3 py-2 text-sm text-lp-text"
              value={mergeState.targetId}
              onChange={(event) =>
                setMergeState((prev) =>
                  prev ? { ...prev, targetId: event.target.value } : prev,
                )
              }
            >
              <option value="">Select target</option>
              {offerTypes
                .filter((item) => item.id !== mergeState.id)
                .map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.name}
                  </option>
                ))}
            </select>
            <div className="flex gap-2">
              <Button
                onClick={() =>
                  mergeMutation
                    .mutateAsync({
                      id: mergeState.id,
                      targetId: mergeState.targetId,
                    })
                    .then(() => setMergeState(null))
                }
                disabled={!mergeState.targetId || isBusy}
              >
                Merge
              </Button>
              <Button variant="secondary" onClick={() => setMergeState(null)}>
                Cancel
              </Button>
            </div>
          </div>
        ) : null}
      </Sheet>
    </div>
  );
}
