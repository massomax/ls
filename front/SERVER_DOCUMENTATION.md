# Server Documentation (Code-Exact)

This document enumerates every file, function, and endpoint in /mnt/j/dev-lp/server as implemented. It avoids assumptions and only states what is visible in code.

## Root Files

### `package.json`
- Purpose: Node package metadata, scripts, dependencies.
- Scripts:
  - `dev`: `ts-node-dev --respawn --transpile-only src/server.ts`.
  - `dev:nodemon`: `nodemon` (uses `nodemon.json`).
  - `dev:ts-node`: `ts-node src/server.ts`.
  - `dev:debug`: `nodemon --inspect`.
  - `build`: `tsc -p tsconfig.json`.
  - `typecheck`: `tsc -p tsconfig.json --noEmit`.
  - `clean`: delete `dist` recursively.
  - `start`: `node dist/server.js`.
  - `start:prod`: set `NODE_ENV=production`, then `dist/server.js`.
  - `lint`: `eslint .`.
  - `test`: `jest`.
- Engines: Node >= 20, pnpm >= 9 < 10.

### `tsconfig.json`
- TypeScript compiler options (ES2022 target, CommonJS modules, `src` -> `dist`, `strict`, `typeRoots` includes `src/types`).

### `nodemon.json`
- Watches `src`, extensions `ts,js,json`.
- Runs `ts-node src/server.ts` with `NODE_ENV=development`.

### `.env`
- Loaded by `dotenv/config` (see `src/shared/config/index.ts`).
- Not documented here because it is environment-specific and not in code.

### `.env.example`, `.env.prod`, `.env.prod.example`
- Environment variable examples for local and production setups.

### `package-lock.json`
- Auto-generated dependency lockfile.

## Runtime Entry

### `src/server.ts`
- `main(): Promise<void>`
  - Connects to MongoDB via `connectMongo(config.mongoUri)`.
  - On connect error: logs and `process.exit(1)`.
  - Starts metrics cron via `startMetricsCron()`.
  - Starts HTTP server on `config.port`.
  - Handles `SIGINT` and `SIGTERM` by closing server and exiting.
- `main()` is invoked immediately; also exported.

### `src/app.ts`
- Creates Express app with middleware:
  - `helmet()`.
  - `cors(corsOptions)` with custom origin callback.
  - `express.json({ limit: "2mb" })`.
  - `cookieParser()`.
  - `app.set("trust proxy", 1)` in production; otherwise `false`.
  - `rateLimit`: 60s window, max 300 requests, standard headers.
- `corsOptions.origin(origin, cb)`
  - Allows requests with no `origin`.
  - Allows `origin` if in `config.cors.origins`.
  - Otherwise calls `cb(new Error("CORS blocked by server"))`.
- Endpoint:
  - `GET /health`: returns `200` JSON `{ status: "ok" }`.
- Mounts routers under `/api/v1`:
  - `/users` -> `src/modules/users/userRoutes.ts`.
  - `/users/me/favorites` -> `src/modules/users/favoriteRoutes.ts`.
  - `/auth` -> `src/modules/auth/routes.ts`.
  - `/sellers` -> `src/modules/sellers/sellerRoutes.ts`.
  - `/offer-types` -> public and admin routes.
  - `/categories` -> public routes.
  - `/admin/categories` -> admin routes.
  - `/subcategories` -> seller routes.
  - `/admin/subcategories` -> admin routes.
  - `/products` -> public routes.
  - `/seller/products` -> seller routes.
  - `/uploads` -> `imageUploadRoutes`.
  - `/admin/sellers` -> seller admin routes.
  - `/admin/products` -> product admin routes.
  - `/notifications` -> `notificationUserRoutes`.
  - Swagger routes -> `src/shared/docs/swagger.ts`.
- Error handling:
  - `notFound` for unmatched routes.
  - `errorHandler` for exceptions.

## Shared Infrastructure

### `src/infra/db/mongoose.ts`
- `connectMongo(uri: string): Promise<void>`
  - Sets `mongoose.set("strictQuery", true)`.
  - Connects via `mongoose.connect(uri, {})`.
  - Logs `"Mongo connected"` on success.

### `src/infra/storage/imgurClient.ts`
- `uploadToImgur(buffer: Buffer, mime: string): Promise<UploadedImage>`
  - Reads Imgur client ID from `config.imgur.clientId`.
  - If missing client ID: returns placeholder image URL and logs.
  - Otherwise sends POST to `https://api.imgur.com/3/image` with base64 image.
  - On network or API error:
    - In non-production, logs warning and returns placeholder URL.
    - In production, throws `Error`.
  - Returns `{ id, deleteHash, url }` from Imgur response.
