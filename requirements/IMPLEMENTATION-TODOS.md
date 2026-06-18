# Eternous — Implementation TODOs

Voice-cloning app: users sign up, build family trees of loved ones, upload voice versions, chat via GPT (external), and hear replies in a cloned voice.

**Flow:** Sign up → Home (favorites / recent) → Trees → Members → Voice versions → Subscribe (credits) → Chat (GPT + external clone API) → Archive & billing.

**Out of scope for this backend:** Voice clone inference API, GPT chat inference (this project orchestrates/proxies; clone + LLM live in other services).

**Legend:** `[x]` done (partial or full) · `[ ]` not started · `[~]` exists but needs alignment

---

## Project rules (non-negotiable)

1. **No code refactor** — Do not rewrite or reorganize existing controllers, services, routes, middleware, or auth logic that already works. Only **add** new files/endpoints or **extend** existing ones with minimal, targeted changes.
2. **No flow refactor** — Do not change request/auth flows, URL paths, role definitions, or permission model. Keep `auth()`, `auth('common')`, `auth('manageUsers')`, `auth('admin')`, `auth('manageOrders')` exactly as they work today.
3. **Additive only** — New Eternous features (trees, members, voices, chat, credits, etc.) are **new modules** plugged into the current stack, not a replacement architecture.
4. **Scope in services** — For new user-owned resources, filter by `req.user.id` in the service layer. Do not introduce new auth middleware or route namespaces unless explicitly requested later.

**API surfaces:** All paths under `/api/v1`, using the existing route layout.

---

## 0. Roles & auth — use as-is (see Project rules)

> Matches **Project rules §1–2**: no auth refactor, no new `/admin` prefix, no `roles.ts` changes. Copy these patterns for all new work.

### 0.1 How auth works today (`middlewares/auth.ts`)

| Middleware call | Who passes |
|-----------------|------------|
| *(no auth)* | Public |
| `auth()` | Any logged-in user |
| `auth('common')` or `auth('user')` | Any logged-in user (same as `auth()`) |
| `auth('admin')` | `user.role === 'admin'` only |
| `auth('manageUsers')` | `user` or `admin` role (both have this permission) |
| `auth('manageOrders')` | `admin` only |

### 0.2 Roles today (`config/roles.ts`)

```ts
user:  ['getUsers', 'manageUsers']
admin: ['getUsers', 'manageUsers', 'getProducts', 'manageProducts', 'getOrders', 'manageOrders']
```

`User.role` enum: `user` | `admin` (from roles config). Seeder may also use `client` / `employee` — treat as legacy; new signups use `user`.

### 0.3 Convention for new features

| Feature type | Auth pattern | Data scoping |
|--------------|--------------|--------------|
| App user (trees, members, home, billing me, inbox) | `auth()` | Service layer: always filter by `req.user.id` |
| Dashboard / CMS (plans, static pages, send push) | `auth('manageUsers')` and/or `requireAdmin()` in controller | No ownership — admin action |
| Strict admin only | `auth('admin')` | e.g. static content POST (existing) |
| Payments / refunds | `auth('manageOrders')` | Admin |
| List users, NID workflow | `auth('common')` | Keep on `/users` routes (existing) |

**Ownership (new user resources only):** In services, scope queries by `userId: req.user.id`. No new middleware file required unless you choose to add one later.

**Controller guard (existing pattern):** Some controllers use inline `requireAdmin(req)` or `user.role !== 'admin'` — reuse this for dashboard mutations alongside route-level `auth('manageUsers')`.

### 0.4 Existing routes — keep as-is

| Route | Guard | Use |
|-------|-------|-----|
| `GET /users` | `auth('common')` | User list |
| `POST /users/nidVerifyApproval` etc. | `auth('common')` | NID workflow |
| `POST /subscriptions/price-plans` | `auth('manageUsers')` + `requireAdmin()` in controller | Plan create |
| `PATCH /subscriptions/price-plans/:id` | `auth('manageUsers')` | Plan update |
| `PATCH /subscriptions/:id/activate` | `auth('manageUsers')` + admin check in controller | Activate |
| `POST /notifications/email`, `/push*` | `auth('manageUsers')` | Dashboard send |
| `POST /static/about`, `/privacy`, `/terms` | `auth('admin')` | CMS |
| `POST /payments/:id/refund` | `auth('manageOrders')` | Refund |

### 0.5 New Eternous routes — follow same paths style

- User app features → new routers under `/api/v1/` with `auth()` + `userId` scoping in services
- Dashboard features → extend existing routers (`/subscriptions/price-plans`, `/users`, `/notifications`) with `auth('manageUsers')` or `auth('admin')`
- **Do not** create `routes/v1/admin/` or move endpoints

### 0.6 Access column in route tables below

| Access | Meaning in this project |
|--------|-------------------------|
| **Public** | No auth |
| **User** | `auth()` + own data in service |
| **Dashboard** | `auth('manageUsers')` and/or controller `requireAdmin()` |
| **Admin** | `auth('admin')` or `auth('manageOrders')` |

---

## 0.1 Cross-cutting (do first)

### DB / Migrations
- [ ] Add `migrate-mongo` migrations for all new collections and indexes
- [ ] Seed `MemberRelationType` (father, mother, son, daughter, brother, sister, grandfather, grandmother, uncle, aunt, cousin, friend, other)
- [ ] Seed default `Settings` on user signup (upsert by `userId`)
- [ ] Index audit: compound indexes for list/filter queries (trees, members, voices, credits, notifications)

### Models / `index.ts`
- [~] Export all models from `src/models/index.ts` (currently missing Settings, Session, Tree, Member, MemberRelationType, Voice, CreditTransaction)
- [ ] Align schemas with product spec (see per-domain gaps below)

