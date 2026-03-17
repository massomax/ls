"use client";
/* eslint-disable @next/next/no-img-element */

import { useState } from "react";
import { Badge } from "../primitives/Badge";
import { Button } from "../primitives/Button";
import { Icon } from "../layout/icons";
import type { OfferType, Product } from "./types";

const rubFmt = new Intl.NumberFormat("ru-RU");
function rub(n: number) {
  return `${rubFmt.format(n)} ₽`;
}

function pct(discountPercent: number) {
  if (!Number.isFinite(discountPercent)) return 0;
  if (discountPercent <= 1) return Math.round(discountPercent * 100);
  return Math.round(discountPercent);
}

export function ProductCard({
  p,
  offerTypes,
  favorite,
  onToggleFavorite,
  onOpen,
  onGo,
}: {
  p: Product;
  offerTypes: ReadonlyArray<OfferType>;
  favorite: boolean;
  onToggleFavorite: () => void;
  onOpen: () => void;
  onGo: () => void;
}) {
  const ot = offerTypes.find((x) => x.id === p.offerTypeId);
  const [imageError, setImageError] = useState(false);
  const imageSrc = p.photos?.[0];
  const showImage = Boolean(imageSrc) && !imageError;
  const hasOldPrice = Number.isFinite(p.oldPrice) && p.oldPrice > p.price;
  const hasDiscount =
    Number.isFinite(p.discountPercent) && p.discountPercent > 0;

  return (
    <div className="group rounded-2xl transition hover:shadow-lp-md m-2">
      <div
        role="button"
        tabIndex={0}
        aria-label="Открыть товар"
        onClick={onOpen}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            onOpen();
          }
        }}
        className="w-full text-left">
        <div className="relative overflow-hidden rounded-xl aspect-[3/4]">
          <div
            className="w-full "
            style={{
              background:
                "linear-gradient(135deg, rgba(11,27,51,0.10), rgba(246,183,60,0.12))",
            }}
          />
          {showImage ? (
            <img
              src={imageSrc}
              alt={p.title}
              loading="lazy"
              decoding="async"
              onError={() => setImageError(true)}
              className="inset-0 object-cover"
            />
          ) : null}

          <div className="absolute left-2 top-2 flex flex-wrap gap-1">
            {hasDiscount ? (
              <span className="rounded-full bg-lp-accent px-2 py-0.5 text-xs font-semibold text-lp-primary">
                −{pct(p.discountPercent)}%
              </span>
            ) : null}

            {ot ? (
              <Badge
                style={{
                  backgroundColor: ot.badgeColor || "#EEF2FF",
                  borderColor: "rgba(15,23,42,0.08)",
                  color: "var(--lp-text)",
                }}>
                {ot.badgeText || ot.name}
              </Badge>
            ) : null}
          </div>

          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onToggleFavorite();
            }}
            className="absolute right-2 top-2 rounded-full border border-lp-border bg-white/90 p-2 backdrop-blur hover:bg-white"
            style={{ color: favorite ? "var(--lp-danger)" : "var(--lp-text)" }}
            aria-label={
              favorite ? "Убрать из избранного" : "Добавить в избранное"
            }>
            <Icon name="heart" />
          </button>
        </div>

        <div className="mt-3">
          <div className="mt-2 flex items-baseline justify-between gap-2">
            <div className="flex items-baseline gap-2">
              <div
                className={`text-lg font-bold px-2 ${
                  p.isHot ? "text-lp-danger" : "text-lp-text"
                }`}
              >
                {rub(p.price)}
              </div>
              {hasOldPrice ? (
                <div className="text-xs text-lp-muted line-through">
                  {rub(p.oldPrice)}
                </div>
              ) : null}
            </div>
          </div>
          <div className="line-clamp-2 text-md font-normal text-lp-text px-2 mb-2">
            {p.title}
          </div>
        </div>
      </div>
    </div>
  );
}
