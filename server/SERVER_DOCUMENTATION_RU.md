# Документация сервера (строго по коду)

Этот документ перечисляет каждый файл, функцию и эндпоинт в /mnt/j/dev-lp/server ровно так, как они реализованы в коде. Никаких предположений, только факты из исходников.

## Файлы в корне

### `package.json`
- Назначение: метаданные пакета Node, скрипты, зависимости.
- Скрипты:
  - `dev`: `ts-node-dev --respawn --transpile-only src/server.ts`.
  - `dev:nodemon`: `nodemon` (использует `nodemon.json`).
  - `dev:ts-node`: `ts-node src/server.ts`.
  - `dev:debug`: `nodemon --inspect`.
  - `build`: `tsc -p tsconfig.json`.
  - `typecheck`: `tsc -p tsconfig.json --noEmit`.
  - `clean`: удаляет `dist` рекурсивно.
  - `start`: `node dist/server.js`.
  - `start:prod`: устанавливает `NODE_ENV=production`, затем `dist/server.js`.
  - `lint`: `eslint .`.
  - `test`: `jest`.
- Требования: Node >= 20, pnpm >= 9 < 10.

### `tsconfig.json`
- Опции компилятора TypeScript (ES2022, CommonJS, `src` -> `dist`, `strict`, `typeRoots` включает `src/types`).

### `nodemon.json`
- Отслеживает `src`, расширения `ts,js,json`.
- Запускает `ts-node src/server.ts` с `NODE_ENV=development`.

### `.env`
- Загружается через `dotenv/config` (см. `src/shared/config/index.ts`).
- Не документируется здесь, потому что это окружение, а не код.

### `.env.example`, `.env.prod`, `.env.prod.example`
- Примеры переменных окружения для локальной и продакшн-среды.

### `package-lock.json`
- Автоматически генерируемый lockfile зависимостей.

## Точка входа

### `src/server.ts`
- `main(): Promise<void>`
  - Подключается к MongoDB через `connectMongo(config.mongoUri)`.
  - При ошибке подключения: логирует и делает `process.exit(1)`.
  - Запускает крон метрик через `startMetricsCron()`.
  - Стартует HTTP сервер на `config.port`.
  - Обрабатывает `SIGINT` и `SIGTERM` (закрывает сервер и завершает процесс).
- `main()` вызывается сразу; также экспортируется.

### `src/app.ts`
- Создает Express приложение с middleware:
  - `helmet()`.
  - `cors(corsOptions)` с кастомной проверкой origin.
  - `express.json({ limit: "2mb" })`.
  - `cookieParser()`.
  - `app.set("trust proxy", 1)` в production; иначе `false`.
  - `rateLimit`: окно 60с, максимум 300 запросов, стандартные заголовки.
- `corsOptions.origin(origin, cb)`
  - Разрешает запросы без `origin`.
  - Разрешает `origin`, если он в `config.cors.origins`.
  - Иначе вызывает `cb(new Error("CORS blocked by server"))`.
- Эндпоинт:
  - `GET /health`: возвращает `200` JSON `{ status: "ok" }`.
- Монтирует роутеры под `/api/v1`:
  - `/users` -> `src/modules/users/userRoutes.ts`.
  - `/users/me/favorites` -> `src/modules/users/favoriteRoutes.ts`.
  - `/auth` -> `src/modules/auth/routes.ts`.
  - `/sellers` -> `src/modules/sellers/sellerRoutes.ts`.
  - `/offer-types` -> публичные и админ-роуты.
  - `/categories` -> публичные роуты.
  - `/admin/categories` -> админ-роуты.
  - `/subcategories` -> seller-роуты.
  - `/admin/subcategories` -> админ-роуты.
  - `/products` -> публичные роуты.
  - `/seller/products` -> seller-роуты.
  - `/uploads` -> `imageUploadRoutes`.
  - `/admin/sellers` -> админ-роуты продавцов.
  - `/admin/products` -> админ-роуты товаров.
  - `/notifications` -> `notificationUserRoutes`.
  - Swagger-роуты -> `src/shared/docs/swagger.ts`.
- Обработка ошибок:
  - `notFound` для несуществующих маршрутов.
  - `errorHandler` для исключений.

## Инфраструктура

### `src/infra/db/mongoose.ts`
- `connectMongo(uri: string): Promise<void>`
  - Устанавливает `mongoose.set("strictQuery", true)`.
  - Подключается через `mongoose.connect(uri, {})`.
  - Логирует `"Mongo connected"` при успехе.

### `src/infra/storage/imgurClient.ts`
- `uploadToImgur(buffer: Buffer, mime: string): Promise<UploadedImage>`
  - Берет Imgur client ID из `config.imgur.clientId`.
  - Если client ID отсутствует: возвращает placeholder URL и пишет в лог.
  - Иначе отправляет POST на `https://api.imgur.com/3/image` с base64.
  - При сетевой или API ошибке:
    - В non-production логирует warning и возвращает placeholder URL.
    - В production кидает `Error`.
  - Возвращает `{ id, deleteHash, url }` из ответа Imgur.