### Shared infrastructure
- [ ] Standard API response wrapper on all new endpoints (`config/response.ts`)
- [ ] Joi validations module per domain under `src/validations/`
- [ ] File upload middleware reuse (`fileUpload`, HEIC converter) for tree/member images and voice files
- [ ] S3 or local storage abstraction for images + voice files (track `path`, `url`, `size`, `mimeType`)
- [ ] Mount `activity.routes.ts` in `routes/v1/index.ts`
- [ ] New user-resource services scope by `req.user.id` (Project rule §4)
- [ ] `config/notificationScheduler.ts` — register on server start (§13.1)

---

## 1. Authentication & onboarding

> Email, Google, Facebook, Apple. OTP verify on signup. Resend OTP. No chat sessions in DB.

### DB
- [ ] `User`: add `username` (unique, optional), `creditBalance` (number, default 0)
- [ ] `User`: ensure `authProvider` covers email | google | facebook | apple | firebase
- [ ] OTP fields: `oneTimeCode`, `oneTimeCodeExpiresAt` (add expiry; currently no TTL)
- [ ] Index: `User.email`, `User.username`, `User.firebaseUid`

### Models
- [~] `user.model.ts` — extend with `username`, `creditBalance`, `oneTimeCodeExpiresAt`
- [ ] `settings.model.ts` — already exists; wire to signup

### Services
- [~] `firebaseAuth.service.ts` — sync Google/Facebook/Apple via Firebase token
- [ ] `auth.service.ts` — OTP generate with expiry (e.g. 3–10 min), validate, resend (rate-limited)
- [ ] `auth.service.ts` — block login until `isEmailVerified` (email provider only)
- [ ] `email.service.ts` / SMS — send OTP; resend clears old OTP and sets new expiry
- [ ] `user.service.ts` — create default `Settings` on register

### Controllers
- [~] `auth.controller.ts` — register, login, verify-email, logout, refresh, delete-me
- [ ] `auth.controller.ts` — `POST /auth/resend-otp` (email or phone)
- [ ] `auth.controller.ts` — social providers via Firebase `idToken` (already partial)

### Routes / APIs

**User** (authenticated, own account):

| Method | Path | Access | Status | Notes |
|--------|------|--------|--------|-------|
| POST | `/auth/register` | Public | [~] | Email + Firebase; OTP flow for email |
| POST | `/auth/login` | Public | [~] | |
| POST | `/auth/verify-email` | Public | [~] | Add expiry check |
| POST | `/auth/resend-otp` | Public | [ ] | Rate-limited resend |
| POST | `/auth/refresh-tokens` | Public | [~] | |
| POST | `/auth/logout` | User | [~] | |
| POST | `/auth/forgot-password` | Public | [~] | |
| POST | `/auth/reset-password` | Public | [~] | |
| POST | `/auth/change-password` | User | [~] | Prefer `/users/me/change-password` |
| POST | `/auth/delete-me` | User | [~] | |

### Validations
- [~] `auth.validation.ts` — add `resendOtp` schema (email)
- [ ] OTP: 6-digit string/number, expiry enforcement in service

---

## 2. Home dashboard

> Favorites members, recently used members.

### DB
- [ ] `Member.isFavorite` — index `{ userId: 1, isFavorite: 1 }`
- [ ] `Member.lastTimeUsed` — index `{ userId: 1, lastTimeUsed: -1 }`

### Models
- [~] `member.model.ts` — has `isFavorite`, `lastTimeUsed`; rename `voiceId` → `defaultVoiceId` for clarity

### Services
- [ ] `member.service.ts` — `getFavoriteMembers(userId)`
- [ ] `member.service.ts` — `getRecentlyUsedMembers(userId, limit)`
- [ ] `member.service.ts` — `touchMemberUsed(memberId)` — called when user chats/listens

### Controllers
- [ ] `home.controller.ts` — aggregate favorites + recent in one response

### Routes / APIs

**User:**

| Method | Path | Access | Status | Notes |
|--------|------|--------|--------|-------|
| GET | `/home` | User | [ ] | `{ favorites, recentlyUsed }` |
| PATCH | `/members/:memberId/favorite` | User | [ ] | Toggle favorite (own member) |

---

## 3. Trees

> CRUD, background image, duplicate tree (copy members optional), soft delete.

### DB
- [ ] `Tree`: `userId`, `name`, `image`, `backgroundImage`, `description`, `isDefault`, `isDeleted`
- [ ] Index: `{ userId: 1, isDeleted: 1 }`, `{ userId: 1, isDefault: 1 }`

### Models
- [~] `tree.model.ts` — exists; confirm `backgroundImage` field

### Services
- [ ] `tree.service.ts` — create, list, getById, update, softDelete
- [ ] `tree.service.ts` — `duplicateTree(treeId, { copyMembers: boolean })`
- [ ] `tree.service.ts` — set default tree (only one `isDefault` per user)
- [ ] Storage: upload tree photo + background image; return URL object

### Controllers
- [ ] `tree.controller.ts`

### Routes / APIs

**User** (all routes scoped to `req.user.id`):

| Method | Path | Access | Status | Body / notes |
|--------|------|--------|--------|--------------|
| GET | `/trees` | User | [ ] | Paginated list (own trees) |
| POST | `/trees` | User | [ ] | `name`, optional `image` (multipart) |
| GET | `/trees/:treeId` | User | [ ] | Own tree + member count |
| PATCH | `/trees/:treeId` | User | [ ] | `name`, `image`, `backgroundImage` |
| DELETE | `/trees/:treeId` | User | [ ] | Soft delete |
| POST | `/trees/:treeId/duplicate` | User | [ ] | `{ copyMembers?: boolean }` |
| PATCH | `/trees/:treeId/default` | User | [ ] | Set as default tree |

