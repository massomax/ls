import React from "react";
import { Input } from "../primitives/Input";
import { Button } from "../primitives/Button";
import { Icon } from "./icons";

export type TopBarProps = {
  title?: string;
  subtitle?: string;
  query: string;
  onQuery: (v: string) => void;
  onCatalog?: () => void;
  onHome?: () => void;
  onFavorites?: () => void;
  onNotifications?: () => void;
  onProfile?: () => void;
  profileLabel?: string;
};

export function TopBar({
  title = "Последняя Штучка",
  subtitle = "UI kit preview",
  query,
  onQuery,
  onCatalog,
  onHome,
  onFavorites,
  onNotifications,
  onProfile,
  profileLabel = "Профиль",
}: TopBarProps) {
  return (
    <div className="sticky top-0 z-60 border-b border-lp-border bg-white/90 backdrop-blur">
      <div className="mx-auto flex w-full max-w-6xl items-center gap-3 px-4 py-3">
        <button type="button" className="flex items-center gap-2" onClick={onHome}>
          <div className="grid h-10 w-10 place-items-center rounded-2xl bg-lp-primary text-white">
            <Icon name="bag" />
          </div>
          <div className="hidden sm:block">
            <div className="text-sm font-bold text-lp-text">{title}</div>
            <div className="text-xs text-lp-muted">{subtitle}</div>
          </div>
        </button>

        <div className="relative flex-1">
          <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-lp-muted">
            <Icon name="search" />
          </span>
          <Input className="pl-10" value={query} onChange={(e) => onQuery(e.target.value)} placeholder="Поиск…" />
        </div>

        <div className="hidden md:flex items-center gap-2">
          <Button variant="secondary" onClick={onCatalog}>
            Каталог
          </Button>
          <Button variant="secondary" onClick={onFavorites}>
            Избранное
          </Button>
          <Button variant="secondary" onClick={onNotifications}>
            Уведомления
          </Button>
          <Button variant="secondary" onClick={onProfile}>
            {profileLabel}
          </Button>
        </div>
      </div>
    </div>
  );
}