- `UploadedImage`: `{ id?: string; deleteHash?: string; url: string }`.

### `src/infra/sms/smsProvider.ts`
- Интерфейс `SmsProvider`:
  - `sendSms({ to: string; text: string }): Promise<void>`.

### `src/infra/sms/smsAeroAdapter.ts`
- `toProviderNumber(e164: string): string`
  - Удаляет не-цифры; SMS Aero ожидает номер без `+`.
- `sendSms({ to, text }): Promise<void>`
  - Логирует SMS в non-production.
  - Если нет `SMSAERO_EMAIL` или `SMSAERO_API_KEY`: возвращает без отправки.
  - Делает GET запрос на `https://gate.smsaero.ru/v21/sms/send` с query-параметрами.
  - Использует Basic auth `base64(email:apiKey)`.
  - При сетевой или ответной ошибке:
    - В non-production логирует warning и возвращает.
    - В production кидает `Error`.
- Экспорт по умолчанию — `sendSms`.

### `src/infra/cron/metricsCron.ts`
- `startMetricsCron(): void`
  - Расписание `*/30 * * * *` (каждые 30 минут).
  - Агрегирует `ProductEvent` для подсчета:
    - `views7d`, `views30d` из `type: "view"`.
    - `clicksToExternal7d` из `type: "click"`.
  - Проходит по всем продуктам и обновляет:
    - `views7d`, `views30d`, `clicksToExternal7d`.
    - Пересчитывает `rankScore` с использованием:
      - `calcRankScore(oldPrice, price, offerTypeBoost)`.
      - Бонусов за просмотры и избранное.
      - Админского буста, если активен `promotionUntil`.
  - Логирует успех или ошибку в console.

## Общий HTTP и утилиты

### `src/shared/errors/httpErrors.ts`
- `HttpError`: базовый класс со свойствами `status`, `code`, `details`.
- Производные ошибки:
  - `BadRequestError` -> 400
  - `UnauthorizedError` -> 401
  - `ForbiddenError` -> 403
  - `NotFoundError` -> 404
  - `ConflictError` -> 409
  - `TooManyRequestsError` -> 429

### `src/shared/http/errorHandler.ts`
- `notFound(_req, res)`: возвращает `404` JSON `{ error: "NotFound" }`.
- `errorHandler(err, _req, res, _next)`:
  - Для `HttpError`:
    - Логирует если статус >= 500.
    - Возвращает `{ error: err.code, message: err.message, details: err.details }`.
  - Иначе логирует и возвращает `500 { error: "InternalServerError" }`.

### `src/shared/http/authenticateJwt.ts`
- `authenticateJwt(req, _res, next)`
  - Читает `Authorization`, ожидает `Bearer <token>`.
  - Проверяет токен через `config.jwt.accessSecret`.
  - Ставит `req.user` в `{ sub, roles?, iat?, exp? }`.
  - При ошибке или отсутствии заголовка: `UnauthorizedError`.

### `src/shared/http/authorize.ts`
- `authorize(...allowed: string[])` возвращает middleware:
  - Проверяет `req.user.roles`.
  - Разрешает если роль в `allowed` или есть `admin`.
  - Иначе `ForbiddenError`.

### `src/shared/utils/slug.ts`
- `slugify(input: string): string`
  - Приводит к lower-case и обрезает пробелы.
  - Оставляет `[a-z0-9]`.
  - Пробелы/подчеркивания/дефисы заменяет на `-`.
  - Транслитерирует русские буквы по таблице `table`.
  - Убирает повторные дефисы и обрезает по краям.
  - Возвращает до 64 символов; если пусто — `"item"`.

### `src/shared/utils/phone.ts`
- `normalizeE164(phone: string): string`
  - Удаляет все кроме цифр.
  - Возвращает `"+" + digits` или пустую строку, если цифр нет.

### `src/shared/config/index.ts`
- `csv(value, fallback)`: разбивает строку по запятым, обрезает пробелы; возвращает fallback если пусто.
- `durationToSeconds(input: string): number`:
  - Если число: интерпретирует как секунды.
  - Иначе ищет формат `<number><unit>`, где unit = s/m/h/d/w.
  - Возвращает секунды или `900`, если формат неверный.
- `envSchema`: zod схема для env; значения берутся из `process.env`.
- `config`:
  - `nodeEnv`, `port`, `mongoUri`.
  - `jwt`: секреты и сроки access/refresh.
  - `cookies`: `domain`, `secure`.
  - `cors.origins`: из `CORS_ORIGINS` или по умолчанию `["http://localhost:5173"]`.
  - `smsaero`: email, apiKey, sign, channel.
  - `notifications`: `smsEnabled`, `smsSellerEvents`.
  - `imgur.clientId`.
  - `otp`: `ttlSec`, `resendSec`, `maxAttempts`.
  - `uploads`: `maxFiles`, `maxMb`, `allowedMime`.