### Validations
- [ ] `tree.validation.ts`

---

## 4. Members

> Inside a tree. Photo, name, DOB, bio, custom greeting, relation, nickname, “not a related member” flag, voice upload on create.

### DB
- [ ] `Member`: add `dateOfBirth`, `privateNotes`, `isRelatedMember` (boolean, default true)
- [ ] `Member.relatedToMemberId` — optional graph link
- [ ] `Member.memberRelationTypeId` — ref MemberRelationType
- [ ] `Member.defaultVoiceId` — ref Voice
- [ ] Index: `{ treeId: 1 }`, `{ userId: 1, treeId: 1 }`

### Models
- [~] `member.model.ts` — add missing fields; align naming
- [~] `memberRelationType.model.ts` — seed data

### Services
- [ ] `member.service.ts` — CRUD scoped to `userId` + `treeId`
- [ ] `member.service.ts` — create with optional photo + initial voice upload (creates Voice v1)
- [ ] `member.service.ts` — `getMemberDetails` returns: name, relationType, biography, privateNotes, voices summary, default voice
- [ ] `memberRelationType.service.ts` — list active types

### Controllers
- [ ] `member.controller.ts`

### Routes / APIs

**User** (ownership via `tree.userId` / `member.userId`):

| Method | Path | Access | Status | Notes |
|--------|------|--------|--------|-------|
| GET | `/trees/:treeId/members` | User | [ ] | List members in own tree |
| POST | `/trees/:treeId/members` | User | [ ] | Multipart: photo?, voice? |
| GET | `/members/:memberId` | User | [ ] | Full details (own) |
| PATCH | `/members/:memberId` | User | [ ] | Update + photo |
| DELETE | `/members/:memberId` | User | [ ] | Delete + file cleanup |
| GET | `/member-relation-types` | Public | [ ] | Father, son, etc. |

**Dashboard:**

| Method | Path | Access | Status | Notes |
|--------|------|--------|--------|-------|
| POST | `/member-relation-types` | Dashboard | [ ] | `auth('manageUsers')` — new route on existing router pattern |
| PATCH | `/member-relation-types/:id` | Dashboard | [ ] | `auth('manageUsers')` |

### Validations
- [ ] `member.validation.ts`

---

## 5. Voice versions

> Multiple versions per member; select default for cloning. Upload new version. External clone API is another project.

### DB
- [ ] `Voice`: unique `{ memberId, versionNumber }`
- [ ] `Voice.status`: processing | ready | failed | archived
- [ ] `Voice`: `name` (e.g. "Version 1.0"), `uploadUrl`, `voiceUrl`, `size`, `duration`, `isDefault`

### Models
- [~] `voice.model.ts` — exists with version logic

### Services
- [ ] `voice.service.ts` — `uploadVoice(memberId, file)` → auto-increment `versionNumber`
- [ ] `voice.service.ts` — `listVoices(memberId)`, `setDefaultVoice(memberId, voiceId)`
- [ ] `voice.service.ts` — voice selection for chat: voiceId → versionNumber → default → latest ready
- [ ] `voice.service.ts` — update `Member.defaultVoiceId` when default changes
- [ ] Storage: track file size for user storage quota
- [ ] Webhook or poll endpoint for external clone service to set `status: ready` + `voiceUrl` (optional integration stub)

### Controllers
- [ ] `voice.controller.ts`

### Routes / APIs
| Method | Path | Status | Notes |
|--------|------|--------|-------|
| GET | `/members/:memberId/voices` | [ ] | All versions |
| POST | `/members/:memberId/voices` | [ ] | Upload new version (multipart) |
| PATCH | `/members/:memberId/voices/:voiceId/default` | [ ] | Set default |
| GET | `/members/:memberId/voices/:voiceId` | [ ] | Single version metadata |
| DELETE | `/members/:memberId/voices/:voiceId` | [ ] | Archive/delete |

### Validations
- [ ] `voice.validation.ts`

---

## 6. Chat orchestration (proxy only)

> Chat **not stored** in DB. GPT in external/this orchestration; output goes to voice clone API; return audio URL/stream.

### DB
- [ ] No chat/session/message collections (confirmed out of scope)
- [ ] Update `Member.lastTimeUsed` on each chat request (no persistence)

### Services
- [ ] `chat.service.ts` — accept `{ memberId, message, voiceId?, versionNumber? }`
- [ ] `chat.service.ts` — resolve voice via `voice.service`
- [ ] `chat.service.ts` — call GPT API (OpenAI or external LLM service)
- [ ] `chat.service.ts` — send GPT text to external voice clone API with selected voice
- [ ] `chat.service.ts` — **deduct credits** atomically (see §12)
- [ ] `chat.service.ts` — return `{ text, audioUrl, creditsUsed, creditsRemaining }`
- [ ] Config: `OPENAI_API_KEY`, `VOICE_CLONE_API_URL`, timeouts, retries

### Controllers
- [ ] `chat.controller.ts`

### Routes / APIs
| Method | Path | Status | Notes |
|--------|------|--------|-------|
| POST | `/chat` | [ ] | Ephemeral; no DB storage |
| POST | `/chat/stream` | [ ] | Optional SSE/streaming |

### Validations
- [ ] `chat.validation.ts`

---

## 7. Subscription plans (Preservation Plans)

> Monthly/Yearly plans from dashboard (Stripe). Name, price, description, feature bullet points.

### DB
- [ ] `SubscriptionPlan`: add `credits` (per billing period), `planType` (monthly | yearly | preservation)
- [ ] `SubscriptionPlan`: `features` string[] (bullet points)
- [ ] Stripe `priceId` sync from dashboard

