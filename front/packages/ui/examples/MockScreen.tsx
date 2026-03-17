"use client";

import React, { useMemo, useState } from "react";
import { TopBar, BottomNav, SectionTitle, Sheet, Chip, Card, CardBody, ProductCard } from "../components";
import type { OfferType, Product } from "../components";

const OFFER_TYPES: OfferType[] = [
  { id: "ot1", name: "Упаковка повреждена", slug: "packaging", badgeText: "Упаковка", badgeColor: "#E2E8F0" },
  { id: "ot2", name: "Витринный образец", slug: "showcase", badgeText: "Витрина", badgeColor: "#E0E7FF" },
  { id: "ot3", name: "Последний экземпляр", slug: "last", badgeText: "Последний", badgeColor: "#CFFAFE" },
];

const PRODUCTS: Product[] = [
  {
    id: "p1",
    title: "Электрочайник 1.7л, нержавейка, авто‑отключение",
    photos: [],
    price: 2590,
    oldPrice: 4790,
    discountPercent: 46,
    isHot: false,
    offerTypeId: "ot1",
    views7d: 230,
    favoritesCount: 18,
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 2).toISOString(),
  },
  {
    id: "p2",
    title: "Наушники Bluetooth, ANC, 30ч, быстрая зарядка",
    photos: [],
    price: 4990,
    oldPrice: 8990,
    discountPercent: 45,
    isHot: false,
    offerTypeId: "ot2",
    views7d: 520,
    favoritesCount: 44,
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 10).toISOString(),
  },
  {
    id: "p3",
    title: "Смарт‑лампа E27, RGB, Wi‑Fi, 9W",
    photos: [],
    price: 590,
    oldPrice: 990,
    discountPercent: 40,
    isHot: false,
    offerTypeId: "ot3",
    views7d: 90,
    favoritesCount: 7,
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString(),
  },
  {
    id: "p4",
    title: "Тостер 2 слота, 7 уровней, поддон для крошек",
    photos: [],
    price: 1990,
    oldPrice: 3990,
    discountPercent: 50,
    isHot: true,
    offerTypeId: "ot1",
    views7d: 740,
    favoritesCount: 62,
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 6).toISOString(),
  },
];

export default function MockScreen() {
  const [tab, setTab] = useState("catalog");
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState<"rank" | "new" | "popular">("rank");
  const [hot, setHot] = useState(false);
  const [active, setActive] = useState<Product | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [fav, setFav] = useState<Record<string, boolean>>({});

  const items = useMemo(() => {
    let arr = PRODUCTS.slice();
    if (hot) arr = arr.filter((p) => p.isHot);
    if (query.trim()) arr = arr.filter((p) => p.title.toLowerCase().includes(query.trim().toLowerCase()));
    if (sort === "new") arr.sort((a, b) => +new Date(b.createdAt) - +new Date(a.createdAt));
    if (sort === "popular") arr.sort((a, b) => b.views7d - a.views7d);
    if (sort === "rank") arr.sort((a, b) => b.favoritesCount - a.favoritesCount);
    return arr;
  }, [query, sort, hot]);

  return (
    <div className="min-h-screen bg-lp-bg">
      <TopBar query={query} onQuery={setQuery} subtitle="Preview: tokens + components" />

      <main className="mx-auto w-full max-w-6xl px-4 pb-24 pt-6">
        <Card className="rounded-3xl">
          <CardBody>
            <SectionTitle title="Фильтры" hint="Mock, без API" />
            <div className="flex flex-wrap gap-2">
              <Chip active={hot} onClick={() => setHot((v) => !v)}>
                Hot (−50%+)
              </Chip>
              <Chip active={sort === "rank"} onClick={() => setSort("rank")}>
                rank
              </Chip>
              <Chip active={sort === "new"} onClick={() => setSort("new")}>
                new
              </Chip>
              <Chip active={sort === "popular"} onClick={() => setSort("popular")}>
                popular
              </Chip>
            </div>
          </CardBody>
        </Card>

        <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {items.map((p) => (
            <ProductCard
              key={p.id}
              p={p}
              offerTypes={OFFER_TYPES}
              favorite={!!fav[p.id]}
              onToggleFavorite={() => setFav((m) => ({ ...m, [p.id]: !m[p.id] }))}
              onOpen={() => {
                setActive(p);
                setSheetOpen(true);
              }}
              onGo={() => alert("Переход во внешний магазин (в будущем: click + externalUrl)")}
            />
          ))}
        </div>
      </main>

      <BottomNav
        active={tab}
        onChange={setTab}
        items={[
          { key: "home", label: "Главная", icon: "home" },
          { key: "catalog", label: "Каталог", icon: "grid" },
          { key: "fav", label: "Избранное", icon: "heart" },
          { key: "bell", label: "Уведомления", icon: "bell" },
          { key: "profile", label: "Профиль", icon: "user" },
        ]}
      />

      <Sheet
        open={sheetOpen}
        onClose={() => setSheetOpen(false)}
        title={active ? active.title : "Карточка"}
        subtitle="Bottom sheet"
      >
        {active ? (
          <div className="space-y-3">
            <div className="rounded-2xl border border-lp-border bg-white p-4">
              <div className="text-sm font-bold text-lp-text">Цена</div>
              <div className="mt-2 text-2xl font-extrabold text-lp-text">{active.price} ₽</div>
              <div className="text-sm text-lp-muted line-through">{active.oldPrice} ₽</div>
            </div>
            <div className="text-sm text-lp-muted">
              Здесь в будущем можно подставить реальные поля из backend (offerType, метрики, ссылка). В UI kit только каркас.
            </div>
          </div>
        ) : null}
      </Sheet>
    </div>
  );
}