### `src/shared/logger/index.ts`
- `logger`: pino.
  - Dev: pretty transport, level `debug`.
  - Prod: level `info`.

### `src/shared/docs/swagger.ts`
- Загружает OpenAPI спецификацию из `path.join(process.cwd(), "docs", "openapi.yaml")`.
- Эндпоинты:
  - `GET /openapi.json`: возвращает JSON OpenAPI.
  - `GET /docs`: HTML Swagger UI.
  - `GET /docs/init.js`: JS, инициализирующий Swagger UI с `/openapi.json`.
  - Раздает статику Swagger UI по `/swagger-ui/*`.

### `src/types/express/index.d.ts`
- Расширяет Express `Request` полем `user?: { sub: string; roles?: string[] }`.

### `src/types/api.ts`
- TypeScript типы API для фронтенда.

## Модуль аутентификации

### `src/modules/auth/otpModel.ts`
- Модель Mongoose `OtpCode` с полями:
  - `phone`, `purpose` ("login"), `codeHash`, `attempts`, `consumed`, `expiresAt`, `lastSentAt`, `sentCount`, `createdAt`, `updatedAt`.
- Индексы:
  - `{ phone: 1, purpose: 1, createdAt: -1 }`.
  - `expiresAt` проиндексирован для запросов.

### `src/modules/auth/otpService.ts`
- `randomCode(len = 6): string`
  - Генерирует цифровую строку длины `len` через `Math.random()`.
- `issueCode(rawPhone: string): Promise<{ phone: string; code: string }>`
  - Нормализует телефон в E.164 через `normalizeE164`.
  - Ищет последний OTP (`purpose: "login"`) для контроля resend.
  - Бросает `TooManyRequestsError`, если окно resend не прошло.
  - Хэширует код bcrypt, задает `expiresAt`, увеличивает `sentCount`.
  - Сохраняет OTP и возвращает `{ phone, code }` (код в открытом виде).
- `verifyCode(rawPhone: string, code: string): Promise<boolean>`
  - Нормализует телефон; при ошибке возвращает `false`.
  - Берет последний неиспользованный OTP по `purpose: "login"`.
  - Возвращает `false`, если истек срок или превышены попытки.
  - Сравнивает bcrypt-хэш, увеличивает попытки, при успехе помечает `consumed`.
  - Возвращает `true`, если код верный.

### `src/modules/auth/tokenService.ts`
- `issueAccess(payload: JwtLike): string`
  - Подписывает JWT `HS256` секретом `config.jwt.accessSecret` и `accessExpires`.
- `issueRefresh(payload: JwtLike): string`
  - Подписывает JWT `HS256` секретом `config.jwt.refreshSecret` и `refreshExpires`.
  - Добавляет `typ: "refresh"`.
- `cookieOpts(): { httpOnly, sameSite, secure, domain, path, maxAge }`
  - Использует `config.cookies` и `config.jwt.refreshExpires`.
- `setRefreshCookie(res, token)`
  - Ставит cookie `refreshToken` с `cookieOpts()`.

### `src/modules/auth/routes.ts`
Монтируется на `/api/v1/auth`.

Эндпоинты:
- `GET /ping`
  - Ответ: `{ ok: true, where: "auth" }`.

- `POST /login-sms/request`
  - Тело: `{ phone: string (5..32) }`.
  - Валидация zod и `normalizeE164`.
  - Если пользователя нет: создается с ролями `["user"]`, `isPhoneVerified: false`.
  - Вызывает `issueCode(e164)` и отправляет SMS через `sendSms` с текстом:
    - `Kod dlya vhoda: <code>. Nikomu ego ne soobschayte.`
  - Ответ: `204 No Content`.
  - Ошибки: `BadRequestError("Invalid phone")`, `TooManyRequestsError` от `issueCode`.

- `POST /login-sms/verify`
  - Тело: `{ phone: string, code: string }` (5..32, 4..8).
  - Валидация и нормализация телефона.
  - `verifyCode` -> при `false`: `BadRequestError("InvalidOrExpiredCode")`.
  - Устанавливает `isPhoneVerified=true` пользователю.
  - Выдает access + refresh, ставит refresh cookie.
  - Ответ: `{ accessToken, roles }`.
  - Ошибки: `BadRequestError`, `UnauthorizedError("UserNotFound")` если пользователя нет.

- `POST /refresh`
  - Берет cookie `refreshToken`.
  - Проверяет `config.jwt.refreshSecret`, требует `typ === "refresh"`.
  - Выдает новый access и refresh, обновляет cookie.
  - Ответ: `{ accessToken }`.
  - Ошибки: `UnauthorizedError("MissingRefresh")` или `UnauthorizedError("InvalidRefresh")`.

- `POST /logout`
  - Удаляет cookie `refreshToken` (path `/`).
  - Ответ: `204 No Content`.

## Модуль пользователей