### Models
- [~] `subscriptionPlan.model.ts` — add `credits`, `planType`

### Services
- [~] `subscriptionPlan.service.ts` — CRUD exists
- [ ] Dashboard admin: create/update plan → create Stripe Product + Price → save `priceId`
- [ ] Public list: active plans with formatted price

### Controllers
- [~] `subscriptionPlan.controller.ts`

### Routes / APIs

**Public / User:**

| Method | Path | Access | Status | Notes |
|--------|------|--------|--------|-------|
| GET | `/subscriptions/price-plans` | Public | [~] | Active preservation plans for app |
| POST | `/subscriptions/checkout-session` | User | [~] | Stripe checkout |
| GET | `/subscriptions/me` | User | [~] | Current plan + history |
| PATCH | `/subscriptions/:id/cancel` | User | [~] | Cancel own plan |
| POST | `/subscriptions/upgrade` | User | [ ] | Upgrade own plan |

**Dashboard** (existing paths + guards):

| Method | Path | Access | Status | Notes |
|--------|------|--------|--------|-------|
| POST | `/subscriptions/price-plans` | Dashboard | [~] | `auth('manageUsers')` + `requireAdmin()` in controller |
| PATCH | `/subscriptions/price-plans/:planId` | Dashboard | [~] | `auth('manageUsers')` |
| PATCH | `/subscriptions/:id/activate` | Dashboard | [~] | `auth('manageUsers')` + admin role in controller |

### Validations
- [~] `subscriptionPlan.validation.ts` — add credits, planType

---

## 8. Billing & payment methods

> Current plan display, upgrade, cancel, payment methods (last4, exp, default), billing history.

### DB
- [ ] `PaymentMethod` collection (new): `userId`, `provider`, `providerPaymentMethodId`, `brand`, `last4`, `expMonth`, `expYear`, `isDefault`, `metadata`
- [ ] `Payment`: align with Stripe — `userId`, `subscriptionId`, `amount`, `currency`, `status`, `invoiceId`, `paidAt`, `providerPaymentId`
- [ ] `Subscription`: add `plan` ref → SubscriptionPlan, `externalPriceId`
- [ ] Index: `Payment.userId`, `Payment.providerPaymentId` (unique, idempotent webhooks)

### Models
- [ ] `paymentMethod.model.ts` — new
- [~] `payment.model.ts` — extend fields per readme
- [~] `subscription.model.ts` — add `plan` ObjectId ref

### Services
- [ ] `billing.service.ts` — get current plan summary (`name`, `$80.00 per month`)
- [ ] `billing.service.ts` — list payment methods from Stripe Customer
- [ ] `billing.service.ts` — add payment method (Stripe SetupIntent)
- [ ] `billing.service.ts` — set default payment method
- [ ] `billing.service.ts` — billing history (invoices/payments paginated)
- [~] `stripe.service.ts` — extend webhooks: `invoice.paid` → Payment + credits
- [ ] Stripe Customer: create/link on first subscription

### Controllers
- [ ] `billing.controller.ts`
- [~] `payment.controller.ts` — payment intents exist

### Routes / APIs

**User** (own billing only):

| Method | Path | Access | Status | Notes |
|--------|------|--------|--------|-------|
| GET | `/billing/overview` | User | [ ] | Plan + payment method summary |
| GET | `/billing/payment-methods` | User | [ ] | List own cards |
| POST | `/billing/payment-methods` | User | [ ] | Add (SetupIntent client secret) |
| PATCH | `/billing/payment-methods/:id/default` | User | [ ] | Set default |
| DELETE | `/billing/payment-methods/:id` | User | [ ] | Remove |
| GET | `/billing/history` | User | [ ] | Paginated invoices/payments |
| POST | `/payments/create-intent` | User | [~] | Own payments |
| GET | `/payments/:paymentIntentId` | User | [~] | Own payment intent |

**Dashboard:**

| Method | Path | Access | Status | Notes |
|--------|------|--------|--------|-------|
| POST | `/payments/:paymentIntentId/refund` | Admin | [~] | `auth('manageOrders')` — keep existing path |

---

## 9. User profile & account settings

### DB
- [ ] `User`: `fullName`, `username`, `email` (read-only from provider for social)

### Services
- [ ] `user.service.ts` — get/update personal info
- [ ] `user.service.ts` — username uniqueness check

### Controllers
- [~] `user.controller.ts` — extend

### Routes / APIs

**User:**

| Method | Path | Access | Status | Notes |
|--------|------|--------|--------|-------|
| GET | `/users/me` | User | [ ] | Profile + subscription shortcut + creditBalance |
| PATCH | `/users/me` | User | [ ] | name, username |
| POST | `/users/me/change-password` | User | [ ] | current, new, confirmNew |
| POST | `/users/verifyNid` | User | [ ] | Submit own NID (move from `/users/verifyNid`) |

**Dashboard** (existing `/users` routes — keep paths):

| Method | Path | Access | Status | Notes |
|--------|------|--------|--------|-------|
| GET | `/users` | Dashboard | [~] | `auth('common')` — list users |
| GET | `/users/:userId` | Dashboard | [~] | `auth('common')` |
| GET | `/users/nidVerifySubmitList` | Dashboard | [~] | `auth('common')` |
| POST | `/users/nidVerifyApproval` | Dashboard | [~] | `auth('common')` |
| POST | `/users/nidVerifyReject` | Dashboard | [~] | `auth('common')` |

### Validations
- [ ] `user.validation.ts` — change password confirm match

---

## 10. Notification settings

### DB
- [~] `Settings` — already has toggles; map to product copy