- `UploadedImage`: `{ id?: string; deleteHash?: string; url: string }`.

### `src/infra/sms/smsProvider.ts`
- `SmsProvider` interface:
  - `sendSms({ to: string; text: string }): Promise<void>`.

### `src/infra/sms/smsAeroAdapter.ts`
- `toProviderNumber(e164: string): string`
  - Strips non-digits; SMS Aero expects digits without `+`.
- `sendSms({ to, text }): Promise<void>`
  - Logs SMS in non-production.
  - If `SMSAERO_EMAIL` or `SMSAERO_API_KEY` missing: returns without sending.
  - Calls SMS Aero via GET `https://gate.smsaero.ru/v21/sms/send` with query params.
  - Uses Basic auth header `base64(email:apiKey)`.
  - On network or response error:
    - In non-production, logs warning and returns.
    - In production, throws `Error`.
- Default export is `sendSms`.

### `src/infra/cron/metricsCron.ts`
- `startMetricsCron(): void`
  - Schedules `*/30 * * * *` (every 30 minutes).
  - Aggregates `ProductEvent` to compute:
    - `views7d`, `views30d` from `type: "view"`.
    - `clicksToExternal7d` from `type: "click"`.
  - Iterates all products and updates:
    - `views7d`, `views30d`, `clicksToExternal7d`.
    - Recalculates `rankScore` using:
      - `calcRankScore(oldPrice, price, offerTypeBoost)`.
      - Bonus for views and favorites.
      - Optional admin boost if `promotionUntil` active.
  - Logs success or error to console.

## Shared HTTP and Utilities

### `src/shared/errors/httpErrors.ts`
- `HttpError`: base class with `status`, `code`, `details`.
- Derived errors:
  - `BadRequestError` -> 400
  - `UnauthorizedError` -> 401
  - `ForbiddenError` -> 403
  - `NotFoundError` -> 404
  - `ConflictError` -> 409
  - `TooManyRequestsError` -> 429

### `src/shared/http/errorHandler.ts`
- `notFound(_req, res)`: returns `404` JSON `{ error: "NotFound" }`.
- `errorHandler(err, _req, res, _next)`:
  - For `HttpError`:
    - Logs if status >= 500.
    - Responds with `{ error: err.code, message: err.message, details: err.details }`.
  - Otherwise logs and returns `500` `{ error: "InternalServerError" }`.

### `src/shared/http/authenticateJwt.ts`
- `authenticateJwt(req, _res, next)`
  - Reads `Authorization` header, expects `Bearer <token>`.
  - Verifies with `config.jwt.accessSecret`.
  - Sets `req.user` to payload `{ sub, roles?, iat?, exp? }`.
  - On missing/invalid header or token: throws `UnauthorizedError`.

### `src/shared/http/authorize.ts`
- `authorize(...allowed: string[])` returns middleware:
  - Checks `req.user.roles`.
  - Allows if any role in `allowed` OR role includes `admin`.
  - Otherwise throws `ForbiddenError`.

### `src/shared/utils/slug.ts`
- `slugify(input: string): string`
  - Lowercases and trims.
  - Keeps `[a-z0-9]`.
  - Maps spaces/underscores/dashes to `-`.
  - Transliterates Russian letters using the `table` constant.
  - Removes repeated dashes and trims edges.
  - Returns max 64 chars; if empty, returns `"item"`.

### `src/shared/utils/phone.ts`
- `normalizeE164(phone: string): string`
  - Strips non-digits.
  - Returns `"+" + digits` or empty string if no digits.

### `src/shared/config/index.ts`
- `csv(value, fallback)`: splits comma-separated string into trimmed array; returns fallback if empty.
- `durationToSeconds(input: string): number`:
  - If numeric: parse seconds.
  - Else matches `<number><unit>` where unit is s/m/h/d/w.
  - Returns seconds, or default `900` if invalid.
- `envSchema`: zod schema for env vars; values parsed from `process.env`.
- `config` object:
  - `nodeEnv`, `port`, `mongoUri`.
  - `jwt`: access/refresh secrets and expiry seconds.
  - `cookies`: `domain`, `secure`.
  - `cors.origins`: from `CORS_ORIGINS` or default `["http://localhost:5173"]`.
  - `smsaero`: email, apiKey, sign, channel.
  - `notifications`: `smsEnabled`, `smsSellerEvents`.
  - `imgur.clientId`.
  - `otp`: `ttlSec`, `resendSec`, `maxAttempts`.
  - `uploads`: `maxFiles`, `maxMb`, `allowedMime`.

