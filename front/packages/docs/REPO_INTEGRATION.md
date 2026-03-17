# Интеграция в репозиторий (практично)

## Рекомендуемая структура (монорепо)

```
apps/
  web/            # Next.js или Vite
packages/
  ui/             # этот UI kit
```

## TypeScript paths (опционально)
В корневом `tsconfig.base.json`:

```json
{
  "compilerOptions": {
    "baseUrl": ".",
    "paths": {
      "@ui/*": ["packages/ui/*"]
    }
  }
}
```

## Экспорт компонентов
В `packages/ui/components/index.ts` уже есть re-export. Подключай так:

```ts
import { Button, Sheet, ProductCard } from "@ui/components";
```

## Next.js (App Router)
- Импортируй `tokens.css` в `app/globals.css`.
- Убедись, что `tailwind.config` включает `packages/ui` в content.

## Vite
- Импортируй `tokens.css` в `src/index.css`.

## Темизация под Telegram WebApp (будущее)
- Переопределяй CSS variables в `:root` или в `.tg-theme`.
- Не меняй компоненты: меняй токены.