### Models
- [~] `settings.model.ts`

| Setting field | Product label |
|---------------|---------------|
| `notificationsEnabled` | Receive notifications about new features |
| `birthdayNotificationsEnabled` | Get notified when you receive messages |
| `paymentNotificationsEnabled` | Billing and invoice updates |

### Services
- [ ] `settings.service.ts` — getOrCreate, update toggles

### Routes / APIs
| Method | Path | Status |
|--------|------|--------|
| GET | `/users/me/settings` | [ ] |
| PATCH | `/users/me/settings` | [ ] |
| PATCH | `/users/me/settings/notifications` | [ ] |

---

## 11. Security — 2FA & logged-in devices

### DB
- [~] `Settings.twoFactorEnabled`, `Settings.verified`
- [~] `Session` — deviceName, deviceType, userAgent, ipAddress, isActive, revokedAt
- [ ] `Token.sessionId` → change to ObjectId ref Session (currently string UUID)

### Services
- [ ] `session.service.ts` — create session on login/register
- [ ] `session.service.ts` — list active devices for user
- [ ] `session.service.ts` — revoke one session / revoke all
- [ ] `twoFactor.service.ts` — enable/disable 2FA (TOTP or email OTP stub)
- [ ] `token.service.ts` — link refresh token to Session document

### Routes / APIs
| Method | Path | Status | Notes |
|--------|------|--------|-------|
| GET | `/users/me/devices` | [ ] | Logged-in devices list |
| DELETE | `/users/me/devices/:sessionId` | [ ] | Logout one device |
| DELETE | `/users/me/devices` | [ ] | Logout all |
| POST | `/users/me/security/2fa/enable` | [ ] | |
| POST | `/users/me/security/2fa/disable` | [ ] | |
| POST | `/users/me/security/2fa/verify` | [ ] | Confirm setup |

---

## 12. Credits ledger

> Credits from subscription; deduct on voice/chat usage; admin adjust; refund; idempotent Stripe grants.

### DB
- [~] `CreditTransaction` — full ledger model exists
- [ ] `User.creditBalance` — denormalized balance

### Models
- [ ] `user.model.ts` — add `creditBalance`
- [~] `creditTransaction.model.ts`

### Services
- [ ] `credit.service.ts` — `grantCredits(userId, amount, type, idempotencyKey, meta)`
- [ ] `credit.service.ts` — `deductCredits(userId, amount, type, meta)` — MongoDB transaction
- [ ] `credit.service.ts` — `getBalance`, `getHistory` (paginated)
- [ ] `credit.service.ts` — admin `adjustCredits`
- [ ] Hook: Stripe `invoice.payment_succeeded` → grant plan credits once (idempotent by invoiceId)
- [ ] Hook: chat/voice generation → deduct credits
- [ ] Hook: refund → negative grant or reversal transaction

### Routes / APIs

**User** (read-only balance):

| Method | Path | Access | Status | Notes |
|--------|------|--------|--------|-------|
| GET | `/users/me/credits` | User | [ ] | Balance + recent transactions |
| GET | `/users/me/credits/history` | User | [ ] | Paginated ledger |

**Dashboard:**

| Method | Path | Access | Status | Notes |
|--------|------|--------|--------|-------|
| POST | `/users/:userId/credits` | Dashboard | [ ] | `auth('manageUsers')` — manual credit adjust |

---

## 13. In-app notifications

> Tree share invites, backup ready, anniversary, birthday. Accept/decline for shares.

### DB
- [ ] `Notification`: extend `type` enum: `tree_share`, `backup`, `anniversary`, `birthday`, `billing`, `subscription`, `system`
- [ ] `Notification`: add `title`, `actionStatus` (pending | accepted | declined), `payload` (metadata)
- [ ] `TreeShare` collection (new): `treeId`, `ownerId`, `recipientId`, `status`, `message`

### Models
- [~] `notification.model.ts` — extend types
- [ ] `treeShare.model.ts` — new

### Services
- [ ] `notification.service.ts` — create, list (paginated), mark read, accept/decline share
- [ ] `treeShare.service.ts` — share tree with user email → notification
- [ ] Event: backup completed → notification (see §13.1 backup cron)
- [ ] **Cron jobs** — see **§13.1** (birthdays, payments, anniversaries, subscription reminders)

### Routes / APIs

**User:**

| Method | Path | Access | Status | Notes |
|--------|------|--------|--------|-------|
| GET | `/notifications` | User | [ ] | Paginated inbox (own) |
| PATCH | `/notifications/:id/read` | User | [ ] | Mark read |
| POST | `/notifications/:id/accept` | User | [ ] | Accept tree share |
| POST | `/notifications/:id/decline` | User | [ ] | Decline tree share |
| POST | `/trees/:treeId/share` | User | [ ] | Share own tree with email |
| POST | `/notifications/topic/subscribe` | User | [~] | FCM topic |
| POST | `/notifications/topic/unsubscribe` | User | [~] | FCM topic |

**Dashboard** (existing `/notifications` send routes — keep paths):

| Method | Path | Access | Status | Notes |
|--------|------|--------|--------|-------|
| POST | `/notifications/email` | Dashboard | [~] | `auth('manageUsers')` |
| POST | `/notifications/push` | Dashboard | [~] | `auth('manageUsers')` |
| POST | `/notifications/push/multicast` | Dashboard | [~] | `auth('manageUsers')` |
| POST | `/notifications/push/topic` | Dashboard | [~] | `auth('manageUsers')` |

**Notification examples to support:**
- Maroun Smith shared “My Family” tree with you
- Your monthly backup is ready
- “My Family” tree was successfully backed up
- It’s been 1 year since “Grandma” was added
- Today is Ralph’s birthday 🎉

