"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Button, Card, CardBody, Input, SectionTitle } from "@ui/components";
import PageStateEmpty from "@/components/state/PageStateEmpty";
import PageStateError from "@/components/state/PageStateError";
import PageStateSkeleton from "@/components/state/PageStateSkeleton";
import { isApiError } from "@/lib/api/apiError";
import { type AdminProductTag } from "@/lib/api/adminProducts";
import {
  useAdminProduct,
  useApproveAdminProduct,
  useArchiveAdminProduct,
  useHardDeleteAdminProduct,
  usePublishAdminProduct,
  useRejectAdminProduct,
  useRestoreAdminProduct,
  useSetAdminProductFeature,
  useSetAdminProductPromotion,
  useSetAdminProductTags,
  useUnpublishAdminProduct,
} from "@/lib/queries/adminProducts";

const TAG_OPTIONS: ReadonlyArray<AdminProductTag> = [
  "best",
  "popular",
  "new",
];

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-1">
      <div className="text-xs font-semibold uppercase tracking-wide text-lp-muted">
        {label}
      </div>
      <div className="text-sm text-lp-text break-words">{value}</div>
    </div>
  );
}

function formatDate(value: string | null | undefined) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString("ru-RU");
}

function formatDetailValue(value: string | null | undefined) {
  return value && value.trim() ? value : "—";
}

function toDateTimeLocal(value: string | null | undefined) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const offsetMs = date.getTimezoneOffset() * 60_000;
  const local = new Date(date.getTime() - offsetMs);
  return local.toISOString().slice(0, 16);
}

function fromDateTimeLocal(value: string) {
  if (!value) return undefined;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return undefined;
  return date.toISOString();
}

function clampBoostInput(value: string) {
  if (!value) return null;
  const num = Number(value);
  if (Number.isNaN(num)) return null;
  return num;
}