### `src/modules/users/userModel.ts`
- Модель Mongoose `User` с полями:
  - `phone` (unique), `isPhoneVerified`, `name?`, `gender?`, `birthDate?`, `roles`, `createdAt`, `updatedAt`.

### `src/modules/users/userRoutes.ts`
Монтируется на `/api/v1/users`. Все роуты требуют `authenticateJwt`.

Эндпоинты:
- `GET /me`
  - Возвращает профиль пользователя по `req.user.sub`.
  - Ответ:
    - `{ id, phone, isPhoneVerified, name, gender, birthDate, roles, createdAt }`.
  - Если пользователя нет: `404 { error: "NotFound" }`.

- `PATCH /me`
  - Тело (все опционально): `name`, `gender`, `birthDate` (ISO или `YYYY-MM-DD`).
  - Валидация zod; парсит `birthDate` в Date.
  - Обновляет пользователя и возвращает тот же формат, что `GET /me`.
  - Если пользователя нет: `404 { error: "NotFound" }`.
  - Ошибки: `BadRequestError("Invalid input")`, `BadRequestError("Invalid birthDate")`.

### `src/modules/users/favoriteModel.ts`
- Модель Mongoose `Favorite`:
  - Поля: `userId`, `productId`, `createdAt`.
  - Уникальный индекс `{ userId, productId }`.

### `src/modules/users/favoriteRoutes.ts`
Монтируется на `/api/v1/users/me/favorites`. Все роуты требуют `authenticateJwt`.

Helpers:
- `encodeCursor(id)` / `decodeCursor(cursor)`: base64 курсор с `{ id }`.

Эндпоинты:
- `GET /`
  - Query: `limit` (1..100, default 20), `cursor` (base64).
  - Возвращает `{ items, nextCursor }`, сортировка по `_id` по возрастанию.
  - Элемент: `{ id, productId, createdAt }`.

- `POST /`
  - Тело: `{ productId }`.
  - Создает favorite, увеличивает `Product.favoritesCount` на 1.
  - Ответ `201`: `{ id, productId, createdAt }`.
  - Ошибки: неверный input, неверный `productId`, или `409 AlreadyInFavorites`.

- `DELETE /:productId`
  - Удаляет favorite для текущего пользователя и продукта.
  - Если удалено, уменьшает `Product.favoritesCount` на 1.
  - Ответ `204 No Content` (даже если не было записи).
  - Ошибки: неверный `productId`.

## Модуль продавцов

### `src/modules/sellers/sellerModel.ts`
- Модель Mongoose `Seller` с полями:
  - `userId`, `companyName`, `inn`, `ogrn?`, `legalAddress?`, `website?`,
    `contactName?`, `contactEmail?`, `status`, `isVerified`, `tier`,
    `moderationNote?`, `approvedAt?`, `rejectedAt?`, `suspendedAt?`,
    `createdAt`, `updatedAt`.
  - Уникальный индекс по `userId`.

### `src/modules/sellers/sellerRoutes.ts`
Монтируется на `/api/v1/sellers`.

Эндпоинты:
- `POST /apply` (нужен `authenticateJwt`)
  - Тело: `companyName`, `inn` (10-12 цифр), опционально `ogrn`, `legalAddress`, `website`, `contactName`, `contactEmail`.
  - Если есть seller со статусом `pending|active|suspended`: `409 AlreadyAppliedOrActive`.
  - Если status `rejected`: обновляет поля и ставит `pending`.
  - Если нового: создает со статусом `pending`, `isVerified=false`, `tier=free`.
  - При переподаче уведомляет `notifySellerApplicationReceived`.
  - Ответ: `{ id, status }` со статусом `200` или `201`.

- `GET /me` (нужен `authenticateJwt`)
  - Возвращает профиль продавца для текущего пользователя.
  - Если нет: `404 SellerProfileNotFound`.

- `GET /me/stats` (нужны `authenticateJwt` и `authorize("seller","admin")`)
  - Query: `period` в `7d|30d` (default `7d`).
  - Требует seller-профиль со статусом `active`, иначе `ForbiddenError`.
  - Считает агрегаты по товарам продавца.
  - Ответ:
    - `{ period: "live", products: { total, active, archived }, views7d, views30d, favorites, clicks7d }`.

### `src/modules/sellers/adminRoutes.ts`
Монтируется на `/api/v1/admin/sellers`. Требует `authenticateJwt` и `authorize("admin")`.

Helpers:
- `oid(s)` -> ObjectId или null.
- `addSellerRole(userId)` добавляет роль `seller` пользователю.
- `removeSellerRole(userId)` удаляет роль `seller` у пользователя.

Эндпоинты:
- `GET /`
  - Query: `status` (pending|active|rejected|suspended|all), `limit`, `cursor`, `q`.
  - Cursor: base64 `{ id }`, пагинация по `_id` по возрастанию.
  - `q` ищет по `companyName`, `inn`, `contactEmail` и телефону пользователя.
  - Ответ: `{ items, nextCursor }` с данными продавца + пользователя.

