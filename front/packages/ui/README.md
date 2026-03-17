# LastPiece UI Kit (Последняя Штучка) — UI kit + инструкции интеграции

Этот набор файлов — **выжимка дизайна и компонентов** из макета, чтобы ты мог использовать стиль как основу в будущем репозитории.

Содержимое:
- `tokens/` — дизайн‑токены (JSON) и CSS‑переменные.
- `tailwind/` — Tailwind preset (готов к Next.js/Vite).
- `components/` — базовые компоненты (Button/Chip/Badge/Card/Input/Sheet) + layout и marketplace‑компоненты (ProductCard, TopBar, BottomNav).
- `docs/` — правила использования, гайд по стилю, как подключать в монорепо.
- `examples/` — пример экрана/шелла для быстрой проверки.

## Вариант A (рекомендуется): вынести как пакет `packages/ui`

### 1) Создай структуру
В корне твоего репо (монорепо):

```
packages/
  ui/
    (сюда содержимое этого архива)
```

### 2) Зависимости
Пакет использует:
- `tailwindcss`
- `postcss`, `autoprefixer`
- `framer-motion`
- `clsx` (для className)

Установи в workspace/проект:

```bash
pnpm add -D tailwindcss postcss autoprefixer
pnpm add framer-motion clsx
```

### 3) Подключи токены (CSS variables)
**Next.js**: добавь в `app/globals.css`:

```css
@import "../packages/ui/tokens/tokens.css";
```

**Vite/React**: добавь в `src/index.css`:

```css
@import "../packages/ui/tokens/tokens.css";
```

### 4) Подключи Tailwind preset
**Next.js**: в `tailwind.config.ts` (или `.js`):

```ts
import type { Config } from "tailwindcss";

const config: Config = {
  presets: [require("../packages/ui/tailwind/tailwind.preset")],
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "../packages/ui/**/*.{ts,tsx}",
  ],
};
export default config;
```

**Vite/React**:

```ts
import type { Config } from "tailwindcss";

const config: Config = {
  presets: [require("../packages/ui/tailwind/tailwind.preset")],
  content: [
    "./index.html",
    "./src/**/*.{ts,tsx}",
    "../packages/ui/**/*.{ts,tsx}",
  ],
};
export default config;
```

### 5) Использование компонентов

```tsx
import { TopBar, ProductCard } from "../packages/ui/components";
```

Или экспортируй через алиас (рекомендуется):
- добавь path alias `@ui/*` на `packages/ui/*`.

---

## Вариант B: просто скопировать в приложение
Скопируй папки `tokens/`, `tailwind/`, `components/` в своё приложение и подключи по шагам выше.

---

## Быстрая проверка
Открой `examples/MockScreen.tsx` и вставь в страницу/роут — должен отрисоваться экран с TopBar + каталогом карточек и BottomSheet.

---

## Примечания
- Все цвета/радиусы/шрифты завязаны на CSS variables. Это позволяет потом легко ввести темы (например, Telegram WebApp).
- Компоненты написаны максимально «тонко»: Tailwind + небольшой слой обёрток.