---

## 13.1 Notification cron jobs (`node-cron`)

> Scheduled in-app notifications (+ optional FCM push / email). Extends existing `src/config/scheduler.ts` pattern (same as log-report crons). **Additive only** — new schedulers registered in `src/index.ts` on server start.

### Infrastructure (existing)

- [x] `node-cron` already installed
- [x] `config/scheduler.ts` — log report + log cleanup crons (reference pattern)
- [ ] `config/notificationScheduler.ts` — **new file** for all notification crons
- [ ] Register `startNotificationSchedulers()` in `src/index.ts` alongside log schedulers
- [ ] Graceful shutdown: `stopNotificationSchedulers()` in exit handler

### DB — deduplication (avoid sending twice)

- [ ] `NotificationJobLog` collection (new): `userId`, `jobType`, `referenceKey`, `sentAt`, `channel` (in_app | push | email)
- [ ] Unique index: `{ jobType: 1, referenceKey: 1 }` — e.g. `birthday:memberId:2026-06-19`, `payment_failed:invoiceId`
- [ ] Before send: check log; after send: insert log

### Models
- [ ] `notificationJobLog.model.ts` — new

### Config / env

```env
NOTIFICATION_CRONS_ENABLED=true
NOTIFICATION_CRON_TIMEZONE=UTC

# Cron patterns (node-cron)
BIRTHDAY_CRON=0 8 * * *              # daily 08:00 — member birthdays
ANNIVERSARY_CRON=0 9 * * *           # daily 09:00 — member added anniversary
SUBSCRIPTION_REMINDER_CRON=0 10 * * * # daily 10:00 — renewal / trial ending
PAYMENT_RETRY_CRON=0 */6 * * *       # every 6h — failed payment reminders
BACKUP_READY_CRON=0 7 1 * *          # monthly 1st 07:00 — backup complete notices
CREDITS_LOW_CRON=0 11 * * *          # daily 11:00 — low credit balance warning
```

- [ ] Add keys to `config/config.ts` with Joi validation (defaults above)

### Job definitions

| Job | Schedule | Respects settings | Logic |
|-----|----------|-------------------|-------|
| **Birthday** | Daily 08:00 | `Settings.birthdayNotificationsEnabled` + `notificationsEnabled` | Find `Member` where `dateOfBirth` month/day = today; notify owning `userId` |
| **Member anniversary** | Daily 09:00 | `notificationsEnabled` | Find members where `createdAt` is N years ago today; “It’s been 1 year since Grandma was added” |
| **Subscription renewal reminder** | Daily 10:00 | `paymentNotificationsEnabled` | `Subscription.endsAt` in 3 days; “Your plan renews soon” |
| **Trial ending** | Daily 10:00 | `paymentNotificationsEnabled` | `Subscription.trialEndsAt` in 2 days |
| **Payment failed** | Every 6h | `paymentNotificationsEnabled` | `Subscription.status === 'past_due'` or failed `Payment`; “Payment failed — update method” |
| **Invoice / payment success** | On Stripe webhook* | `paymentNotificationsEnabled` | `invoice.payment_succeeded` → in-app “Payment received” (webhook primary; cron reconciles missed) |
| **Credits low** | Daily 11:00 | `notificationsEnabled` | `User.creditBalance` below threshold (e.g. 10); “Credits running low” |
| **Monthly backup ready** | 1st of month 07:00 | `notificationsEnabled` | After backup job (§14); “Your monthly backup is ready” |

\* Payment success/failure also triggered by Stripe webhooks in real time; cron jobs are **backup/reconciliation** for missed events.

### Services (`src/services/notifications/`)

- [ ] `birthdayNotification.job.ts` — scan members, build messages, dispatch
- [ ] `anniversaryNotification.job.ts` — member added anniversary
- [ ] `paymentNotification.job.ts` — renewal, trial end, failed payment, credits low
- [ ] `backupNotification.job.ts` — monthly backup ready (calls archive backup first or reads last backup run)
- [ ] `notificationDispatch.service.ts` — shared: check settings → create `Notification` doc → optional FCM via `fcm.service` → optional email queue → write `NotificationJobLog`

### Notification payloads (in-app)

| Job | `type` | Example `title` / `message` |
|-----|--------|----------------------------|
| Birthday | `birthday` | Today is Ralph’s birthday 🎉 |
| Anniversary | `anniversary` | It’s been 1 year since “Grandma” was added |
| Renewal | `subscription` | Your Pro plan renews in 3 days |
| Trial end | `subscription` | Your trial ends in 2 days |
| Payment failed | `billing` | Payment failed — please update your payment method |
| Payment success | `billing` | Payment received — thank you |
| Credits low | `billing` | You have 5 credits remaining |
| Backup ready | `backup` | Your monthly backup is ready |

### Scheduler file structure

```
src/config/notificationScheduler.ts
  startNotificationSchedulers()
  stopNotificationSchedulers()
  getNotificationSchedulerStatus()

src/services/notifications/
  notificationDispatch.service.ts
  jobs/
    birthdayNotification.job.ts
    anniversaryNotification.job.ts
    paymentNotification.job.ts
    backupNotification.job.ts
```

### Tasks checklist

- [ ] `Member.dateOfBirth` field required for birthday cron (§4)
- [ ] `notificationDispatch.service.ts` — respect per-user `Settings` toggles
- [ ] Birthday job — query by month/day (timezone-aware via `NOTIFICATION_CRON_TIMEZONE`)
- [ ] Payment job — read `Subscription` + `Payment` collections; align with Stripe webhook handlers (§8)
- [ ] Idempotency via `NotificationJobLog` for every send
- [ ] Manual trigger for testing: `scripts/test-notification-crons.ts` (like existing `test-scheduler.ts`)
- [ ] Logging via `config/logger.ts` on each job run (success count, skip count, errors)

