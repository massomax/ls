import React from "react";
import { Badge } from "../primitives/Badge";
import { Button } from "../primitives/Button";
import { Icon } from "../layout/icons";
import type { OfferType, Product } from "./types";

function rub(n: number) {
  return new Intl.NumberFormat("ru-RU").format(n) + " ₽";
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
  offerTypes: OfferType[];
  favorite: boolean;
  onToggleFavorite: () => void;
  onOpen: () => void;
  onGo: () => void;
}) {
  const ot = offerTypes.find((x) => x.id === p.offerTypeId);

  return (
    <div className="group rounded-2xl border border-lp-border bg-white p-3 shadow-lp-sm transition hover:shadow-lp-md">
      <button type="button" onClick={onOpen} className="w-full text-left">
        <div className="relative overflow-hidden rounded-xl">
          <div
            className="aspect-[4/3] w-full"
            style={{ background: "linear-gradient(135deg, rgba(11,27,51,0.10), rgba(246,183,60,0.12))" }}
          />

          <div className="absolute left-2 top-2 flex flex-wrap gap-1">
            <span className="rounded-full bg-lp-accent px-2 py-0.5 text-xs font-semibold text-lp-primary">−{pct(p.discountPercent)}%</span>
            {p.isHot ? (
              <Badge className="border-transparent bg-lp-primary text-white">
                <span className="mr-1 inline-flex align-middle">
                  <Icon name="spark" />
                </span>
                Hot
              </Badge>
            ) : null}
            {ot ? (
              <Badge
                style={{
                  backgroundColor: ot.badgeColor || "#EEF2FF",
                  borderColor: "rgba(15,23,42,0.08)",
                  color: "var(--lp-text)",
                }}
              >
                {ot.badgeText || ot.name}
              </Badge>
            ) : (
              <Badge className="border-slate-200 bg-slate-50 text-slate-700">Offer</Badge>
            )}
          </div>

          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onToggleFavorite();
            }}
            className="absolute right-2 top-2 rounded-full border border-lp-border bg-white/90 p-2 backdrop-blur hover:bg-white"
            style={{ color: favorite ? "var(--lp-danger)" : "var(--lp-text)" }}
            aria-label={favorite ? "Убрать из избранного" : "Добавить в избранное"}
          >
            <Icon name="heart" />
          </button>
        </div>

        <div className="mt-3">
          <div className="line-clamp-2 text-sm font-semibold text-lp-text">{p.title}</div>

          <div className="mt-2 flex items-baseline justify-between gap-2">
            <div className="flex items-baseline gap-2">
              <div
                className={`text-lg font-bold ${
                  p.isHot ? "text-lp-danger" : "text-lp-text"
                }`}
              >
                {rub(p.price)}
              </div>
              <div className="text-xs text-lp-muted line-through">{rub(p.oldPrice)}</div>
            </div>
            <div className="text-xs text-lp-muted">❤ {p.favoritesCount}</div>
          </div>

          <div className="mt-2 flex items-center justify-between text-xs text-lp-muted">
            <span>👁 {p.views7d} за 7д</span>
            <span>{new Date(p.createdAt).toLocaleDateString("ru-RU")}</span>
          </div>
        </div>
      </button>

      <div className="mt-3 flex items-center justify-between gap-2">
        <button type="button" onClick={onOpen} className="text-xs font-semibold text-lp-primary underline underline-offset-4">
          Подробнее
        </button>
        <Button onClick={onGo} className="px-3 py-2 text-sm">
          Перейти
        </Button>
      </div>
    </div>
  );
}