- `GET /:id`
  - Ответ: детали продавца + phone/roles пользователя.

- `PATCH /:id/approve`
  - Ставит `active`, `isVerified=true`, `approvedAt=now`.
  - Очищает `rejectedAt`/`suspendedAt`.
  - Уведомляет через `notifySellerApproved`, добавляет роль `seller`.
  - Ответ: `{ id, status, isVerified }`.

- `PATCH /:id/reject`
  - Тело: `{ reason? }`.
  - Ставит `rejected`, `isVerified=false`, `rejectedAt=now`, сохраняет `moderationNote`.
  - Уведомляет через `notifySellerRejected`, удаляет роль `seller`.
  - Ответ: `{ id, status }`.

- `PATCH /:id/suspend`
  - Ставит `suspended`, `suspendedAt=now`.
  - Уведомляет через `notifySellerSuspended`, удаляет роль `seller`.
  - Ответ: `{ id, status }`.

- `PATCH /:id/unsuspend`
  - Ставит `active`, `isVerified=true`, очищает `suspendedAt`.
  - Уведомляет через `notifySellerUnsuspended`, добавляет роль `seller`.
  - Ответ: `{ id, status, isVerified }`.

- `PATCH /:id/tier`
  - Тело: `{ tier: "free"|"plus"|"pro" }`.
  - Обновляет tier. Ответ `{ id, tier }`.

## Модуль категорий

### `src/modules/categories/categoryModel.ts`
- Модель Mongoose `Category` с полями:
  - `name`, `slug` (unique), `svgUrl`, `status`, `sortOrder`, `description?`, `createdAt`, `updatedAt`.
  - Индексы по `status/sortOrder` и `name`.

### `src/modules/categories/publicRoutes.ts`
Монтируется на `/api/v1/categories`.

Эндпоинты:
- `GET /`
  - Возвращает активные категории, сортировка по `sortOrder`, затем `_id`.
  - Ответ: `{ items: [{ id, name, slug, svgUrl, sortOrder, description }] }`.

- `GET /:categoryId/subcategories`
  - Проверяет ObjectId; иначе `400 { error: "BadRequest" }`.
  - Возвращает активные подкатегории данной категории.

- `GET /by-slug/:slug`
  - Находит активную категорию по slug.
  - Если не найдена: `404 { error: "NotFound" }`.
  - Ответ: `{ id, name, slug, svgUrl, sortOrder, description }`.

### `src/modules/categories/adminRoutes.ts`
Монтируется на `/api/v1/admin/categories`. Требует `authenticateJwt` и `authorize("admin")`.

Эндпоинты:
- `POST /`
  - Тело: `name`, `slug`, `svgUrl`, `sortOrder`, `description?`, `status?`.
  - Ответ: `201 { id }`.
  - Ошибка при дублирующемся slug -> `409 SlugAlreadyExists`.

- `PATCH /:id`
  - Тело: частичное от схемы создания.
  - Ответ: `{ id, name, slug, svgUrl, status, sortOrder, description }`.

- `PATCH /:id/archive`
  - Ставит `status` = `archived`.
  - Ответ: `{ id, status }`.

- `PATCH /:id/restore`
  - Ставит `status` = `active`.
  - Ответ: `{ id, status }`.

## Модуль подкатегорий

### `src/modules/subcategories/subcategoryModel.ts`
- Модель Mongoose `Subcategory` с полями:
  - `parentCategoryId`, `name`, `slug`, `status`, `createdBy`,
    `proposedBySellerId?`, `description?`, `mergedToId?`, `reason?`, `createdAt`, `updatedAt`.
  - Уникальный индекс `{ parentCategoryId, slug }` для статуса `active`.

### `src/modules/subcategories/sellerRoutes.ts`
Монтируется на `/api/v1/subcategories`. Требует `authenticateJwt` и `authorize("seller","admin")`.

Эндпоинты:
- `POST /propose`
  - Тело: `{ parentCategoryId, name, description? }`.
  - Проверяет, что категория существует и активна.
  - Проверяет наличие seller-профиля.
  - Создает подкатегорию со статусом `pending`, `createdBy: "seller"`.
  - Ответ: `201 { id, status, slug }`.
  - Ошибка: дублирующий slug в категории -> `409 SlugAlreadyExistsForCategory`.

### `src/modules/subcategories/adminRoutes.ts`
Монтируется на `/api/v1/admin/subcategories`. Требует `authenticateJwt` и `authorize("admin")`.

Helpers:
- `toId(s)` -> ObjectId или null.

Эндпоинты:
- `GET /pending`
  - Query: `categoryId?`, `limit`, `cursor` (base64 `{id}`).
  - Возвращает pending подкатегории, сортировка по `_id` по убыванию.
  - Ответ: `{ items, nextCursor }`.

- `PATCH /:id/approve`
  - Тело: `{ name?, slug?, description? }`.
  - Только для `pending`.
  - Ставит `status: "active"`, обновляет name/slug/description, очищает `reason`.
  - Ответ: `{ id, status, name, slug }`.

