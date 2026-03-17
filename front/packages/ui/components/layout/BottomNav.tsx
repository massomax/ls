import { Icon } from "./icons";

export type BottomNavItem<TKey extends string> = {
  key: TKey;
  label: string;
  icon: Parameters<typeof Icon>[0]["name"];
};

type BottomNavProps<TKey extends string> = {
  active: TKey;
  items: ReadonlyArray<BottomNavItem<TKey>>;
  onChange: (key: TKey) => void;
};

export function BottomNav<TKey extends string>({
  active,
  items,
  onChange,
}: BottomNavProps<TKey>) {
  return (
    <div className="fixed bottom-0 left-0 right-0 z-30 border-t border-lp-border bg-white/90 backdrop-blur md:hidden">
      <div className="mx-auto grid max-w-2xl grid-cols-5 px-2 py-2">
        {items.map((it) => {
          const isActive = it.key === active;
          return (
            <button
              key={it.key}
              type="button"
              onClick={() => onChange(it.key)}
              className="flex flex-col items-center justify-center gap-1 rounded-xl py-2 text-xs"
              style={{
                color: isActive ? "var(--lp-primary)" : "var(--lp-muted)",
              }}>
              <Icon name={it.icon} />
              <span className={isActive ? "font-semibold" : ""}>
                {it.label}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