### `src/shared/logger/index.ts`
- `logger`: pino instance.
  - Dev: pretty transport, level `debug`.
  - Prod: level `info`.

### `src/shared/docs/swagger.ts`
- Loads OpenAPI spec from `path.join(process.cwd(), "docs", "openapi.yaml")`.
- Endpoints:
  - `GET /openapi.json`: returns JSON OpenAPI spec.
  - `GET /docs`: serves Swagger UI HTML.
  - `GET /docs/init.js`: returns JS that boots Swagger UI with `/openapi.json`.
  - Serves static Swagger UI assets at `/swagger-ui/*`.

### `src/types/express/index.d.ts`
- Augments Express `Request` with optional `user?: { sub: string; roles?: string[] }`.

### `src/types/api.ts`
- TypeScript type definitions for API payloads used by frontend.

## Authentication Module

### `src/modules/auth/otpModel.ts`
- Mongoose model `OtpCode` with fields:
  - `phone`, `purpose` ("login"), `codeHash`, `attempts`, `consumed`, `expiresAt`, `lastSentAt`, `sentCount`, `createdAt`, `updatedAt`.
- Indexes:
  - `{ phone: 1, purpose: 1, createdAt: -1 }`.
  - `expiresAt` indexed for queries.

### `src/modules/auth/otpService.ts`
- `randomCode(len = 6): string`
  - Generates a numeric string of length `len` using `Math.random()`.
- `issueCode(rawPhone: string): Promise<{ phone: string; code: string }>`
  - Normalizes phone to E.164 via `normalizeE164`.
  - Finds last OTP (`purpose: "login"`) to enforce resend cooldown.
  - Throws `TooManyRequestsError` if resend window not passed.
  - Hashes code with bcrypt, sets `expiresAt`, increments `sentCount`.
  - Saves OTP document and returns `{ phone, code }` (code is plain).
- `verifyCode(rawPhone: string, code: string): Promise<boolean>`
  - Normalizes phone. If invalid: returns `false`.
  - Gets latest unconsumed OTP for `purpose: "login"`.
  - Returns `false` if expired or max attempts reached.
  - Compares bcrypt hash, increments attempts, marks `consumed` on success.
  - Returns `true` if code matches.

### `src/modules/auth/tokenService.ts`
- `issueAccess(payload: JwtLike): string`
  - Signs JWT with `HS256` using `config.jwt.accessSecret` and `accessExpires`.
- `issueRefresh(payload: JwtLike): string`
  - Signs JWT with `HS256` using `config.jwt.refreshSecret` and `refreshExpires`.
  - Adds `typ: "refresh"` to payload.
- `cookieOpts(): { httpOnly, sameSite, secure, domain, path, maxAge }`
  - Uses `config.cookies` and `config.jwt.refreshExpires`.
- `setRefreshCookie(res, token)`
  - Sets `refreshToken` cookie with `cookieOpts()`.

### `src/modules/auth/routes.ts`
Mounted at `/api/v1/auth`.

Endpoints:
- `GET /ping`
  - Response: `{ ok: true, where: "auth" }`.

- `POST /login-sms/request`
  - Body: `{ phone: string (5..32) }`.
  - Validates via zod and `normalizeE164`.
  - Creates user if not found (roles `["user"]`, `isPhoneVerified: false`).
  - Calls `issueCode(e164)` and sends SMS via `sendSms` with text:
    - `Kod dlya vhoda: <code>. Nikomu ego ne soobschayte.`
  - Response: `204 No Content`.
  - Errors: `BadRequestError("Invalid phone")`, `TooManyRequestsError` from `issueCode`.

- `POST /login-sms/verify`
  - Body: `{ phone: string, code: string }` (5..32, 4..8).
  - Validates and normalizes phone.
  - Calls `verifyCode`; if false -> `BadRequestError("InvalidOrExpiredCode")`.
  - Sets `isPhoneVerified=true` for the user.
  - Issues access + refresh tokens, sets refresh cookie.
  - Response: `{ accessToken, roles }`.
  - Errors: `BadRequestError`, `UnauthorizedError("UserNotFound")` if user missing.

- `POST /refresh`
  - Reads `refreshToken` cookie.
  - Verifies with `config.jwt.refreshSecret`, requires payload `typ === "refresh"`.
  - Issues new access and refresh tokens; resets refresh cookie.
  - Response: `{ accessToken }`.
  - Errors: `UnauthorizedError("MissingRefresh")` or `UnauthorizedError("InvalidRefresh")`.

- `POST /logout`
  - Clears `refreshToken` cookie (path `/`).
  - Response: `204 No Content`.

## Users Module

