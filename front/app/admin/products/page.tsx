"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Input } from "@ui/components";
import AdminFiltersBar from "@/components/admin/AdminFiltersBar";
import AdminListStates from "@/components/admin/AdminListStates";
import AdminSectionHeader from "@/components/admin/AdminSectionHeader";
import AdminTable, { type AdminTableColumn } from "@/components/admin/AdminTable";
import { useCursorParams } from "@/lib/admin/useCursorParams";
import {
  type AdminProductListItem,
  type AdminProductStatus,
} from "@/lib/api/adminProducts";
import { useAdminProductsList } from "@/lib/queries/adminProducts";
import { useCategories, useSubcategories } from "@/lib/queries/categories";
import { useOfferTypes } from "@/lib/queries/offerTypes";

const STATUS_OPTIONS: ReadonlyArray<{
  value: AdminProductStatus | "all";
  label: string;
}> = [
  { value: "all", label: "All" },
  { value: "draft", label: "Draft" },
  { value: "pending", label: "Pending" },
  { value: "active", label: "Active" },
  { value: "rejected", label: "Rejected" },
  { value: "archived", label: "Archived" },
];

const BOOL_OPTIONS: ReadonlyArray<{ value: "any" | "true" | "false"; label: string }> = [
  { value: "any", label: "Any" },
  { value: "true", label: "Yes" },
  { value: "false", label: "No" },
];

const DEFAULT_STATUS: AdminProductStatus | "all" = "all";

const formatPrice = (value: number) =>
  new Intl.NumberFormat("ru-RU", {
    style: "currency",
    currency: "RUB",
    maximumFractionDigits: 0,
  }).format(value);