- `PATCH /:id/reject`
  - Тело: `{ reason? }`.
  - Ставит `status: "archived"`, `reason` (по умолчанию "rejected").
  - Ответ: `{ id, status }`.

- `PATCH /:id/merge`
  - Тело: `{ targetId }`.
  - Требует одинаковую родительскую категорию и `target` со статусом `active`.
  - Переносит товары с source на target.
  - Архивирует source и записывает `mergedToId` + `reason` с количеством.
  - Ответ: `{ mergedFrom, mergedTo, movedProducts }`.

- `PATCH /:id/archive`
  - Тело: `{ reason? }`.
  - Ставит `status: "archived"` и `reason`.
  - Ответ: `{ id, status }`.

- `PATCH /:id/restore`
  - Требует текущий статус `archived`.
  - Ставит `status: "active"`, очищает `reason`.
  - Ответ: `{ id, status: "active" }`.

## Модуль типов офферов

### `src/modules/offerTypes/offerTypeModel.ts`
- Модель Mongoose `OfferType` с полями:
  - `name`, `slug` (unique), `status`, `sortOrder`, `boostMultiplier`,
    `badgeText?`, `badgeColor?`, `description?`, `mergedToId?`, `createdAt`, `updatedAt`.

### `src/modules/offerTypes/publicRoutes.ts`
Монтируется на `/api/v1/offer-types`.

Helpers:
- Кодирование/декодирование курсора `{ sort, id }`.

Эндпоинт:
- `GET /`
  - Query: `q?`, `limit` (1..200), `cursor?`.
  - Фильтр `status: "active"` + поиск по name/slug.
  - Сортирует по `sortOrder` и `_id`.
  - Ответ: `{ items, nextCursor }`.

### `src/modules/offerTypes/adminRoutes.ts`
Монтируется на `/api/v1/offer-types` с админским middleware. Требует `authenticateJwt` и `authorize("admin")`.

Эндпоинты:
- `POST /`
  - Тело: `name`, `slug`, `sortOrder`, `boostMultiplier`, опционально `badgeText`, `badgeColor`, `description`, `status`.
  - Ответ: `201 { id }`.

- `PATCH /:id`
  - Тело: частичное от схемы создания.
  - Ответ: `{ id, name, slug, status, sortOrder, boostMultiplier, badgeText, badgeColor, description }`.

- `PATCH /:id/archive`
  - Ставит `status: "archived"`.
  - Ответ: `{ id, status }`.

- `PATCH /:id/restore`
  - Ставит `status: "active"` и очищает `mergedToId`.
  - Ответ: `{ id, status }`.

- `PATCH /:id/merge`
  - Тело: `{ targetId }`.
  - Переводит source в `archived`, сохраняет `mergedToId`.
  - Ответ: `{ mergedFrom, mergedTo }`.

## Модуль товаров

### `src/modules/products/productModel.ts`
- Модель Mongoose `Product` с полями:
  - `sellerId`, `title`, `description?`, `photos`, `oldPrice`, `price`,
    `mainCategoryId`, `subcategoryId?`, `offerTypeId`, `externalUrl?`,
    `status`, `deletedAt?`, `moderationNote?`, `approvedAt?`, `rejectedAt?`,
    `moderatedBy?`, `views7d`, `views30d`, `favoritesCount`,
    `clicksToExternal7d`, `rankScore`, `shuffleKey`, `isFeatured`,
    `featuredUntil?`, `adminTags`, `rankAdminBoost`, `promotionUntil?`,
    `createdAt`, `updatedAt`.
- Виртуальные поля:
  - `discountPercent`: `(oldPrice - price) / oldPrice` округленный.
  - `isHot`: `discountPercent >= 50`.

### `src/modules/products/productEventModel.ts`
- Модель Mongoose `ProductEvent` с полями:
  - `productId`, `type` ("view"|"click"), `ts`.
- Индексы:
  - TTL по `ts` (40 дней).
  - `{ productId: 1, ts: -1 }`.

### `src/modules/products/productMetricsService.ts`
- `recordView(productId: string): Promise<void>`
  - Проверяет ObjectId; если валидно — создает `ProductEvent` типа `"view"`.
- `recordClick(productId: string): Promise<void>`
  - Проверяет ObjectId; если валидно — создает `ProductEvent` типа `"click"`.

### `src/modules/products/rank.ts`
- `getOfferTypeBoost(offerTypeId): Promise<number>`
  - Читает `OfferType.boostMultiplier`, по умолчанию `1.0`.
- `calcRankScore(oldPrice, price, boost): number`
  - Если `oldPrice <= 0`: возвращает 0.
  - Считает скидку (0..1) и умножает на `boost` (clamped 0.1..5).
  - Возвращает число с 6 знаками после запятой.

### `src/modules/products/publicRoutes.ts`
Монтируется на `/api/v1/products`.