### `src/modules/users/userModel.ts`
- Mongoose model `User` with fields:
  - `phone` (unique), `isPhoneVerified`, `name?`, `gender?`, `birthDate?`, `roles`, `createdAt`, `updatedAt`.

### `src/modules/users/userRoutes.ts`
Mounted at `/api/v1/users`. All routes require `authenticateJwt`.

Endpoints:
- `GET /me`
  - Returns user profile for `req.user.sub`.
  - Response:
    - `{ id, phone, isPhoneVerified, name, gender, birthDate, roles, createdAt }`.
  - If user not found: `404 { error: "NotFound" }`.

- `PATCH /me`
  - Body (all optional): `name`, `gender`, `birthDate` (ISO or `YYYY-MM-DD`).
  - Validates body via zod; parses `birthDate` to Date.
  - Updates user and returns same shape as GET `/me`.
  - If user not found: `404 { error: "NotFound" }`.
  - Errors: `BadRequestError("Invalid input")`, `BadRequestError("Invalid birthDate")`.

### `src/modules/users/favoriteModel.ts`
- Mongoose model `Favorite`:
  - Fields: `userId`, `productId`, `createdAt`.
  - Unique index on `{ userId, productId }`.

### `src/modules/users/favoriteRoutes.ts`
Mounted at `/api/v1/users/me/favorites`. All routes require `authenticateJwt`.

Helpers:
- `encodeCursor(id)` / `decodeCursor(cursor)`: base64 cursor using `{ id }`.

Endpoints:
- `GET /`
  - Query: `limit` (1..100, default 20), `cursor` (base64).
  - Returns `{ items, nextCursor }` with items sorted by `_id` ascending.
  - Each item: `{ id, productId, createdAt }`.

- `POST /`
  - Body: `{ productId }` (string).
  - Creates favorite, increments `Product.favoritesCount` by 1.
  - Response `201` with `{ id, productId, createdAt }`.
  - Errors: invalid input, invalid `productId`, or `409 AlreadyInFavorites`.

- `DELETE /:productId`
  - Deletes favorite for current user and product.
  - If deleted, decrements `Product.favoritesCount` by 1.
  - Response `204 No Content` (even if not found).
  - Errors: invalid `productId`.

## Sellers Module

### `src/modules/sellers/sellerModel.ts`
- Mongoose model `Seller` with fields:
  - `userId`, `companyName`, `inn`, `ogrn?`, `legalAddress?`, `website?`,
    `contactName?`, `contactEmail?`, `status`, `isVerified`, `tier`,
    `moderationNote?`, `approvedAt?`, `rejectedAt?`, `suspendedAt?`,
    `createdAt`, `updatedAt`.
  - Unique index on `userId`.

### `src/modules/sellers/sellerRoutes.ts`
Mounted at `/api/v1/sellers`.

Endpoints:
- `POST /apply` (requires `authenticateJwt`)
  - Body: `companyName`, `inn` (10-12 digits), optional `ogrn`, `legalAddress`, `website`, `contactName`, `contactEmail`.
  - If seller exists with `pending|active|suspended`: `409 AlreadyAppliedOrActive`.
  - If seller exists with `rejected`: updates fields and sets status to `pending`.
  - If new: creates seller with `pending`, `isVerified=false`, `tier=free`.
  - Notifies user via `notifySellerApplicationReceived` when reapplying.
  - Response: `{ id, status }` with `200` or `201`.

- `GET /me` (requires `authenticateJwt`)
  - Returns seller profile for current user.
  - If missing: `404 SellerProfileNotFound`.

- `GET /me/stats` (requires `authenticateJwt` and `authorize("seller","admin")`)
  - Query: `period` in `7d|30d` (default `7d`).
  - Requires seller profile with status `active`; otherwise `ForbiddenError`.
  - Aggregates counts from seller products.
  - Response:
    - `{ period: "live", products: { total, active, archived }, views7d, views30d, favorites, clicks7d }`.

### `src/modules/sellers/adminRoutes.ts`
Mounted at `/api/v1/admin/sellers`. Requires `authenticateJwt` and `authorize("admin")`.

Helpers:
- `oid(s)` -> ObjectId or null.
- `addSellerRole(userId)` adds `seller` role to user.
- `removeSellerRole(userId)` removes `seller` role from user.

Endpoints:
- `GET /`
  - Query: `status` (pending|active|rejected|suspended|all), `limit`, `cursor`, `q`.
  - Cursor is base64 `{ id }`; pagination by `_id` ascending.
  - `q` searches `companyName`, `inn`, `contactEmail`, and joined user phone.
  - Response: `{ items, nextCursor }` with seller + user info.

