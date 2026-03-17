"use client";

import { PropsWithChildren, useEffect, useMemo, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { BottomNav, Button, Sheet, TopBar } from "@ui/components";
import type { BottomNavItem } from "@ui/components";
import { useSearch } from "@/components/providers/search";
import { useSession } from "@/components/providers/session";
import { listSubcategories } from "@/lib/api/categories";
import { useCategories, useSubcategories } from "@/lib/queries/categories";
import PageStateError from "@/components/state/PageStateError";
import PageStateSkeleton from "@/components/state/PageStateSkeleton";
import LoginModal from "@/components/auth/LoginModal";

type NavKey = "home" | "search" | "favorites" | "notifications" | "profile";
type AppBottomNavItem = BottomNavItem<NavKey>;

export default function AppShell({ children }: PropsWithChildren) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { query, setQuery } = useSearch();
  const { status, me } = useSession();
  const [catalogOpen, setCatalogOpen] = useState(false);
  const [activeCategoryId, setActiveCategoryId] = useState<string | null>(null);
  const [activeSubcategoryId, setActiveSubcategoryId] = useState<string | null>(
    null,
  );
  const categoriesQ = useCategories();

  const items = useMemo(
    (): AppBottomNavItem[] => [
      { key: "home", label: "Главная", icon: "home" },
      { key: "search", label: "Поиск", icon: "search" },
      { key: "favorites", label: "Избранное", icon: "heart" },
      { key: "notifications", label: "Увед.", icon: "bell" },
      { key: "profile", label: "Профиль", icon: "user" },
    ],
    [],
  );

  const active: NavKey = useMemo(() => {
    if (pathname.startsWith("/p/")) return "home";
    if (pathname.startsWith("/favorites")) return "favorites";
    if (pathname.startsWith("/notifications")) return "notifications";
    if (pathname.startsWith("/search")) return "search";
    if (pathname.startsWith("/account") || pathname.startsWith("/login"))
      return "profile";
    return "home";
  }, [pathname]);

  const loginOpen = searchParams.get("login") === "1";

  const closeLogin = () => {
    const params = new URLSearchParams(searchParams.toString());
    params.delete("login");
    params.delete("next");
    const queryString = params.toString();
    router.replace(queryString ? `${pathname}?${queryString}` : pathname);
  };

  const onChange = (key: NavKey) => {
    switch (key) {
      case "home":
        router.push("/");
        break;
      case "search":
        router.push("/search");
        break;
      case "favorites":
        router.push("/favorites");
        break;
      case "notifications":
        router.push("/notifications");
        break;
      case "profile":
        router.push(status === "authed" ? "/account" : "/login");
        break;
    }
  };

  const profileLabel =
    status === "authed" ? me?.name || me?.phone || "Профиль" : "Войти";

  const categories = useMemo(() => {
    const list = categoriesQ.data ?? [];
    return [...list].sort((a, b) => {
      if (a.sortOrder !== b.sortOrder) return a.sortOrder - b.sortOrder;
      return a.name.localeCompare(b.name);
    });
  }, [categoriesQ.data]);

  const parseSlugId = (slugId: string) => {
    const parts = slugId.split("-");
    if (parts.length < 2) return { slug: slugId, id: slugId };
    const id = parts[parts.length - 1];
    const slug = parts.slice(0, -1).join("-");
    return { slug, id };
  };

  useEffect(() => {
    if (!categoriesQ.data) return;

    if (pathname.startsWith("/category/")) {
      const slugId = decodeURIComponent(pathname.replace("/category/", "")).split("/")[0];
      const { id } = parseSlugId(slugId);
      setActiveCategoryId(id);
      setActiveSubcategoryId(null);
      return;
    }

    if (pathname.startsWith("/subcategory/")) {
      const slugId = decodeURIComponent(pathname.replace("/subcategory/", "")).split("/")[0];
      const { id } = parseSlugId(slugId);
      setActiveCategoryId(null);
      setActiveSubcategoryId(null);
      let active = true;

      const resolveParent = async () => {
        for (const category of categoriesQ.data ?? []) {
          try {
            const subs = await listSubcategories(category.id);
            if (subs.find((item) => item.id === id)) {
              if (active) {
                setActiveCategoryId(category.id);
                setActiveSubcategoryId(id);
              }
              return;
            }
          } catch {
            // Skip failed category and continue searching.
          }
        }
      };

      void resolveParent();

      return () => {
        active = false;
      };
    }
    setActiveCategoryId(null);
    setActiveSubcategoryId(null);
  }, [categoriesQ.data, pathname]);

  useEffect(() => {
    if (!catalogOpen) return;
    if (categories.length === 0) return;
    if (!activeCategoryId || !categories.some((c) => c.id === activeCategoryId)) {
      setActiveCategoryId(categories[0].id);
    }
  }, [activeCategoryId, catalogOpen, categories]);

  const activeCategory = useMemo(
    () => categories.find((category) => category.id === activeCategoryId) ?? null,
    [activeCategoryId, categories],
  );
  const subcategoriesQ = useSubcategories(activeCategoryId);
  const subcategories = subcategoriesQ.data ?? [];

  useEffect(() => {
    if (!activeSubcategoryId) return;
    if (subcategories.length === 0) return;
    if (!subcategories.some((item) => item.id === activeSubcategoryId)) {
      setActiveSubcategoryId(null);
    }
  }, [activeSubcategoryId, subcategories]);

  const goToCategory = (slug: string, id: string) => {
    setCatalogOpen(false);
    const safeSlug = slug.trim().length > 0 ? slug : "category";
    setActiveSubcategoryId(null);
    router.push(`/category/${encodeURIComponent(`${safeSlug}-${id}`)}`);
  };

  return (
    <div className="min-h-dvh bg-lp-bg text-lp-text">
      <TopBar
        title="Последняя Штучка"
        subtitle="Витрина"
        query={query}
        onQuery={setQuery}
        onHome={() => onChange("home")}
        onCatalog={() => setCatalogOpen((prev) => !prev)}
        onFavorites={() => onChange("favorites")}
        onNotifications={() => onChange("notifications")}
        onProfile={() => onChange("profile")}
        profileLabel={profileLabel}
      />

      <LoginModal open={loginOpen} onClose={closeLogin} />

      <Sheet
        open={catalogOpen}
        onClose={() => setCatalogOpen(false)}
        title="Каталог"
        subtitle="Выберите категорию"
        placement="top"
        sheetClassName="max-w-[1440px] pt-24 rounded-b-4xl"
        overlay="none"
        showClose={false}
      >
        {categoriesQ.isLoading ? (
          <PageStateSkeleton rows={4} />
        ) : categoriesQ.isError ? (
          <PageStateError
            message="Не удалось загрузить категории"
            onRetry={() => categoriesQ.refetch()}
          />
        ) : categories.length === 0 ? (
          <div className="text-sm text-lp-muted">Категорий пока нет.</div>
        ) : (
          <div className="flex flex-col gap-4 md:flex-row">
            <div className="md:w-72 md:shrink-0 md:border-r md:border-lp-border md:pr-4">
              <div className="flex flex-col gap-2">
                {categories.map((category) => {
                  const isActive = category.id === activeCategoryId;
                  return (
                    <button
                      key={category.id}
                      type="button"
                      onMouseEnter={() => setActiveCategoryId(category.id)}
                      onFocus={() => setActiveCategoryId(category.id)}
                      onClick={() => goToCategory(category.slug, category.id)}
                      className={`flex items-center gap-3 rounded-2xl border px-3 py-2 text-left text-sm transition ${
                        isActive
                          ? "border-lp-primary bg-lp-bg text-lp-text"
                          : "border-lp-border bg-white text-lp-muted hover:bg-slate-50"
                      }`}
                    >
                      {category.svgUrl ? (
                        <span className="grid h-9 w-9 place-items-center rounded-xl bg-white">
                          <img
                            src={category.svgUrl}
                            alt={category.name}
                            className="h-6 w-6"
                          />
                        </span>
                      ) : (
                        <span className="grid h-9 w-9 place-items-center rounded-xl bg-lp-bg text-xs">
                          {category.name.slice(0, 1)}
                        </span>
                      )}
                      <span className="font-medium text-lp-text">
                        {category.name}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="flex-1">
              {subcategoriesQ.isLoading ? (
                <div className="text-sm text-lp-muted">Загружаем подкатегории...</div>
              ) : subcategories.length === 0 ? (
                <div className="text-sm text-lp-muted">
                  В этой категории пока нет подкатегорий.
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                  {subcategories.map((subcategory) => {
                    const safeSlug =
                      subcategory.slug && subcategory.slug.trim().length > 0
                        ? subcategory.slug
                        : "subcategory";
                    const isActive = subcategory.id === activeSubcategoryId;
                    return (
                      <Button
                        key={subcategory.id}
                        variant="secondary"
                        className={
                          isActive
                            ? "border-lp-primary bg-lp-bg text-lp-text hover:bg-lp-bg"
                            : undefined
                        }
                        onClick={() => {
                          setCatalogOpen(false);
                          setActiveSubcategoryId(subcategory.id);
                          router.push(
                            `/subcategory/${encodeURIComponent(
                              `${safeSlug}-${subcategory.id}`,
                            )}`,
                          );
                        }}
                      >
                        {subcategory.name}
                      </Button>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}
      </Sheet>

      <main className="mx-auto w-full max-w-[1440px] py-4 pb-24">
        {children}
      </main>

      <BottomNav active={active} items={items} onChange={onChange} />
    </div>
  );
}
