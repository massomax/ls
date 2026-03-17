"use client";
/* eslint-disable @next/next/no-img-element */

import { useState } from "react";
import { Badge, Button, Card, CardBody } from "@ui/components";
import type { SellerProductListItem, SellerProductStatus } from "@/src/lib/api/sellerProducts";

const rubFmt = new Intl.NumberFormat("ru-RU");

function rub(n: number) {
  return `${rubFmt.format(n)} ₽`;
}

const STATUS_LABELS: Record<SellerProductStatus, string> = {
  draft: "Черновик",
  pending: "На модерации",
  active: "Активен",
  rejected: "Отклонен",
  archived: "Архив",
};

const STATUS_CLASSES: Record<SellerProductStatus, string> = {
  draft: "border-slate-200 bg-slate-50 text-slate-700",
  pending: "border-amber-200 bg-amber-50 text-amber-700",
  active: "border-emerald-200 bg-emerald-50 text-emerald-700",
  rejected: "border-rose-200 bg-rose-50 text-rose-700",
  archived: "border-slate-200 bg-slate-50 text-slate-600",
};

type Props = {
  product: SellerProductListItem;
  onEdit?: () => void;
  onView?: () => void;
  onPublish?: () => void;
  onUnpublish?: () => void;
  onArchive?: () => void;
  isPublishing?: boolean;
  isUnpublishing?: boolean;
  isArchiving?: boolean;
};

export default function SellerProductCard({
  product,
  onEdit,
  onView,
  onPublish,
  onUnpublish,
  onArchive,
  isPublishing = false,
  isUnpublishing = false,
  isArchiving = false,
}: Props) {
  const [imageError, setImageError] = useState(false);
  const previewSrc = product.photos?.[0];
  const showImage = Boolean(previewSrc) && !imageError;
  const showModeration =
    product.status === "pending" || product.status === "rejected";

  const createdAt = new Date(product.createdAt);
  const createdLabel = Number.isNaN(createdAt.getTime())
    ? product.createdAt
    : createdAt.toLocaleDateString("ru-RU");

  return (
    <Card>
      <CardBody className="space-y-3">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-3">
            <div className="relative h-14 w-14 overflow-hidden rounded-xl">
              <div
                className="h-full w-full"
                style={{
                  background:
                    "linear-gradient(135deg, rgba(11,27,51,0.10), rgba(246,183,60,0.12))",
                }}
              />
              {showImage ? (
                <img
                  src={previewSrc}
                  alt={product.title}
                  loading="lazy"
                  decoding="async"
                  onError={() => setImageError(true)}
                  className="absolute inset-0 h-full w-full object-cover"
                />
              ) : null}
            </div>
            <div className="space-y-1">
              <div className="text-sm font-semibold text-lp-text">
                {product.title}
              </div>
              <div className="text-xs text-lp-muted">Создано: {createdLabel}</div>
            </div>
          </div>
          <Badge className={STATUS_CLASSES[product.status]}>
            {STATUS_LABELS[product.status]}
          </Badge>
        </div>

        <div className="flex items-baseline gap-2">
          <div className="text-lg font-bold text-lp-text">
            {rub(product.price)}
          </div>
          <div className="text-xs text-lp-muted line-through">
            {rub(product.oldPrice)}
          </div>
        </div>

        <div className="text-xs text-lp-muted">
          ❤ {product.favoritesCount} · 👁 {product.views7d} за 7д
        </div>

        {showModeration ? (
          <div className="rounded-xl border border-lp-border bg-slate-50 px-3 py-2 text-xs text-slate-700">
            {product.moderationNote
              ? `Комментарий модератора: ${product.moderationNote}`
              : "Комментарий модератора пока не получен."}
          </div>
        ) : null}

        <div className="flex flex-wrap items-center gap-2">
          {onView ? (
            <Button variant="secondary" onClick={onView}>
              Посмотреть
            </Button>
          ) : null}

          {product.status === "draft" || product.status === "active" || product.status === "rejected" ? (
            onEdit ? (
              <Button variant="secondary" onClick={onEdit}>
                Редактировать
              </Button>
            ) : null
          ) : null}

          {product.status === "draft" || product.status === "rejected" ? (
            onPublish ? (
              <Button onClick={onPublish} disabled={isPublishing}>
                На модерацию
              </Button>
            ) : null
          ) : null}

          {product.status === "active" ? (
            onUnpublish ? (
              <Button onClick={onUnpublish} disabled={isUnpublishing}>
                Снять
              </Button>
            ) : null
          ) : null}

          {product.status === "draft" || product.status === "active" || product.status === "rejected" ? (
            onArchive ? (
              <Button variant="secondary" onClick={onArchive} disabled={isArchiving}>
                В архив
              </Button>
            ) : null
          ) : null}
        </div>
      </CardBody>
    </Card>
  );
}