- `GET /:id`
  - Response: seller details + user phone/roles.

- `PATCH /:id/approve`
  - Sets status to `active`, `isVerified=true`, `approvedAt=now`.
  - Clears `rejectedAt`/`suspendedAt`.
  - Notifies user via `notifySellerApproved` and adds `seller` role.
  - Response: `{ id, status, isVerified }`.

- `PATCH /:id/reject`
  - Body: `{ reason? }`.
  - Sets status `rejected`, `isVerified=false`, `rejectedAt=now`, stores `moderationNote`.
  - Notifies user via `notifySellerRejected` and removes `seller` role.
  - Response: `{ id, status }`.

- `PATCH /:id/suspend`
  - Sets status `suspended`, `suspendedAt=now`.
  - Notifies user via `notifySellerSuspended`, removes `seller` role.
  - Response: `{ id, status }`.

- `PATCH /:id/unsuspend`
  - Sets status `active`, `isVerified=true`, clears `suspendedAt`.
  - Notifies user via `notifySellerUnsuspended`, adds `seller` role.
  - Response: `{ id, status, isVerified }`.

- `PATCH /:id/tier`
  - Body: `{ tier: "free"|"plus"|"pro" }`.
  - Updates tier. Response `{ id, tier }`.

## Categories Module

### `src/modules/categories/categoryModel.ts`
- Mongoose model `Category` with fields:
  - `name`, `slug` (unique), `svgUrl`, `status`, `sortOrder`, `description?`, `createdAt`, `updatedAt`.
  - Indexes on `status/sortOrder` and `name`.

### `src/modules/categories/publicRoutes.ts`
Mounted at `/api/v1/categories`.

Endpoints:
- `GET /`
  - Returns active categories sorted by `sortOrder` then `_id`.
  - Response: `{ items: [{ id, name, slug, svgUrl, sortOrder, description }] }`.

- `GET /:categoryId/subcategories`
  - Validates ObjectId; otherwise `400 { error: "BadRequest" }`.
  - Returns active subcategories for given category.

- `GET /by-slug/:slug`
  - Finds active category by slug.
  - If not found: `404 { error: "NotFound" }`.
  - Response: `{ id, name, slug, svgUrl, sortOrder, description }`.

### `src/modules/categories/adminRoutes.ts`
Mounted at `/api/v1/admin/categories`. Requires `authenticateJwt` and `authorize("admin")`.

Endpoints:
- `POST /`
  - Body: `name`, `slug`, `svgUrl`, `sortOrder`, `description?`, `status?`.
  - Response: `201 { id }`.
  - Errors: duplicate slug -> `409 SlugAlreadyExists`.

- `PATCH /:id`
  - Body: partial of create schema.
  - Response: `{ id, name, slug, svgUrl, status, sortOrder, description }`.

- `PATCH /:id/archive`
  - Sets `status` to `archived`.
  - Response: `{ id, status }`.

- `PATCH /:id/restore`
  - Sets `status` to `active`.
  - Response: `{ id, status }`.

## Subcategories Module

### `src/modules/subcategories/subcategoryModel.ts`
- Mongoose model `Subcategory` with fields:
  - `parentCategoryId`, `name`, `slug`, `status`, `createdBy`,
    `proposedBySellerId?`, `description?`, `mergedToId?`, `reason?`, `createdAt`, `updatedAt`.
  - Unique index on `{ parentCategoryId, slug }` for active status.

### `src/modules/subcategories/sellerRoutes.ts`
Mounted at `/api/v1/subcategories`. Requires `authenticateJwt` and `authorize("seller","admin")`.

Endpoints:
- `POST /propose`
  - Body: `{ parentCategoryId, name, description? }`.
  - Validates category exists and is active.
  - Validates seller profile exists.
  - Creates subcategory with `status: "pending"`, `createdBy: "seller"`.
  - Response: `201 { id, status, slug }`.
  - Errors: duplicate slug in category -> `409 SlugAlreadyExistsForCategory`.

### `src/modules/subcategories/adminRoutes.ts`
Mounted at `/api/v1/admin/subcategories`. Requires `authenticateJwt` and `authorize("admin")`.

Helpers:
- `toId(s)` -> ObjectId or null.

Endpoints:
- `GET /pending`
  - Query: `categoryId?`, `limit`, `cursor` (base64 `{id}`).
  - Returns pending subcategories sorted by `_id` desc.
  - Response: `{ items, nextCursor }`.

- `PATCH /:id/approve`
  - Body: `{ name?, slug?, description? }`.
  - Only for `pending` subcategories.
  - Sets `status: "active"`, updates name/slug/description, clears `reason`.
  - Response: `{ id, status, name, slug }`.