export default function AdminProductsPage() {
  const router = useRouter();
  const { limit, resetCursor } = useCursorParams({ limit: 50 });

  const [status, setStatus] = useState<AdminProductStatus | "all">(
    DEFAULT_STATUS,
  );
  const [query, setQuery] = useState("");
  const [sellerId, setSellerId] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [subcategoryId, setSubcategoryId] = useState("");
  const [offerTypeId, setOfferTypeId] = useState("");
  const [featured, setFeatured] = useState<"any" | "true" | "false">("any");
  const [hot, setHot] = useState<"any" | "true" | "false">("any");

  const categoriesQuery = useCategories();
  const subcategoriesQuery = useSubcategories(categoryId || null);
  const offerTypesQuery = useOfferTypes();

  const [applied, setApplied] = useState<{
    status: AdminProductStatus | "all";
    q: string;
    sellerId: string;
    categoryId: string;
    subcategoryId: string;
    offerTypeId: string;
    featured: "any" | "true" | "false";
    hot: "any" | "true" | "false";
  }>({
    status: DEFAULT_STATUS,
    q: "",
    sellerId: "",
    categoryId: "",
    subcategoryId: "",
    offerTypeId: "",
    featured: "any",
    hot: "any",
  });

  const filters = useMemo(() => {
    const q = applied.q.trim();
    const seller = applied.sellerId.trim();
    return {
      status: applied.status,
      q: q ? q : undefined,
      sellerId: seller ? seller : undefined,
      categoryId: applied.categoryId || undefined,
      subcategoryId: applied.subcategoryId || undefined,
      offerTypeId: applied.offerTypeId || undefined,
      featured:
        applied.featured === "any"
          ? undefined
          : applied.featured === "true",
      hot: applied.hot === "any" ? undefined : applied.hot === "true",
      limit,
    };
  }, [applied, limit]);

  const productsQuery = useAdminProductsList(filters);
  const rows = useMemo<AdminProductListItem[]>(
    () => (productsQuery.data?.pages ?? []).flatMap((page) => page.items),
    [productsQuery.data?.pages],
  );

  const columns = useMemo<AdminTableColumn<AdminProductListItem>[]>(
    () => [
      {
        key: "title",
        header: "Title",
        render: (row) => row.title,
      },
      {
        key: "status",
        header: "Status",
        render: (row) => row.status,
      },
      {
        key: "price",
        header: "Price",
        render: (row) => formatPrice(row.price),
      },
      {
        key: "featured",
        header: "Featured",
        render: (row) => (row.isFeatured ? "Yes" : "No"),
      },
      {
        key: "sellerId",
        header: "Seller ID",
        render: (row) => row.sellerId,
      },
      {
        key: "actions",
        header: "Actions",
        render: (row) => (
          <Link
            className="text-sm font-semibold text-lp-primary"
            href={`/admin/products/${row.id}`}
            onClick={(event) => event.stopPropagation()}
          >
            Open
          </Link>
        ),
      },
    ],
    [],
  );

  const isLoading = productsQuery.isLoading;
  const error = productsQuery.error;
  const isEmpty = !isLoading && !error && rows.length === 0;

  const handleReset = () => {
    setStatus(DEFAULT_STATUS);
    setQuery("");
    setSellerId("");
    setCategoryId("");
    setSubcategoryId("");
    setOfferTypeId("");
    setFeatured("any");
    setHot("any");
    setApplied({
      status: DEFAULT_STATUS,
      q: "",
      sellerId: "",
      categoryId: "",
      subcategoryId: "",
      offerTypeId: "",
      featured: "any",
      hot: "any",
    });
    resetCursor();
  };

  const handleApply = () => {
    setApplied({
      status,
      q: query,
      sellerId,
      categoryId,
      subcategoryId,
      offerTypeId,
      featured,
      hot,
    });
    resetCursor();
  };

  const categories = categoriesQuery.data ?? [];
  const subcategories = subcategoriesQuery.data ?? [];
  const offerTypes = offerTypesQuery.data ?? [];

  return (
    <div className="space-y-4">
      <AdminSectionHeader title="Products" description="Admin" />
      <AdminFiltersBar onReset={handleReset} onApply={handleApply}>
        <div className="w-full md:max-w-xs">
          <Input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search by title"
          />
        </div>
        <div className="w-full md:max-w-xs">
          <Input
            value={sellerId}
            onChange={(event) => setSellerId(event.target.value)}
            placeholder="Seller ID"
          />
        </div>
        <div className="w-full md:max-w-xs">
          <label className="text-xs font-semibold uppercase tracking-wide text-lp-muted">
            Status
          </label>
          <select
            className="mt-1 w-full rounded-2xl border border-lp-border bg-white px-3 py-2 text-sm text-lp-text"
            value={status}
            onChange={(event) =>
              setStatus(event.target.value as AdminProductStatus | "all")
            }
          >
            {STATUS_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>
        <div className="w-full md:max-w-xs">
          <label className="text-xs font-semibold uppercase tracking-wide text-lp-muted">
            Category
          </label>
          <select
            className="mt-1 w-full rounded-2xl border border-lp-border bg-white px-3 py-2 text-sm text-lp-text"
            value={categoryId}
            onChange={(event) => {
              const next = event.target.value;
              setCategoryId(next);
              setSubcategoryId("");
            }}
          >
            <option value="">Any</option>
            {categories.map((category) => (
              <option key={category.id} value={category.id}>
                {category.name}
              </option>
            ))}
          </select>
        </div>
        <div className="w-full md:max-w-xs">
          <label className="text-xs font-semibold uppercase tracking-wide text-lp-muted">
            Subcategory
          </label>
          <select
            className="mt-1 w-full rounded-2xl border border-lp-border bg-white px-3 py-2 text-sm text-lp-text"
            value={subcategoryId}
            onChange={(event) => setSubcategoryId(event.target.value)}
            disabled={!categoryId}
          >
            <option value="">Any</option>
            {subcategories.map((subcategory) => (
              <option key={subcategory.id} value={subcategory.id}>
                {subcategory.name}
              </option>
            ))}
          </select>
        </div>
        <div className="w-full md:max-w-xs">
          <label className="text-xs font-semibold uppercase tracking-wide text-lp-muted">
            Offer type
          </label>
          <select
            className="mt-1 w-full rounded-2xl border border-lp-border bg-white px-3 py-2 text-sm text-lp-text"
            value={offerTypeId}
            onChange={(event) => setOfferTypeId(event.target.value)}
          >
            <option value="">Any</option>
            {offerTypes.map((offerType) => (
              <option key={offerType.id} value={offerType.id}>
                {offerType.name}
              </option>
            ))}
          </select>
        </div>
        <div className="w-full md:max-w-xs">
          <label className="text-xs font-semibold uppercase tracking-wide text-lp-muted">
            Featured
          </label>
          <select
            className="mt-1 w-full rounded-2xl border border-lp-border bg-white px-3 py-2 text-sm text-lp-text"
            value={featured}
            onChange={(event) =>
              setFeatured(event.target.value as "any" | "true" | "false")
            }
          >
            {BOOL_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>
        <div className="w-full md:max-w-xs">
          <label className="text-xs font-semibold uppercase tracking-wide text-lp-muted">
            Hot
          </label>
          <select
            className="mt-1 w-full rounded-2xl border border-lp-border bg-white px-3 py-2 text-sm text-lp-text"
            value={hot}
            onChange={(event) =>
              setHot(event.target.value as "any" | "true" | "false")
            }
          >
            {BOOL_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>
      </AdminFiltersBar>

      <AdminListStates
        isLoading={isLoading}
        error={error}
        isEmpty={isEmpty}
        emptyTitle="No products yet"
        emptyDescription="Try adjusting filters or check back later."
      />

      {!isLoading && !error && !isEmpty ? (
        <AdminTable
          columns={columns}
          rows={rows}
          getRowKey={(row) => row.id}
          onRowClick={(row) => router.push(`/admin/products/${row.id}`)}
          loadMore={{
            hasMore: Boolean(productsQuery.hasNextPage),
            isLoading: productsQuery.isFetchingNextPage,
            onLoadMore: () => productsQuery.fetchNextPage(),
            label: productsQuery.isFetchingNextPage
              ? "Loading..."
              : "Load more",
          }}
        />
      ) : null}
    </div>
  );
}
