# UI Guide — правила и стандарты

## Палитра
- Primary: `--lp-primary` (#0B1B33)
- Accent: `--lp-accent` (#F6B73C)
- Background: `--lp-bg` (#F7F8FB)
- Surface: `--lp-surface` (#FFFFFF)

## Отступы и сетка
- Базовый шаг: 4px
- Карточки: `p-3` или `p-4`, gap: `gap-3/gap-4`
- Радиусы:
  - Карточки: 16px (`rounded-2xl`)
  - Крупные контейнеры: 24px (`rounded-3xl`)
  - Чипы/бейджи: `rounded-full`

## Текст
- Заголовки: `font-extrabold`/`font-bold`
- Описания: `text-sm`/`text-xs` + `text-muted`
- Цены: `text-lg`/`text-2xl` + `font-extrabold`

## Motion
- Только полезная анимация:
  - Skeleton/placeholder
  - Bottom sheet (spring)
- Не злоупотреблять.

## Компоненты
- `Button`: primary/secondary/ghost
- `Chip`: фильтры‑пилюли
- `Badge`: бейджи скидки/типа
- `Sheet`: bottom sheet
- `ProductCard`: витрина товара

## Карточка товара: обязательные элементы
- Discount badge (по `discountPercent`)
- Hot badge (по `isHot`)
- OfferType badge (по `badgeText/badgeColor`)
- Цена + старая цена
- Метрики (views/favorites) — опционально, но хорошо работают как соц.сигнал

