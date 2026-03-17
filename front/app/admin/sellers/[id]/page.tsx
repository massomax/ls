"use client";

import { useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Button, Card, CardBody, Input, SectionTitle } from "@ui/components";
import PageStateEmpty from "@/components/state/PageStateEmpty";
import PageStateError from "@/components/state/PageStateError";
import PageStateSkeleton from "@/components/state/PageStateSkeleton";
import { isApiError } from "@/lib/api/apiError";
import { type AdminSellerTier } from "@/lib/api/adminSellers";
import {
  useAdminSeller,
  useApproveAdminSeller,
  useRejectAdminSeller,
  useSuspendAdminSeller,
  useUnsuspendAdminSeller,
  useSetAdminSellerTier,
} from "@/lib/queries/adminSellers";

const TIER_OPTIONS: ReadonlyArray<AdminSellerTier> = [
  "free",
  "plus",
  "pro",
];

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-1">
      <div className="text-xs font-semibold uppercase tracking-wide text-lp-muted">
        {label}
      </div>
      <div className="text-sm text-lp-text">{value}</div>
    </div>
  );
}

function formatDate(value: string | null) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString("ru-RU");
}

function formatDetailValue(value: string | null | undefined) {
  return value && value.trim() ? value : "—";
}

export default function AdminSellerDetailPage() {
  const router = useRouter();
  const params = useParams();
  const idParam = params?.id;
  const id = Array.isArray(idParam) ? idParam[0] : idParam;

  const detailQuery = useAdminSeller(id ?? "", Boolean(id));
  const approveMutation = useApproveAdminSeller();
  const rejectMutation = useRejectAdminSeller();
  const suspendMutation = useSuspendAdminSeller();
  const unsuspendMutation = useUnsuspendAdminSeller();
  const tierMutation = useSetAdminSellerTier();

  const [rejectReason, setRejectReason] = useState("");
  const [tier, setTier] = useState<AdminSellerTier>("free");

  const seller = detailQuery.data ?? null;

  const isBusy =
    approveMutation.isPending ||
    rejectMutation.isPending ||
    suspendMutation.isPending ||
    unsuspendMutation.isPending ||
    tierMutation.isPending;

  const resolvedTier = useMemo(() => seller?.tier ?? tier, [seller?.tier, tier]);

  if (!id) {
    return (
      <PageStateEmpty
        title="Seller not found"
        hint="Missing seller id."
        actionText="Back to sellers"
        onAction={() => router.push("/admin/sellers")}
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
          title="Seller not found"
          hint="The seller profile no longer exists."
          actionText="Back to sellers"
          onAction={() => router.push("/admin/sellers")}
        />
      );
    }

    return (
      <PageStateError
        title="Failed to load seller"
        message="Please try again."
        onRetry={() => detailQuery.refetch()}
      />
    );
  }

  if (!seller) {
    return (
      <PageStateEmpty
        title="Seller not found"
        hint="No data returned for this seller."
        actionText="Back to sellers"
        onAction={() => router.push("/admin/sellers")}
      />
    );
  }

  const infoItems: Array<{ label: string; value: string }> = [
    { label: "Seller ID", value: seller.id },
    { label: "User ID", value: seller.userId },
    { label: "Company", value: seller.companyName },
    { label: "INN", value: seller.inn },
    { label: "OGRN", value: formatDetailValue(seller.ogrn) },
    { label: "Legal address", value: formatDetailValue(seller.legalAddress) },
    { label: "Website", value: formatDetailValue(seller.website) },
    { label: "Contact name", value: formatDetailValue(seller.contactName) },
    { label: "Contact email", value: formatDetailValue(seller.contactEmail) },
    { label: "Phone", value: formatDetailValue(seller.phone) },
    { label: "Roles", value: seller.roles.length ? seller.roles.join(", ") : "—" },
    { label: "Status", value: seller.status },
    { label: "Tier", value: seller.tier },
    { label: "Verified", value: seller.isVerified ? "Yes" : "No" },
    { label: "Moderation note", value: formatDetailValue(seller.moderationNote) },
    { label: "Approved at", value: formatDate(seller.approvedAt) },
    { label: "Rejected at", value: formatDate(seller.rejectedAt) },
    { label: "Suspended at", value: formatDate(seller.suspendedAt) },
    { label: "Created at", value: formatDate(seller.createdAt) },
    { label: "Updated at", value: formatDate(seller.updatedAt) },
  ];

  return (
    <div className="space-y-4">
      <SectionTitle title="Seller" hint={seller.companyName} />

      <Card>
        <CardBody className="grid gap-4 md:grid-cols-2">
          {infoItems.map((item) => (
            <InfoRow key={item.label} label={item.label} value={item.value} />
          ))}
        </CardBody>
      </Card>

      <Card>
        <CardBody className="space-y-4">
          <div className="text-sm font-semibold text-lp-text">Actions</div>
          <div className="flex flex-wrap gap-2">
            <Button
              onClick={() => approveMutation.mutate(seller.id)}
              disabled={isBusy}
            >
              Approve
            </Button>
            <Button
              variant="secondary"
              onClick={() => suspendMutation.mutate(seller.id)}
              disabled={isBusy}
            >
              Suspend
            </Button>
            <Button
              variant="secondary"
              onClick={() => unsuspendMutation.mutate(seller.id)}
              disabled={isBusy}
            >
              Unsuspend
            </Button>
          </div>

          <div className="space-y-2">
            <div className="text-xs font-semibold uppercase tracking-wide text-lp-muted">
              Reject
            </div>
            <Input
              value={rejectReason}
              onChange={(event) => setRejectReason(event.target.value)}
              placeholder="Reason (optional)"
            />
            <Button
              variant="secondary"
              onClick={() => rejectMutation.mutate({ id: seller.id, reason: rejectReason || undefined })}
              disabled={isBusy}
            >
              Reject
            </Button>
          </div>

          <div className="space-y-2">
            <div className="text-xs font-semibold uppercase tracking-wide text-lp-muted">
              Tier
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <select
                className="w-full rounded-2xl border border-lp-border bg-white px-3 py-2 text-sm text-lp-text md:w-48"
                value={resolvedTier}
                onChange={(event) =>
                  setTier(event.target.value as AdminSellerTier)
                }
              >
                {TIER_OPTIONS.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
              <Button
                onClick={() => tierMutation.mutate({ id: seller.id, tier: resolvedTier })}
                disabled={isBusy}
              >
                Apply tier
              </Button>
            </div>
          </div>
        </CardBody>
      </Card>
    </div>
  );
}