### Routes (optional — dashboard testing only)

| Method | Path | Access | Notes |
|--------|------|--------|-------|
| POST | `/notifications/crons/run` | Dashboard | `auth('manageUsers')` — run job by name `{ job: 'birthday' }` (dev/staging) |

---

## 14. Archive — recordings, storage, search

> User archive: storage usage, recent sessions (listen/chat activity metadata only), searchable recordings list.

### DB
- [ ] `Recording` collection (new): `userId`, `memberId`, `voiceId`, `memberName` (snapshot), `versionName`, `lastBackupAt`, `duration`, `size`, `fileUrl`, `backupId`, `metadata`
- [ ] `UserStorage` or compute from files: total bytes voices + images

### Models
- [ ] `recording.model.ts` — new

### Services
- [ ] `archive.service.ts` — `getStorageUsage(userId)` — sum voice + image sizes
- [ ] `archive.service.ts` — `getRecentSessions(userId)` — from Activity or Recording (last N)
- [ ] `archive.service.ts` — `searchRecordings(userId, query, filters)`
- [ ] `archive.service.ts` — `downloadRecording(recordingId)` — signed URL
- [ ] Backup job: monthly tree/member/voice backup → update `lastBackupAt`

### Routes / APIs
| Method | Path | Status | Response fields |
|--------|------|--------|-----------------|
| GET | `/archive/storage` | [ ] | Used / quota bytes |
| GET | `/archive/recent-sessions` | [ ] | Recent listen/chat metadata |
| GET | `/archive/recordings` | [ ] | Search + filter |
| GET | `/archive/recordings/:id` | [ ] | Detail |
| GET | `/archive/recordings/:id/download` | [ ] | Download URL |

**Recording list item shape:**
```json
{
  "memberName": "Grandma",
  "versionName": "Version 1.0",
  "lastBackup": "2026-03-01",
  "duration": 30,
  "size": 1024000
}
```

---

## 15. File / storage layer

### DB
- [ ] Track `size` on all uploaded assets (User, Tree, Member images; Voice files)

### Services
- [ ] `storage.service.ts` — upload, delete, getSignedUrl, computeUserStorage(userId)
- [ ] Enforce per-plan storage limits (from SubscriptionPlan metadata)

---

## 16. Dashboard / admin features (extend existing routes)

> **Project rules §1–2:** extend existing routers only — no `/admin` prefix, no route moves.

### Services
- [ ] Extend `user.service.ts` — credit adjust for dashboard
- [ ] Extend `subscriptionPlan.service.ts` — Stripe Product/Price sync on create
- [ ] Extend `credit.service.ts` — admin adjust with ledger
- [ ] `memberRelationType.service.ts` — dashboard CRUD
- [ ] Optional: `adminAnalytics.service.ts` — user count, revenue (future)

### Controllers
- [ ] Extend `subscriptionPlan.controller.ts` — keep `requireAdmin()` pattern
- [ ] Extend `user.controller.ts` — credit adjust endpoint
- [ ] `memberRelationType.controller.ts` — new, dashboard guards

### Routes / APIs (all existing path style)

| Method | Path | Access | Status | Notes |
|--------|------|--------|--------|-------|
| GET | `/users` | Dashboard | [~] | List users |
| GET | `/users/:userId` | Dashboard | [~] | User detail |
| POST | `/users/:userId/credits` | Dashboard | [ ] | Credit adjust |
| GET | `/users/nidVerifySubmitList` | Dashboard | [~] | NID queue |
| POST | `/users/nidVerifyApproval` | Dashboard | [~] | Approve |
| POST | `/users/nidVerifyReject` | Dashboard | [~] | Reject |
| POST | `/subscriptions/price-plans` | Dashboard | [~] | Create plan + Stripe |
| PATCH | `/subscriptions/price-plans/:planId` | Dashboard | [~] | Update plan |
| PATCH | `/subscriptions/:id/activate` | Dashboard | [~] | Activate subscription |
| POST | `/notifications/email` | Dashboard | [~] | Send email |
| POST | `/notifications/push` | Dashboard | [~] | Send push |
| POST | `/static/about` | Admin | [~] | `auth('admin')` |
| POST | `/static/privacy` | Admin | [~] | `auth('admin')` |
| POST | `/static/terms` | Admin | [~] | `auth('admin')` |
| POST | `/member-relation-types` | Dashboard | [ ] | Create relation type |
| PATCH | `/member-relation-types/:id` | Dashboard | [ ] | Update relation type |
| POST | `/payments/:paymentIntentId/refund` | Admin | [~] | `auth('manageOrders')` |

---

## 17. Suggested implementation order

```
Phase 1 — Foundation
  1.1  Model alignment + index.ts exports + migrations
  1.2  Settings auto-create on signup
  1.3  OTP expiry + resend
  1.4  Session model wired to login (devices list)

Phase 2 — Core product
  2.1  Trees CRUD + duplicate + images
  2.2  MemberRelationType seed + Members CRUD
  2.3  Voice versions upload + default selection
  2.4  Home endpoint (favorites + recent)

Phase 3 — Monetization
  3.1  Plan credits field + Stripe webhook idempotency
  3.2  User.creditBalance + CreditTransaction service
  3.3  Billing overview, payment methods, history
  3.4  Upgrade / cancel subscription

Phase 4 — Engagement & notification crons
  4.1  Notification inbox + tree share accept/decline
  4.2  Notification settings API
  4.3  notificationScheduler.ts + NotificationJobLog dedup
  4.4  Birthday + anniversary cron jobs (§13.1)
  4.5  Payment crons — renewal, trial end, failed payment, credits low (§13.1)
  4.6  Monthly backup-ready cron (§13.1 + §14)

Phase 5 — Chat & archive
  5.1  Chat orchestration (GPT + external clone proxy)
  5.2  Credit deduct on chat
  5.3  Archive recordings + storage usage + search

Phase 6 — Security & polish
  6.1  2FA enable/disable
  6.2  Logout device / all devices
  6.3  Dashboard analytics (optional)
```