- `PATCH /:id/reject`
  - Body: `{ reason? }`.
  - Sets `status: "archived"` and `reason` (defaults to "rejected").
  - Response: `{ id, status }`.

- `PATCH /:id/merge`
  - Body: `{ targetId }`.
  - Requires same parent category and target status `active`.
  - Moves products from source to target subcategory.
  - Archives source and stores `mergedToId` and `reason` with count.
  - Response: `{ mergedFrom, mergedTo, movedProducts }`.

- `PATCH /:id/archive`
  - Body: `{ reason? }`.
  - Sets `status: "archived"` and `reason`.
  - Response: `{ id, status }`.

- `PATCH /:id/restore`
  - Requires current status `archived`.
  - Sets `status: "active"`, clears `reason`.
  - Response: `{ id, status: "active" }`.

## Offer Types Module

### `src/modules/offerTypes/offerTypeModel.ts`
- Mongoose model `OfferType` with fields:
  - `name`, `slug` (unique), `status`, `sortOrder`, `boostMultiplier`,
    `badgeText?`, `badgeColor?`, `description?`, `mergedToId?`, `createdAt`, `updatedAt`.

### `src/modules/offerTypes/publicRoutes.ts`
Mounted at `/api/v1/offer-types`.

Helpers:
- Cursor encoding/decoding for `{ sort, id }`.

Endpoint:
- `GET /`
  - Query: `q?`, `limit` (1..200), `cursor?`.
  - Filters by `status: "active"` and optional name/slug match.
  - Sorts by `sortOrder` and `_id`.
  - Response: `{ items, nextCursor }`.

### `src/modules/offerTypes/adminRoutes.ts`
Mounted at `/api/v1/offer-types` with admin middleware. Requires `authenticateJwt` and `authorize("admin")`.

Endpoints:
- `POST /`
  - Body: `name`, `slug`, `sortOrder`, `boostMultiplier`, optional `badgeText`, `badgeColor`, `description`, `status`.
  - Response: `201 { id }`.

- `PATCH /:id`
  - Body: partial of create schema.
  - Response: `{ id, name, slug, status, sortOrder, boostMultiplier, badgeText, badgeColor, description }`.

- `PATCH /:id/archive`
  - Sets `status: "archived"`.
  - Response: `{ id, status }`.

- `PATCH /:id/restore`
  - Sets `status: "active"` and clears `mergedToId`.
  - Response: `{ id, status }`.

- `PATCH /:id/merge`
  - Body: `{ targetId }`.
  - Sets source to `archived`, stores `mergedToId`.
  - Response: `{ mergedFrom, mergedTo }`.

## Products Module

### `src/modules/products/productModel.ts`
- Mongoose model `Product` with fields:
  - `sellerId`, `title`, `description?`, `photos`, `oldPrice`, `price`,
    `mainCategoryId`, `subcategoryId?`, `offerTypeId`, `externalUrl?`,
    `status`, `deletedAt?`, `moderationNote?`, `approvedAt?`, `rejectedAt?`,
    `moderatedBy?`, `views7d`, `views30d`, `favoritesCount`,
    `clicksToExternal7d`, `rankScore`, `shuffleKey`, `isFeatured`,
    `featuredUntil?`, `adminTags`, `rankAdminBoost`, `promotionUntil?`,
    `createdAt`, `updatedAt`.
- Virtuals:
  - `discountPercent`: `(oldPrice - price) / oldPrice` rounded.
  - `isHot`: `discountPercent >= 50`.

### `src/modules/products/productEventModel.ts`
- Mongoose model `ProductEvent` with fields:
  - `productId`, `type` ("view"|"click"), `ts`.
- Indexes:
  - TTL on `ts` (40 days).
  - `{ productId: 1, ts: -1 }`.

### `src/modules/products/productMetricsService.ts`
- `recordView(productId: string): Promise<void>`
  - Validates ObjectId; if valid, creates `ProductEvent` with `type: "view"`.
- `recordClick(productId: string): Promise<void>`
  - Validates ObjectId; if valid, creates `ProductEvent` with `type: "click"`.

### `src/modules/products/rank.ts`
- `getOfferTypeBoost(offerTypeId): Promise<number>`
  - Reads `OfferType.boostMultiplier`, default `1.0`.
- `calcRankScore(oldPrice, price, boost): number`
  - If `oldPrice <= 0`: returns 0.
  - Computes discount (0..1) and multiplies by `boost` (clamped 0.1..5).
  - Returns number with 6 decimals.

### `src/modules/products/publicRoutes.ts`
Mounted at `/api/v1/products`.