Helpers:
- `b64(j)` / `unb64(s)` для курсоров.

Примечание:
- В публичных ответах возвращаем `seller` только с публичными полями (например `companyName`, опционально `website`), без `inn/ogrn/legalAddress/contactEmail`.

Эндпоинты:
- `GET /`
  - Query:
    - `limit` (1..100, default 20),
    - `sort` (rank|new|popular, default rank),
    - `category?`, `subcategory?`, `offerTypeSlug?`, `hot?`, `cursor?`.
  - Фильтр: `status: "active"` и `deletedAt` не задан.
  - Если `offerTypeSlug` не найден: `{ items: [], nextCursor: null }`.
  - `hot=1` использует `$expr` для фильтра скидки >= 50%.
  - Сортировка и курсор:
    - `rank`: `rankScore desc`, `shuffleKey asc`, `_id asc`.
    - `new`: `createdAt desc`, `_id desc`.
    - `popular`: `views7d desc`, `_id asc`.
  - Ответ: `{ items, nextCursor }`.
    - Элемент: `id, title, photos, price, oldPrice, discountPercent, isHot, offerTypeId, mainCategoryId, subcategoryId, rankScore, views7d, favoritesCount, createdAt`.
    - `seller`: `{ id, companyName, website? }` (только публичные поля).

- `GET /:id`
  - Возвращает активный товар по id.
  - Записывает просмотр через `recordView(id)` (ошибки игнорируются).
  - Ответ: детальная карточка товара с метриками и `seller: { id, companyName, website? }` (только публичные поля).

- `GET /similar/:id`
  - Находит активный товар и возвращает до 12 похожих.
  - Логика: та же подкатегория, иначе та же категория; тот же offerType.
  - Ответ: `{ items: [ { id, title, photos, price, oldPrice, discountPercent, isHot } ] }`.

- `POST /:id/click`
  - Записывает клик через `recordClick(id)` (ошибки игнорируются).
  - Ответ: `{ externalUrl }`.

### `src/modules/products/sellerRoutes.ts`
Монтируется на `/api/v1/seller/products`. Требует `authenticateJwt` и `authorize("seller","admin")`.

Helpers:
- `oid(s)` -> ObjectId или null.
- `encode(v)` / `decode(s)` для курсоров.
- `requireActiveSeller(userId)`:
  - Требует seller-профиль со статусом `active`.
  - Иначе `ForbiddenError`.

Эндпоинты:
- `GET /`
  - Query: `status` (all|draft|active|archived), `limit`, `cursor`, `q`.
  - Список товаров продавца, сортировка по `_id` по возрастанию.
  - Ответ: `{ items, nextCursor }`.

- `POST /`
  - Тело: `title`, `description?`, `photos?`, `oldPrice`, `price`,
    `mainCategoryId`, `subcategoryId?`, `offerTypeId`, `externalUrl?`, `status`.
  - Проверяет `oldPrice > price`.
  - Считает rank по типу оффера.
  - Создает товар со статусом `draft` независимо от `status` в запросе.
  - Ответ: `201 { id }`.

- `GET /:id`
  - Возвращает товар продавца.
  - Ответ: детали с `status`.

- `PATCH /:id`
  - Частичное обновление полей.
  - Проверяет ObjectId для category/subcategory/offerType.
  - Требует `oldPrice > price`, если изменяется любая цена.
  - Пересчитывает `rankScore` при изменении цен или offerType.
  - Ответ: `{ id }`.

- `PATCH /:id/publish`
  - Меняет статус с `draft|rejected` на `pending`.
  - Сбрасывает поля модерации.
  - Ответ: `{ id, status }`.

- `PATCH /:id/unpublish`
  - Ставит статус `draft`.
  - Ответ: `{ id, status }`.

- `DELETE /:id`
  - Мягкое удаление: `status: "archived"`, `deletedAt: now`.
  - Ответ: `204 No Content`.

### `src/modules/products/adminRoutes.ts`
Монтируется на `/api/v1/admin/products`. Требует `authenticateJwt` и `authorize("admin")`.

Helpers:
- `oid(s)` -> ObjectId или null.
- `setStatus(idStr, status)`:
  - Обновляет статус товара и ставит `deletedAt`, если `archived`.
  - Возвращает обновленный документ.

Эндпоинты:
- `GET /`
  - Фильтры: `status`, `q`, `sellerId`, `categoryId`, `subcategoryId`, `offerTypeId`, `featured`, `hot`, `limit`, `cursor`.
  - Сортировка: `createdAt desc`, `_id desc`.
  - Ответ: `{ items, nextCursor }` с админскими полями.

- `GET /:id`
  - Возвращает полный документ + `seller`, `category`, `subcategory`, `offerType`.

- `PATCH /:id/publish`
  - Ставит статус `active` через `setStatus`.
  - Ответ: `{ id, status: "active" }`.

- `PATCH /:id/unpublish`
  - Ставит статус `draft`.
  - Ответ: `{ id, status: "draft" }`.