export default function AdminProductDetailPage() {
  const router = useRouter();
  const params = useParams();
  const idParam = params?.id;
  const id = Array.isArray(idParam) ? idParam[0] : idParam;

  const detailQuery = useAdminProduct(id ?? "", Boolean(id));
  const approveMutation = useApproveAdminProduct();
  const rejectMutation = useRejectAdminProduct();
  const publishMutation = usePublishAdminProduct();
  const unpublishMutation = useUnpublishAdminProduct();
  const archiveMutation = useArchiveAdminProduct();
  const restoreMutation = useRestoreAdminProduct();
  const featureMutation = useSetAdminProductFeature();
  const tagsMutation = useSetAdminProductTags();
  const promotionMutation = useSetAdminProductPromotion();
  const deleteMutation = useHardDeleteAdminProduct();

  const [rejectReason, setRejectReason] = useState("");
  const [featured, setFeatured] = useState<boolean | null>(null);
  const [featuredUntil, setFeaturedUntil] = useState<string | null>(null);
  const [selectedTags, setSelectedTags] = useState<AdminProductTag[] | null>(
    null,
  );
  const [promoBoostInput, setPromoBoostInput] = useState<string | null>(null);
  const [promoUntil, setPromoUntil] = useState<string | null>(null);

  const product = detailQuery.data ?? null;

  const isBusy =
    approveMutation.isPending ||
    rejectMutation.isPending ||
    publishMutation.isPending ||
    unpublishMutation.isPending ||
    archiveMutation.isPending ||
    restoreMutation.isPending ||
    featureMutation.isPending ||
    tagsMutation.isPending ||
    promotionMutation.isPending ||
    deleteMutation.isPending;

  const resolvedFeatured = featured ?? product?.isFeatured ?? false;
  const resolvedFeaturedUntil =
    featuredUntil ?? toDateTimeLocal(product?.featuredUntil ?? null);
  const resolvedTags = selectedTags ?? product?.adminTags ?? [];
  const resolvedPromoBoostInput =
    promoBoostInput ??
    (product ? String(product.rankAdminBoost) : "");
  const resolvedPromoUntil =
    promoUntil ?? toDateTimeLocal(product?.promotionUntil ?? null);

  const promoBoostValue = clampBoostInput(resolvedPromoBoostInput);
  const promoBoostValid =
    promoBoostValue !== null && promoBoostValue >= 0 && promoBoostValue <= 1;

  if (!id) {
    return (
      <PageStateEmpty
        title="Product not found"
        hint="Missing product id."
        actionText="Back to products"
        onAction={() => router.push("/admin/products")}
      />
    );
  }

  if (detailQuery.isLoading) {
    return <PageStateSkeleton rows={4} />;
  }

  if (detailQuery.isError) {
    if (isApiError(detailQuery.error) && detailQuery.error.status === 404) {
      return (
        <PageStateEmpty
          title="Product not found"
          hint="The product no longer exists."
          actionText="Back to products"
          onAction={() => router.push("/admin/products")}
        />
      );
    }

    return (
      <PageStateError
        title="Failed to load product"
        message="Please try again."
        onRetry={() => detailQuery.refetch()}
      />
    );
  }

  if (!product) {
    return (
      <PageStateEmpty
        title="Product not found"
        hint="No data returned for this product."
        actionText="Back to products"
        onAction={() => router.push("/admin/products")}
      />
    );
  }

  const infoItems: Array<{ label: string; value: string }> = [
    { label: "Product ID", value: product.id },
    { label: "Seller ID", value: product.sellerId },
    { label: "Title", value: product.title },
    { label: "Status", value: product.status },
    { label: "Price", value: String(product.price) },
    { label: "Old price", value: String(product.oldPrice) },
    { label: "Category ID", value: product.mainCategoryId },
    {
      label: "Subcategory ID",
      value: product.subcategoryId ?? "—",
    },
    { label: "Offer type ID", value: product.offerTypeId },
    { label: "External URL", value: formatDetailValue(product.externalUrl) },
    { label: "Moderation note", value: formatDetailValue(product.moderationNote ?? null) },
    { label: "Approved at", value: formatDate(product.approvedAt ?? null) },
    { label: "Rejected at", value: formatDate(product.rejectedAt ?? null) },
    { label: "Created at", value: formatDate(product.createdAt) },
    { label: "Updated at", value: formatDate(product.updatedAt) },
  ];

  const referenceItems: Array<{ label: string; value: string }> = [];
  if (product.seller) {
    referenceItems.push({
      label: "Seller",
      value: `${product.seller.companyName} (${product.seller.status})`,
    });
  }
  if (product.category) {
    referenceItems.push({
      label: "Category",
      value: product.category.name,
    });
  }
  if (product.subcategory) {
    referenceItems.push({
      label: "Subcategory",
      value: product.subcategory.name,
    });
  }
  if (product.offerType) {
    referenceItems.push({
      label: "Offer type",
      value: `${product.offerType.name} (${product.offerType.slug})`,
    });
  }

  const photoSummary = product.photos.length
    ? product.photos.join("\n")
    : "—";

  return (
    <div className="space-y-4">
      <SectionTitle title="Product" hint={product.title} />

      <Card>
        <CardBody className="grid gap-4 md:grid-cols-2">
          {infoItems.map((item) => (
            <InfoRow key={item.label} label={item.label} value={item.value} />
          ))}
        </CardBody>
      </Card>

      {referenceItems.length ? (
        <Card>
          <CardBody className="grid gap-4 md:grid-cols-2">
            {referenceItems.map((item) => (
              <InfoRow key={item.label} label={item.label} value={item.value} />
            ))}
          </CardBody>
        </Card>
      ) : null}

      <Card>
        <CardBody className="space-y-2">
          <div className="text-xs font-semibold uppercase tracking-wide text-lp-muted">
            Photos
          </div>
          <pre className="whitespace-pre-wrap text-xs text-lp-text">
            {photoSummary}
          </pre>
        </CardBody>
      </Card>

      <Card>
        <CardBody className="space-y-4">
          <div className="text-sm font-semibold text-lp-text">Actions</div>
          <div className="flex flex-wrap gap-2">
            <Button onClick={() => approveMutation.mutate(product.id)} disabled={isBusy}>
              Approve
            </Button>
            <Button
              variant="secondary"
              onClick={() => rejectMutation.mutate({ id: product.id, reason: rejectReason || undefined })}
              disabled={isBusy}
            >
              Reject
            </Button>
            <Button
              variant="secondary"
              onClick={() => publishMutation.mutate(product.id)}
              disabled={isBusy}
            >
              Publish
            </Button>
            <Button
              variant="secondary"
              onClick={() => unpublishMutation.mutate(product.id)}
              disabled={isBusy}
            >
              Unpublish
            </Button>
            <Button
              variant="secondary"
              onClick={() => archiveMutation.mutate(product.id)}
              disabled={isBusy}
            >
              Archive
            </Button>
            <Button
              variant="secondary"
              onClick={() => restoreMutation.mutate(product.id)}
              disabled={isBusy}
            >
              Restore
            </Button>
            <Button
              variant="secondary"
              onClick={() => {
                const ok = window.confirm("Delete this product permanently?");
                if (ok) deleteMutation.mutate(product.id);
              }}
              disabled={isBusy}
            >
              Hard delete
            </Button>
          </div>

          <div className="space-y-2">
            <div className="text-xs font-semibold uppercase tracking-wide text-lp-muted">
              Reject reason
            </div>
            <Input
              value={rejectReason}
              onChange={(event) => setRejectReason(event.target.value)}
              placeholder="Reason (optional)"
            />
          </div>

          <div className="space-y-2">
            <div className="text-xs font-semibold uppercase tracking-wide text-lp-muted">
              Feature
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <label className="flex items-center gap-2 text-sm text-lp-text">
                <input
                  type="checkbox"
                  checked={resolvedFeatured}
                  onChange={(event) => setFeatured(event.target.checked)}
                />
                Featured
              </label>
              <Input
                type="datetime-local"
                value={resolvedFeaturedUntil}
                onChange={(event) => setFeaturedUntil(event.target.value)}
                placeholder="Featured until"
              />
              <Button
                onClick={() =>
                  featureMutation.mutate({
                    id: product.id,
                    featured: resolvedFeatured,
                    featuredUntil: fromDateTimeLocal(resolvedFeaturedUntil),
                  })
                }
                disabled={isBusy}
              >
                Apply
              </Button>
            </div>
          </div>

          <div className="space-y-2">
            <div className="text-xs font-semibold uppercase tracking-wide text-lp-muted">
              Tags
            </div>
            <div className="flex flex-wrap items-center gap-3">
              {TAG_OPTIONS.map((tag) => (
                <label key={tag} className="flex items-center gap-2 text-sm text-lp-text">
                  <input
                    type="checkbox"
                    checked={resolvedTags.includes(tag)}
                    onChange={(event) => {
                      const next = event.target.checked
                        ? Array.from(new Set([...resolvedTags, tag]))
                        : resolvedTags.filter((item) => item !== tag);
                      setSelectedTags(next);
                    }}
                  />
                  {tag}
                </label>
              ))}
              <Button
                onClick={() =>
                  tagsMutation.mutate({ id: product.id, tags: resolvedTags })
                }
                disabled={isBusy}
              >
                Apply
              </Button>
            </div>
          </div>

          <div className="space-y-2">
            <div className="text-xs font-semibold uppercase tracking-wide text-lp-muted">
              Promotion
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Input
                type="number"
                min={0}
                max={1}
                step={0.05}
                value={resolvedPromoBoostInput}
                onChange={(event) => setPromoBoostInput(event.target.value)}
                placeholder="Rank boost (0..1)"
              />
              <Input
                type="datetime-local"
                value={resolvedPromoUntil}
                onChange={(event) => setPromoUntil(event.target.value)}
                placeholder="Promotion until"
              />
              <Button
                onClick={() => {
                  if (promoBoostValue === null) return;
                  promotionMutation.mutate({
                    id: product.id,
                    rankAdminBoost: promoBoostValue,
                    until: fromDateTimeLocal(resolvedPromoUntil),
                  });
                }}
                disabled={isBusy || !promoBoostValid}
              >
                Apply
              </Button>
            </div>
            {!promoBoostValid ? (
              <div className="text-xs text-rose-600">
                Enter a number between 0 and 1.
              </div>
            ) : null}
          </div>
        </CardBody>
      </Card>
    </div>
  );
}
