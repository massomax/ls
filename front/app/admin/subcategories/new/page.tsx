"use client";

import { useMemo, useState } from "react";
import { Button, Card, CardBody, Input, SectionTitle } from "@ui/components";
import AdminSectionHeader from "@/components/admin/AdminSectionHeader";
import { useCategories } from "@/lib/queries/categories";
import { useCreateAdminSubcategory } from "@/lib/queries/adminSubcategories";

const emptyForm = {
  parentCategoryId: "",
  name: "",
  slug: "",
  description: "",
};

type FormState = typeof emptyForm;

export default function AdminSubcategoriesNewPage() {
  const categoriesQuery = useCategories();
  const createMutation = useCreateAdminSubcategory();

  const [form, setForm] = useState<FormState>(emptyForm);

  const categories = useMemo(() => categoriesQuery.data ?? [], [categoriesQuery.data]);
  const isBusy = createMutation.isPending;

  const canCreate = form.parentCategoryId.trim() && form.name.trim();

  return (
    <div className="space-y-4">
      <AdminSectionHeader title="Create subcategory" description="Admin" />

      <Card>
        <CardBody className="space-y-3">
          <SectionTitle title="New subcategory" />

          <div className="grid gap-3 md:grid-cols-2">
            <div className="md:col-span-2">
              <label className="text-xs font-semibold uppercase tracking-wide text-lp-muted">
                Parent category
              </label>
              <select
                className="mt-1 w-full rounded-2xl border border-lp-border bg-white px-3 py-2 text-sm text-lp-text"
                value={form.parentCategoryId}
                onChange={(event) =>
                  setForm((prev) => ({ ...prev, parentCategoryId: event.target.value }))
                }
              >
                <option value="">Select category</option>
                {categories.map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.name}
                  </option>
                ))}
              </select>
            </div>

            <Input
              value={form.name}
              onChange={(event) =>
                setForm((prev) => ({ ...prev, name: event.target.value }))
              }
              placeholder="Name"
            />
            <Input
              value={form.slug}
              onChange={(event) =>
                setForm((prev) => ({ ...prev, slug: event.target.value }))
              }
              placeholder="Slug (optional)"
            />
            <textarea
              className="min-h-[96px] rounded-2xl border border-lp-border bg-white px-3 py-2 text-sm text-lp-text md:col-span-2"
              value={form.description}
              onChange={(event) =>
                setForm((prev) => ({ ...prev, description: event.target.value }))
              }
              placeholder="Description (optional)"
            />
          </div>

          <div>
            <Button
              onClick={() => {
                if (!canCreate) return;
                createMutation
                  .mutateAsync({
                    payload: {
                      parentCategoryId: form.parentCategoryId.trim(),
                      name: form.name.trim(),
                      description: form.description.trim() || undefined,
                    },
                    approvePayload: {
                      name: form.name.trim(),
                      slug: form.slug.trim() || undefined,
                      description: form.description.trim() || undefined,
                    },
                  })
                  .then(() => setForm(emptyForm));
              }}
              disabled={!canCreate || isBusy}
            >
              Create
            </Button>
          </div>
        </CardBody>
      </Card>
    </div>
  );
}