Helpers:
- `b64(j)` / `unb64(s)` for cursor encoding.

Note:
- Public responses include `seller` with public fields only (e.g. `companyName`, optionally `website`), never `inn/ogrn/legalAddress/contactEmail`.

Endpoints:
- `GET /`
  - Query:
    - `limit` (1..100, default 20),
    - `sort` (rank|new|popular, default rank),
    - `category?`, `subcategory?`, `offerTypeSlug?`, `hot?`, `cursor?`.
  - Filters: `status: "active"` and `deletedAt` not set.
  - If `offerTypeSlug` not found: returns `{ items: [], nextCursor: null }`.
  - `hot=1` uses `$expr` to filter discount >= 50%.
  - Sorting and cursor:
    - `rank`: sort by `rankScore desc`, `shuffleKey asc`, `_id asc`.
    - `new`: sort by `createdAt desc`, `_id desc`.
    - `popular`: sort by `views7d desc`, `_id asc`.
  - Response: `{ items, nextCursor }`.
    - Each item includes: `id, title, photos, price, oldPrice, discountPercent, isHot, offerTypeId, mainCategoryId, subcategoryId, rankScore, views7d, favoritesCount, createdAt`.
    - `seller`: `{ id, companyName, website? }` (public fields only).

- `GET /:id`
  - Fetches active product by id.
  - Records a view via `recordView(id)` (errors ignored).
  - Response: product detail fields including metrics plus `seller: { id, companyName, website? }` (public fields only).

- `GET /similar/:id`
  - Finds active product and returns up to 12 similar products.
  - Similarity: same subcategory if present, else same main category; same offerType.
  - Response: `{ items: [ { id, title, photos, price, oldPrice, discountPercent, isHot } ] }`.

- `POST /:id/click`
  - Records click via `recordClick(id)` (errors ignored).
  - Response: `{ externalUrl }`.

### `src/modules/products/sellerRoutes.ts`
Mounted at `/api/v1/seller/products`. Requires `authenticateJwt` and `authorize("seller","admin")`.

Helpers:
- `oid(s)` -> ObjectId or null.
- `encode(v)` / `decode(s)` for cursor.
- `requireActiveSeller(userId)`:
  - Requires seller profile with `status === "active"`.
  - Throws `ForbiddenError` otherwise.

Endpoints:
- `GET /`
  - Query: `status` (all|draft|active|archived), `limit`, `cursor`, `q`.
  - Lists seller products sorted by `_id` ascending.
  - Response: `{ items, nextCursor }`.

- `POST /`
  - Body: `title`, `description?`, `photos?`, `oldPrice`, `price`,
    `mainCategoryId`, `subcategoryId?`, `offerTypeId`, `externalUrl?`, `status`.
  - Validates `oldPrice > price`.
  - Calculates rank using offer type boost.
  - Creates product with `status: "draft"` regardless of requested status.
  - Response: `201 { id }`.

- `GET /:id`
  - Fetches product owned by current seller.
  - Response: detail fields including `status`.

- `PATCH /:id`
  - Partial update of fields.
  - Validates ObjectIds for category/subcategory/offerType.
  - Enforces `oldPrice > price` if either price field changes.
  - Recomputes `rankScore` if prices or offerType changed.
  - Response: `{ id }`.

- `PATCH /:id/publish`
  - Changes status from `draft|rejected` to `pending`.
  - Clears moderation fields.
  - Response: `{ id, status }`.

- `PATCH /:id/unpublish`
  - Sets status to `draft`.
  - Response: `{ id, status }`.

- `DELETE /:id`
  - Soft delete: sets `status: "archived"`, `deletedAt: now`.
  - Response: `204 No Content`.

### `src/modules/products/adminRoutes.ts`
Mounted at `/api/v1/admin/products`. Requires `authenticateJwt` and `authorize("admin")`.

Helpers:
- `oid(s)` -> ObjectId or null.
- `setStatus(idStr, status)`:
  - Updates product status and sets `deletedAt` if `archived`.
  - Returns updated product.

Endpoints:
- `GET /`
  - Query filters: `status`, `q`, `sellerId`, `categoryId`, `subcategoryId`, `offerTypeId`, `featured`, `hot`, `limit`, `cursor`.
  - Sorts by `createdAt desc`, `_id desc`.
  - Response: `{ items, nextCursor }` with admin fields.

- `GET /:id`
  - Returns full product document plus `seller`, `category`, `subcategory`, `offerType` references.

- `PATCH /:id/publish`
  - Sets status to `active` via `setStatus`.
  - Response: `{ id, status: "active" }`.

- `PATCH /:id/unpublish`
  - Sets status to `draft`.
  - Response: `{ id, status: "draft" }`.