> **Project rules:** additive endpoints only; existing auth guards unchanged.

---

## 18. New files to create (checklist)

### Models
- [ ] `paymentMethod.model.ts`
- [ ] `recording.model.ts`
- [ ] `treeShare.model.ts`
- [ ] `notificationJobLog.model.ts` — cron dedup (§13.1)
- [ ] Update: `user`, `member`, `notification`, `payment`, `subscription`, `subscriptionPlan`

### Services
- [ ] `tree.service.ts`
- [ ] `member.service.ts`
- [ ] `memberRelationType.service.ts`
- [ ] `voice.service.ts`
- [ ] `chat.service.ts`
- [ ] `settings.service.ts`
- [ ] `session.service.ts`
- [ ] `twoFactor.service.ts`
- [ ] `credit.service.ts`
- [ ] `billing.service.ts`
- [ ] `notification.service.ts` (inbox CRUD)
- [ ] `notificationDispatch.service.ts` — cron + webhook dispatch (§13.1)
- [ ] `services/notifications/jobs/birthdayNotification.job.ts`
- [ ] `services/notifications/jobs/anniversaryNotification.job.ts`
- [ ] `services/notifications/jobs/paymentNotification.job.ts`
- [ ] `services/notifications/jobs/backupNotification.job.ts`
- [ ] `treeShare.service.ts`
- [ ] `archive.service.ts`
- [ ] `storage.service.ts`
- [ ] `home.service.ts`

### Controllers
- [ ] `tree.controller.ts` — User (`auth()`)
- [ ] `member.controller.ts` — User
- [ ] `voice.controller.ts` — User
- [ ] `chat.controller.ts` — User
- [ ] `settings.controller.ts` — User
- [ ] `session.controller.ts` — User
- [ ] `billing.controller.ts` — User
- [ ] `notificationInbox.controller.ts` — User (inbox)
- [ ] `archive.controller.ts` — User
- [ ] `home.controller.ts` — User
- [ ] Extend existing controllers for dashboard (§16) — no `controllers/admin/` folder

### Routes
- [ ] `tree.routes.ts` — User, `auth()`
- [ ] `member.routes.ts` — User
- [ ] `voice.routes.ts` — User
- [ ] `chat.routes.ts` — User
- [ ] `settings.routes.ts` — User
- [ ] `billing.routes.ts` — User
- [ ] `archive.routes.ts` — User
- [ ] `home.routes.ts` — User
- [ ] `member-relation-type.routes.ts` — Public GET + Dashboard POST/PATCH
- [ ] Register new routes in `routes/v1/index.ts`
- [ ] **Do not** add `routes/v1/admin/`

### Config / schedulers
- [ ] `config/notificationScheduler.ts` (§13.1)
- [ ] `scripts/test-notification-crons.ts` — manual job runner for dev

### Validations
- [ ] `tree.validation.ts`
- [ ] `member.validation.ts`
- [ ] `voice.validation.ts`
- [ ] `chat.validation.ts`
- [ ] `settings.validation.ts`
- [ ] `billing.validation.ts`
- [ ] `archive.validation.ts`

---

## 19. Environment variables to add

```env
# Chat / voice orchestration
OPENAI_API_KEY=
VOICE_CLONE_API_URL=
VOICE_CLONE_API_KEY=

# OTP
OTP_EXPIRATION_MINUTES=10
OTP_RESEND_COOLDOWN_SECONDS=60

# Storage
S3_BUCKET_NAME=          # already in config
STORAGE_QUOTA_BYTES_DEFAULT=

# Feature flags
CHAT_ENABLED=true

# Notification crons (§13.1)
NOTIFICATION_CRONS_ENABLED=true
NOTIFICATION_CRON_TIMEZONE=UTC
BIRTHDAY_CRON=0 8 * * *
ANNIVERSARY_CRON=0 9 * * *
SUBSCRIPTION_REMINDER_CRON=0 10 * * *
PAYMENT_RETRY_CRON=0 */6 * * *
BACKUP_READY_CRON=0 7 1 * *
CREDITS_LOW_CRON=0 11 * * *
CREDITS_LOW_THRESHOLD=10
```

---

## 20. What already exists (do not rebuild)

| Area | Status |
|------|--------|
| Firebase auth sync | [~] Partial |
| JWT refresh tokens | [~] Partial (Session not wired) |
| Stripe checkout + webhooks | [~] Subscription sync only |
| SubscriptionPlan CRUD | [~] On `/subscriptions/price-plans` + `manageUsers` |
| Auth / roles / routes | [x] **Frozen** — no code or flow refactor (Project rules) |
| Ownership scoping | [ ] Add in new services (`userId` filter) |
| FCM + email queues | [x] |
| Log report / cleanup crons | [x] `config/scheduler.ts` |
| Notification crons (birthday, payment, etc.) | [ ] §13.1 — **not started** |
| Activity logging | [~] Not routed |
| Tree/Member/Voice models | [~] Schema only |
| CreditTransaction model | [~] Schema only |
| Settings/Session models | [~] Schema only |

---

*Last updated: 2026-06-19 — §0: keep current roles/auth, no route refactor.*