- `PATCH /:id/archive`
  - Ставит статус `archived`.
  - Ответ: `{ id, status: "archived" }`.

- `PATCH /:id/restore`
  - Ставит статус `active`.
  - Ответ: `{ id, status: "active" }`.

- `PATCH /:id/feature`
  - Тело: `{ featured: boolean, featuredUntil?: ISO datetime }`.
  - Обновляет `isFeatured` и `featuredUntil`.
  - Ответ: `{ id, isFeatured, featuredUntil }`.

- `PATCH /:id/tags`
  - Тело: `{ tags: ["best"|"popular"|"new"] }`.
  - Обновляет `adminTags`.
  - Ответ: `{ id, adminTags }`.

- `PATCH /:id/promotion`
  - Тело: `{ rankAdminBoost: number 0..1, until?: ISO datetime }`.
  - Обновляет промо и сразу пересчитывает `rankScore`.
  - Ответ: `{ id, rankAdminBoost, promotionUntil, rankScore }`.

- `DELETE /:id`
  - Полное удаление.
  - Ответ: `204 No Content`.

- `PATCH /:id/approve`
  - Апрувит товар в статусе `pending`:
    - `status: "active"`, `approvedAt`, очищает `rejectedAt`, `moderationNote`, ставит `moderatedBy`.
  - Ответ: `{ id, status }`.

- `PATCH /:id/reject`
  - Тело: `{ reason? }`.
  - Отклоняет товар в статусе `pending`:
    - `status: "rejected"`, `rejectedAt`, `moderationNote`, ставит `moderatedBy`.
  - Ответ: `{ id, status, reason }`.

## Модуль уведомлений

### `src/modules/notifications/notificationModel.ts`
- Модель Mongoose `Notification` с полями:
  - `userId`, `type`, `category`, `title`, `message?`, `data?`, `isRead`, `readAt?`, `createdAt`, `updatedAt`.

### `src/modules/notifications/notificationService.ts`
- `sendInApp(userId, payload)`
  - Создает документ `Notification` с дефолтами для `type` и `category`.
  - Возвращает созданный документ.
- `maybeSms(userId, text)`
  - Если `config.notifications.smsEnabled` = false: завершает.
  - Ищет телефон пользователя и отправляет SMS через `sendSms`.
  - При ошибке пишет warning (нефатально).
- Сценарии:
  - `notifySellerApplicationReceived(userId)`
  - `notifySellerApproved(userId)`
  - `notifySellerRejected(userId, reason?)`
  - `notifySellerSuspended(userId)`
  - `notifySellerUnsuspended(userId)`
  - Каждый создает in-app уведомление и при необходимости отправляет SMS.
  - Точные строки сообщений лежат в `src/modules/notifications/notificationService.ts`.

### `src/modules/notifications/userRoutes.ts`
Монтируется на `/api/v1/notifications`. Требует `authenticateJwt` и `authorize("user","seller","admin")`.

Эндпоинты:
- `GET /`
  - Query: `unread?` (1 чтобы фильтровать), `limit` (1..100), `cursor` (base64 `{id}`).
  - Возвращает `{ items, nextCursor }` с сортировкой по `_id` по убыванию.

- `POST /read`
  - Тело: `{ ids: string[] }`.
  - Помечает выбранные уведомления прочитанными.
  - Ответ: `{ updated }`.

- `POST /read-all`
  - Помечает все непрочитанные как прочитанные.
  - Ответ: `{ updated }`.

- `DELETE /:id`
  - Удаляет уведомление текущего пользователя.
  - Ответ: `204 No Content`.

## Модуль загрузок

### `src/modules/uploads/imageUploadRoutes.ts`
Монтируется на `/api/v1/uploads`. Требует `authenticateJwt` и `authorize("seller","admin")`.

- Конфигурация Multer:
  - Память (memoryStorage).
  - Максимальный размер файла = `config.uploads.maxMb`.
  - MIME типы из `config.uploads.allowedMime`.

Эндпоинт:
- `POST /images`
  - Поле form-data `images` (массив), ограничено `config.uploads.maxFiles`.
  - Загружает каждый файл последовательно через `uploadToImgur`.
  - Ответ `201 { items: [ { url, deleteHash, id, originalName, size, mime } ] }`.
  - Ошибки: `BadRequestError("No files")`, неподдерживаемый MIME, слишком много файлов.

## Формат ошибок

Ошибки типа `HttpError` возвращаются как:
```
{ "error": "<Code>", "message": "<Message>", "details": <Details?> }
```
Неизвестные ошибки возвращают `500 { "error": "InternalServerError" }`.

## Сводка по аутентификации

- Access токены: JWT, подписанные `JWT_ACCESS_SECRET`.
- Refresh токены: JWT, подписанные `JWT_REFRESH_SECRET`, хранятся в cookie `refreshToken`.
- Защищенные роуты требуют `Authorization: Bearer <accessToken>`.
- Проверка ролей выполняется middleware `authorize`.