- `PATCH /:id/archive`
  - Sets status to `archived`.
  - Response: `{ id, status: "archived" }`.

- `PATCH /:id/restore`
  - Sets status to `active`.
  - Response: `{ id, status: "active" }`.

- `PATCH /:id/feature`
  - Body: `{ featured: boolean, featuredUntil?: ISO datetime }`.
  - Updates `isFeatured` and optional `featuredUntil`.
  - Response: `{ id, isFeatured, featuredUntil }`.

- `PATCH /:id/tags`
  - Body: `{ tags: ["best"|"popular"|"new"] }`.
  - Updates `adminTags`.
  - Response: `{ id, adminTags }`.

- `PATCH /:id/promotion`
  - Body: `{ rankAdminBoost: number 0..1, until?: ISO datetime }`.
  - Updates promotion fields and recalculates `rankScore` immediately.
  - Response: `{ id, rankAdminBoost, promotionUntil, rankScore }`.

- `DELETE /:id`
  - Hard delete.
  - Response: `204 No Content`.

- `PATCH /:id/approve`
  - Approves product in `pending` status:
    - sets `status: "active"`, `approvedAt`, clears `rejectedAt`, `moderationNote`, sets `moderatedBy`.
  - Response: `{ id, status }`.

- `PATCH /:id/reject`
  - Body: `{ reason? }`.
  - Rejects product in `pending` status:
    - sets `status: "rejected"`, `rejectedAt`, `moderationNote`, sets `moderatedBy`.
  - Response: `{ id, status, reason }`.

## Notifications Module

### `src/modules/notifications/notificationModel.ts`
- Mongoose model `Notification` with fields:
  - `userId`, `type`, `category`, `title`, `message?`, `data?`, `isRead`, `readAt?`, `createdAt`, `updatedAt`.

### `src/modules/notifications/notificationService.ts`
- `sendInApp(userId, payload)`
  - Creates a `Notification` document with defaults for `type` and `category`.
  - Returns created document.
- `maybeSms(userId, text)`
  - If `config.notifications.smsEnabled` is false: returns.
  - Looks up user phone and sends SMS with `sendSms`.
  - Logs warning on failure (non-fatal).
- Scenario functions:
  - `notifySellerApplicationReceived(userId)`
  - `notifySellerApproved(userId)`
  - `notifySellerRejected(userId, reason?)`
  - `notifySellerSuspended(userId)`
  - `notifySellerUnsuspended(userId)`
  - Each creates in-app notification with fixed title/message and optionally sends SMS based on config.
  - Exact message strings are defined in `src/modules/notifications/notificationService.ts`.

### `src/modules/notifications/userRoutes.ts`
Mounted at `/api/v1/notifications`. Requires `authenticateJwt` and `authorize("user","seller","admin")`.

Endpoints:
- `GET /`
  - Query: `unread?` (1 to filter), `limit` (1..100), `cursor` (base64 `{id}`).
  - Returns `{ items, nextCursor }` sorted by `_id` desc.

- `POST /read`
  - Body: `{ ids: string[] }`.
  - Marks specified notifications as read for current user.
  - Response: `{ updated }`.

- `POST /read-all`
  - Marks all unread notifications as read for current user.
  - Response: `{ updated }`.

- `DELETE /:id`
  - Deletes notification for current user.
  - Response: `204 No Content`.

## Uploads Module

### `src/modules/uploads/imageUploadRoutes.ts`
Mounted at `/api/v1/uploads`. Requires `authenticateJwt` and `authorize("seller","admin")`.

- Multer config:
  - Memory storage.
  - Max file size = `config.uploads.maxMb`.
  - Allowed MIME types from `config.uploads.allowedMime`.

Endpoint:
- `POST /images`
  - Form-data field `images` (array) limited to `config.uploads.maxFiles`.
  - Uploads each file sequentially via `uploadToImgur`.
  - Response `201 { items: [ { url, deleteHash, id, originalName, size, mime } ] }`.
  - Errors: `BadRequestError("No files")`, unsupported file type, too many files.

## Error Response Format

Errors thrown as `HttpError` are returned as:
```
{ "error": "<Code>", "message": "<Message>", "details": <Details?> }
```
Unknown errors return `500 { "error": "InternalServerError" }`.

## Auth Summary

- Access tokens: JWT signed with `JWT_ACCESS_SECRET`.
- Refresh tokens: JWT signed with `JWT_REFRESH_SECRET`, stored in `refreshToken` cookie.
- Protected routes require `Authorization: Bearer <accessToken>`.
- Role checks are enforced by `authorize` middleware.
