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
5. **Auth target (§0.3)** — Firebase for identity (Google, Apple, Facebook, email, OTP/verification). Mongo for encrypted password copy, `Token`, `Session`, and all API JWTs. Extend existing `/auth/*` paths; do not add new auth namespaces.

**API surfaces:** All paths under `/api/v1`, using the existing route layout.

**At the end of each step:** copy the **Commit** line for `git commit`, run the **Test** block, then run the **Flow test** script (§22) — chained curls that reuse tokens and ids from responses.

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
- [ ] Seed `MemberRelationType` — run `npm run seed:relation-types` (script ready)
- [x] Seed default `Settings` on user signup — `settings.service.ts` wired in register flows
- [ ] Index audit: compound indexes for list/filter queries (trees, members, voices, credits, notifications)

### Models / `index.ts`
- [x] Export all models from `src/models/index.ts`
- [x] Align core schemas — User, Member, SubscriptionPlan, Subscription, Notification (Phase 1.1)

### Shared infrastructure
- [ ] Standard API response wrapper on all new endpoints (`config/response.ts`)
- [ ] Joi validations module per domain under `src/validations/`
- [ ] File upload middleware reuse (`fileUpload`, HEIC converter) for tree/member images and voice files
- [ ] S3 or local storage abstraction for images + voice files (track `path`, `url`, `size`, `mimeType`)
- [x] Mount `activity.routes.ts` in `routes/v1/index.ts` → `/api/v1/activities`
- [x] `activity.service.ts` — centralized activity + logger (§0.2)
- [ ] New user-resource services scope by `req.user.id` (Project rule §4)
- [ ] `config/notificationScheduler.ts` — register on server start (§13.1)

#### Step 0.1 wrap-up (when cross-cutting DB seeds done)

**Commit:** `chore: add migrations and seed member relation types`

**Test:**
```bash
npm run migrate:up
npm run seed:relation-types
# Mongo: db.memberrelationtypes.find() → 13 docs (father, mother, …)
```

**Flow test:** `npm run test:flow -- 0.1`  
Script: `scripts/test-flows/step-0.1.sh` — chains API calls; passes `TOKEN`, ids from prior responses (needs `jq`, server running).

---

## 0.2 Activity & audit logging (cross-cutting)

> Every meaningful action writes to **Mongo `Activity`** + **`logger.info`**. Use `activity.service.ts` — do not duplicate `Activity.create` in controllers.

### Service (`src/services/activity.service.ts`)

| Helper | Use |
|--------|-----|
| `recordActivityFromRequest(req, userId, type, description, metadata?)` | User auth + profile actions |
| `recordSubscriptionActivity(userId, type, description, metadata?, req?)` | Checkout, create, cancel, activate, Stripe webhook |
| `recordAdminAction(req, action, description, metadata?)` | All dashboard/admin mutations — `type: admin_action`, `metadata.action` |
| `recordUserProductAction(req, type, description, metadata?)` | Eternous app: tree, member, voice, chat, credit, settings, notification |

### Activity types

| Category | `type` values | When |
|----------|---------------|------|
| Auth | `register`, `login`, `logout`, `email_verified`, `password_change`, `account_deleted` | Auth controller ✅ |
| Profile | `update_profile`, `other` (nid_submit) | User controller ✅ |
| Subscription | `subscription_checkout`, `subscription_created`, `subscription_canceled`, `subscription_activated`, `subscription_updated` | Subscription controller + Stripe webhook ✅ |
| Payment | `payment` | Payment intent (user) ✅ |
| Admin | `admin_action` + `metadata.action` | See table below ✅ |
| Eternous app | `tree`, `member`, `voice`, `chat`, `credit`, `settings`, `notification` | **Add in each new controller** (Phase 2+) |

### Admin `metadata.action` values (wired ✅)

| action | Endpoint |
|--------|----------|
| `nid_approve` / `nid_reject` | `POST /users/nidVerifyApproval`, `nidVerifyReject` |
| `plan_create` / `plan_update` | `POST/PATCH /subscriptions/price-plans` |
| `subscription_activate` | `PATCH /subscriptions/:id/activate` |
| `subscription_cancel` | Admin cancel via `PATCH /subscriptions/:id/cancel` |
| `payment_refund` | `POST /payments/:id/refund` |
| `notification_email` / `notification_push*` | `POST /notifications/email`, `/push*` |
| `cms_about_create` / `cms_privacy_create` / `cms_terms_create` | `POST /static/about`, `/privacy`, `/terms` |

### Eternous user actions — log on every mutation (Phase 2+)

| Feature | `type` | `metadata.action` examples |
|---------|--------|------------------------------|
| Trees | `tree` | `create`, `update`, `delete`, `duplicate`, `set_default` |
| Members | `member` | `create`, `update`, `delete`, `favorite` |
| Voices | `voice` | `upload`, `set_default`, `delete` |
| Chat | `chat` | `message` (+ creditsUsed) |
| Credits | `credit` | `grant`, `deduct` (user-visible) |
| Settings | `settings` | `notifications_update` |
| Inbox | `notification` | `read`, `accept_share`, `decline_share` |
| Billing | `payment` or `subscription_*` | checkout, cancel, upgrade |

**Pattern in new controllers:**
```ts
await activityService.recordUserProductAction(req, 'tree', 'Created tree "My Family"', {
  action: 'create',
  treeId: tree.id,
});
```

### Routes

| Method | Path | Access | Status |
|--------|------|--------|--------|
| GET | `/activities` | User (`auth('common')`) | [x] Own activities |
| GET | `/activities/admin` | Dashboard (`auth('manageUsers')`) | [x] All activities, filter `?type=admin_action` |
| DELETE | `/activities/:id` | User | [x] Delete own activity |

#### Step 0.2 — Activity logging foundation ✅ DONE

**Commit:** `feat(activity): centralize audit logging for user, subscription, and admin actions`

**Test:**
```bash
npm run typecheck
export BASE=http://localhost:3000/api/v1 TOKEN=<user_token> ADMIN=<admin_token>

# User register/login → Activity type register/login
curl -H "Authorization: Bearer $TOKEN" $BASE/activities
# → 200, recent auth activities for that user

# Subscription checkout (user token)
curl -X POST $BASE/subscriptions/checkout-session -H "Authorization: Bearer $TOKEN" \
  -d '{"planId":"...","successUrl":"http://a","cancelUrl":"http://b"}'
# → Activity type subscription_checkout

# Admin plan create
curl -X POST $BASE/subscriptions/price-plans -H "Authorization: Bearer $ADMIN" -d '{...}'
curl -H "Authorization: Bearer $ADMIN" "$BASE/activities/admin?type=admin_action"
# → 200, includes action plan_create

# Server logs show: Activity [admin_action] user=...: Created price plan "..."
```

**Flow test:** `npm run test:flow -- 0.2`  
Script: `scripts/test-flows/step-0.2.sh` — chains API calls; passes `TOKEN`, ids from prior responses (needs `jq`, server running).

# Server logs show: Activity [admin_action] user=...: Created price plan "..."
```

---

## 0.3 Firebase + Mongo auth architecture (target)

> **Approved direction:** Firebase Auth handles all identity providers and verification (including email OTP / verification links). MongoDB stores the app user, **bcrypt-encrypted password**, API **JWT tokens**, and **sessions**. API routes always use backend JWT from Mongo — never Firebase `idToken` after the initial exchange.

### Responsibility split

| Layer | Owns |
|-------|------|
| **Client (Firebase SDK)** | Google, Apple, Facebook, Email/Password sign-up & sign-in; email verification; password reset UI; resend verification |
| **Firebase Auth** | OTP / email verification links, social OAuth, `email_verified`, password reset emails |
| **Backend exchange** | Verify Firebase `idToken` once at register/login → sync Mongo `User` → issue backend JWT |
| **MongoDB** | `User` (profile, `firebaseUid`, bcrypt `password`), `Token` (access + refresh), `Session` (devices) |
| **API requests** | `Authorization: Bearer <backend_access_token>` — validated against Mongo `Token` via `middlewares/auth.ts` |

### End-to-end flow

```
Client Firebase sign-in (any provider)
    → idToken
    → POST /auth/register or POST /auth/login { idToken, ... }
    → firebaseAuth.service.verifyIdToken()
    → sync Mongo User (firebaseUid, authProvider, isEmailVerified from token)
    → tokenService.generateAuthTokens() → save refresh Token (+ Session) in Mongo
    → return { user, tokens: { access, refresh } }

All later API calls
    → Bearer access token (Mongo JWT)
    → POST /auth/refresh-tokens { refreshToken } → new pair from Mongo Token
    → POST /auth/logout { refreshToken } → blacklist Token in Mongo
```

### Providers

| Provider | Client | Backend on register/login |
|----------|--------|---------------------------|
| Google | Firebase `GoogleAuthProvider` | `idToken` → sync Mongo, `authProvider: google` |
| Apple | Firebase `OAuthProvider('apple.com')` | same |
| Facebook | Firebase `FacebookAuthProvider` | same |
| Email | Firebase `createUserWithEmailAndPassword` | `idToken` + **also** store bcrypt `password` in Mongo |

### Passwords in Mongo (encrypted)

- [ ] `User.password` — bcrypt hash via existing `user.model.ts` pre-save (`bcryptjs`) — **never** store plaintext
- [ ] **Register (email):** create/sync Firebase user **and** persist bcrypt hash in Mongo (same password)
- [ ] **Login (email):** primary path = client sends Firebase `idToken` after Firebase sign-in; optional fallback = `email` + `password` verified with `user.isPasswordMatch()` then still issue Mongo JWT (no Firebase idToken on API)
- [ ] **Change password:** update **both** Firebase (`admin.auth().updateUser(uid, { password })`) **and** Mongo bcrypt hash — keep in sync
- [ ] **Forgot / reset password:** use **Firebase** (`sendPasswordResetEmail` on client); backend `POST /auth/forgot-password` may proxy or document client-only; on reset complete, optionally re-hash in Mongo if user logs in with new password

### OTP & email verification — Firebase, not custom Mongo OTP

- [ ] **Remove / stop using** custom `oneTimeCode` + `oneTimeCodeExpiresAt` for new email signups (legacy fields may remain until migration)
- [ ] `isEmailVerified` — sync from Firebase token `email_verified` on every `idToken` login/register
- [ ] Block backend JWT issue for email users until `email_verified === true` (Firebase verification complete)
- [ ] Resend verification — client calls Firebase `sendEmailVerification()`; optional backend `POST /auth/resend-verification` proxy using Admin SDK / documented client flow
- [ ] **Do not** build custom 6-digit OTP email flow when Firebase already provides email verification

### Tokens — always from Mongo

- [x] `token.service.ts` — JWT access + refresh, persisted in Mongo `Token` collection
- [x] Wire `Token.sessionId` → Mongo `Session` ObjectId (Step 1.5)
- [ ] `auth()` middleware loads user from JWT `sub` — **not** Firebase token verification on each request
- [ ] Refresh / logout / revoke — operate on Mongo `Token` (+ `Session`), not Firebase sessions

### Legacy vs target (current codebase)

| Today | Target |
|-------|--------|
| Dual path: `idToken` OR raw `email`+`password` register | Prefer `idToken`; keep `email`+`password` register with Mongo bcrypt + Firebase user create |
| Custom `oneTimeCode` verify | Firebase email verification |
| `loginUserWithEmailAndPassword` in Mongo only | Mongo password check **synced** with Firebase; login returns Mongo JWT |
| Partial Firebase sync | Full provider matrix: google, apple, facebook, email |

### Config

- [x] `config/firebase.ts` — Admin SDK (service account)
- [x] `GET /firebase-config` — web SDK config for client
- [ ] Enable Email/Password + Google + Apple + Facebook in Firebase Console
- [ ] Document client integration in `requirements/` or README (Firebase SDK init, provider buttons)

### Tasks checklist (auth alignment)

- [x] `firebaseAuth.service.ts` — `createFirebaseUser`, `updateFirebasePassword`, `sendVerificationEmail` helpers
- [x] `user.service.ts` / `auth.service.ts` — register: Firebase + Mongo bcrypt in one flow
- [ ] `auth.service.ts` — login: accept `idToken` (primary) or email+password (Mongo verify → Mongo JWT)
- [x] `auth.service.ts` — changePassword: Firebase Admin `updateUser` + Mongo bcrypt
- [ ] `auth.controller.ts` — align register/login/change-password/verify with §0.3; deprecate numeric OTP verify
- [ ] `auth.validation.ts` — `idToken` schema; optional `resendVerification` (email)
- [ ] Migration note: existing users with `oneTimeCode` only — force Firebase verify on next login

---

## 1. Authentication & onboarding

> **§0.3:** Firebase for Google, Apple, Facebook, Email auth + email verification/OTP. Mongo for bcrypt passwords, `Token`, `Session`. API JWTs from Mongo only.

### DB
- [x] `User`: `username`, `creditBalance` fields added
- [x] `User`: `authProvider` covers email | google | facebook | apple | firebase
- [x] `User.password` — bcrypt via mongoose pre-save (existing)
- [x] `User.firebaseUid` — link to Firebase Auth user
- [~] `oneTimeCode`, `oneTimeCodeExpiresAt` — **legacy; deprecate** per §0.3 (use Firebase verification)
- [x] Index: `User.username`; email/firebaseUid already indexed
- [x] `Token` — refresh tokens in Mongo (existing); link `sessionId` → `Session` (Step 1.5)

### Models
- [x] `user.model.ts` — username, creditBalance, `isPasswordMatch()`, firebaseUid
- [x] `settings.model.ts` — wired to signup via `settings.service.ts`
- [x] `token.model.ts` — `sessionId` ObjectId ref `Session`
- [x] `session.model.ts` — wired on login via `session.service.ts`

### Services
- [x] `firebaseAuth.service.ts` — verify idToken, sync providers, create user, verification link helpers ✅
- [x] `firebaseAuth.service.ts` — `createFirebaseEmailUser`, `sendFirebaseEmailVerification`, `assertFirebaseEmailVerified`, `syncFirebasePasswordForUser`
- [x] `auth.service.ts` — register: Firebase user + Mongo user + bcrypt password in sync
- [~] `auth.service.ts` — login via `idToken` (primary) or email+password (Mongo bcrypt → Mongo JWT)
- [x] `auth.service.ts` — `changePassword` / `resetPassword`: Firebase Admin `updateUser` + Mongo bcrypt (dual write via `applyPasswordChange`)
- [x] `auth.service.ts` — block JWT until `email_verified` from Firebase (email provider)
- [x] `auth.service.ts` — `verifyEmailWithIdToken`, `resendEmailVerification`; legacy OTP kept for migration
- [x] `settings.service.ts` — `ensureDefaultSettings` on register (email + Firebase)
- [x] `session.service.ts` — create session on login; list active devices
- [x] `token.service.ts` — JWT in Mongo `Token`; Session created/linked on `generateAuthTokens`

### Controllers
- [~] `auth.controller.ts` — register, login, logout, refresh, delete-me
- [x] `auth.controller.ts` — register/login block unverified email users from receiving Mongo JWT
- [x] `auth.controller.ts` — `POST /auth/resend-verification` (Firebase email verify resend)
- [x] `auth.controller.ts` — `POST /auth/verify-email` accepts `{ idToken }` (+ legacy OTP fallback)
- [x] `auth.controller.ts` — `changePassword` / `resetPassword` dual-write Firebase + Mongo (Step 1.4); forgot-password still client/Firebase link flow

### Routes / APIs

**User** (authenticated, own account):

| Method | Path | Access | Status | Notes |
|--------|------|--------|--------|-------|
| POST | `/auth/register` | Public | [x] | `{ idToken }` or `{ email, password, fullName }` → Firebase + Mongo bcrypt |
| POST | `/auth/login` | Public | [~] | `{ idToken }` primary; or `{ email, password }` → Mongo verify → Mongo JWT |
| POST | `/auth/verify-email` | Public | [~] | `{ idToken }` after Firebase email verify — not numeric OTP |
| POST | `/auth/resend-verification` | Public | [x] | Firebase resend (replaces `/auth/resend-otp`) |
| POST | `/auth/refresh-tokens` | Public | [x] | Refresh token from Mongo `Token`; rotates within same `Session` |
| POST | `/auth/logout` | User | [x] | Revokes Mongo refresh `Token` + `Session` |
| POST | `/auth/forgot-password` | Public | [~] | Firebase password reset (client or proxy) |
| POST | `/auth/reset-password` | Public | [~] | Firebase oobCode flow / client-handled |
| POST | `/auth/change-password` | User | [x] | Dual: Firebase `updateUser` + Mongo bcrypt; revokes all refresh tokens |
| POST | `/auth/delete-me` | User | [~] | Delete Firebase user + soft-delete Mongo |

### Validations
- [~] `auth.validation.ts` — `idToken` on register/login; `resendVerification` (email)
- [ ] Deprecate numeric OTP schemas in favor of Firebase verification flow

#### Step 1.1 — Model alignment + exports ✅ DONE

**Commit:** `feat(models): align Eternous schemas and export all models`

**Test:**
```bash
npm run typecheck
npm run build
# Optional: npm run seed:relation-types (needs MongoDB + .env)
# GET http://localhost:3000/api/v1/activities — 401 without token (route mounted)
```

**Flow test:** `npm run test:flow -- 1.1`  
Script: `scripts/test-flows/step-1.1.sh` — chains API calls; passes `TOKEN`, ids from prior responses (needs `jq`, server running).

#### Step 1.2 — Settings on signup ✅ DONE

**Commit:** `feat(auth): create default Settings on user registration`

**Test:**
```bash
npm run dev
# Register email user:
curl -X POST http://localhost:3000/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"Password1","fullName":"Test User"}'
# Mongo: db.settings.findOne({ userId: <new_user_id> }) → notificationsEnabled: true
```

**Flow test:** `npm run test:flow -- 1.2`  
Script: `scripts/test-flows/step-1.2.sh` — chains API calls; passes `TOKEN`, ids from prior responses (needs `jq`, server running).

#### Step 1.3 — Firebase email verification (replaces custom OTP) ✅ DONE

**Commit:** `feat(auth): use Firebase email verification instead of custom OTP`

**Test:**
```bash
# Client: Firebase createUserWithEmailAndPassword → sendEmailVerification()
# Before verify: POST /auth/login { idToken } → 400 email not verified

# After verify in Firebase: POST /auth/login { idToken }
# → 200, Mongo JWT tokens; User.isEmailVerified:true

# Optional resend:
curl -X POST http://localhost:3000/api/v1/auth/resend-verification \
  -H "Content-Type: application/json" -d '{"email":"test@example.com"}'
# → Firebase verification email resent (rate-limited)
```

**Flow test:** `npm run test:flow -- 1.3`  
Script: `scripts/test-flows/step-1.3.sh` — chains API calls; passes `TOKEN`, ids from prior responses (needs `jq`, server running).

#### Step 1.4 — Mongo bcrypt passwords + Firebase password sync ✅ DONE

**Commit:** `feat(auth): sync encrypted Mongo passwords with Firebase on register and change-password`

**Test:**
```bash
npm run typecheck
npm test -- tests/integration/auth.test.ts

# Register email user (Firebase + Mongo):
curl -X POST http://localhost:3000/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"Password1","fullName":"Test User"}'
# Mongo: User.password is bcrypt hash (not plaintext)
# Firebase Console: user exists with same email

# Login with email+password → Mongo JWT (not Firebase idToken on API):
curl -X POST http://localhost:3000/api/v1/auth/login \
  -d '{"email":"test@example.com","password":"Password1"}'
# → { tokens: { access, refresh } } from Mongo Token collection

# Change password — both updated:
curl -X POST http://localhost:3000/api/v1/auth/change-password \
  -H "Authorization: Bearer <access_token>" \
  -d '{"oldPassword":"Password1","newPassword":"Password2"}'
# Mongo bcrypt changed; Firebase password updated; old refresh tokens invalidated
```

**Flow test:** `npm run test:flow -- 1.4`  
Script: `scripts/test-flows/step-1.4.sh` — chains API calls; passes `TOKEN`, ids from prior responses (needs `jq`, server running).

#### Step 1.5 — Session on login + Mongo tokens ✅ DONE

**Commit:** `feat(auth): track login sessions and link refresh tokens in Mongo`

**Test:**
```bash
npm run typecheck
npm test -- tests/integration/auth.test.ts

# Login with idToken or email+password twice (different User-Agent)
curl -X POST http://localhost:3000/api/v1/auth/login ... -H "User-Agent: Chrome/Mac"
# Mongo: db.sessions.find({ userId }) → 2 active sessions
# Mongo: db.tokens.find({ user, type: 'refresh' }) → tokens linked to sessionId

curl -X POST http://localhost:3000/api/v1/auth/refresh-tokens \
  -d '{"refreshToken":"<refresh>"}'
# → new access token; validated against Mongo Token doc

curl -H "Authorization: Bearer $TOKEN" http://localhost:3000/api/v1/users/me/devices
# → lists active sessions (devices)
```

**Flow test:** `npm run test:flow -- 1.5`  
Script: `scripts/test-flows/step-1.5.sh` — chains API calls; passes `TOKEN`, ids from prior responses (needs `jq`, server running).

---

## 2. Home dashboard

> Favorites members, recently used members.

### DB
- [x] `Member.isFavorite` — index `{ userId: 1, isFavorite: 1 }`
- [x] `Member.lastTimeUsed` — index `{ userId: 1, lastTimeUsed: -1 }`

### Models
- [x] `member.model.ts` — dateOfBirth, privateNotes, isRelatedMember, defaultVoiceId, indexes

### Services
- [x] `member.service.ts` — `getFavoriteMembers(userId)`
- [x] `member.service.ts` — `getRecentlyUsedMembers(userId, limit)`
- [x] `member.service.ts` — `touchMemberUsed(memberId)` — for chat/listen (Phase 6)
- [x] `home.service.ts` — aggregate favorites + recent

### Controllers
- [x] `home.controller.ts` — aggregate favorites + recent in one response

### Routes / APIs

**User:**

| Method | Path | Access | Status | Notes |
|--------|------|--------|--------|-------|
| GET | `/home` | User | [x] | `{ favorites, recentlyUsed }` |
| PATCH | `/members/:memberId/favorite` | User | [x] | Toggle favorite (own member) |

#### Step 2.4 — Home endpoint ✅ DONE

**Commit:** `feat(home): add favorites and recently used members`

**Test:**
```bash
npm run typecheck
export BASE=http://localhost:3000/api/v1 TOKEN=<access_token>

curl -X PATCH $BASE/members/<memberId>/favorite -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" -d '{"isFavorite":true}'
# → 200

curl -H "Authorization: Bearer $TOKEN" $BASE/home
# → 200, { favorites: [...], recentlyUsed: [...] }
# recentlyUsed sorted by lastTimeUsed desc
```

**Flow test:** `npm run test:flow -- 2.4`  
Script: `scripts/test-flows/step-2.4.sh` — chains API calls; passes `TOKEN`, ids from prior responses (needs `jq`, server running).

---

## 3. Trees

> CRUD, background image, duplicate tree (copy members optional), soft delete.

### DB
- [x] `Tree`: `userId`, `name`, `image`, `backgroundImage`, `description`, `isDefault`, `isDeleted`
- [x] Index: `{ userId: 1, isDeleted: 1 }`, `{ userId: 1, isDefault: 1 }`

### Models
- [x] `tree.model.ts` — `backgroundImage` field + compound indexes

### Services
- [x] `tree.service.ts` — create, list, getById, update, softDelete
- [x] `tree.service.ts` — `duplicateTree(treeId, { copyMembers: boolean })`
- [x] `tree.service.ts` — set default tree (only one `isDefault` per user)
- [x] Storage: upload tree photo + background image; return URL object (`utils/treeUpload.ts`)

### Controllers
- [x] `tree.controller.ts`

### Routes / APIs

**User** (all routes scoped to `req.user.id`):

| Method | Path | Access | Status | Body / notes |
|--------|------|--------|--------|--------------|
| GET | `/trees` | User | [x] | Paginated list (own trees) |
| POST | `/trees` | User | [x] | `name`, optional `image` (multipart) |
| GET | `/trees/:treeId` | User | [x] | Own tree + member count |
| PATCH | `/trees/:treeId` | User | [x] | `name`, `image`, `backgroundImage` |
| DELETE | `/trees/:treeId` | User | [x] | Soft delete |
| POST | `/trees/:treeId/duplicate` | User | [x] | `{ copyMembers?: boolean }` |
| PATCH | `/trees/:treeId/default` | User | [x] | Set as default tree |

### Validations
- [x] `tree.validation.ts`

#### Step 2.1 — Trees CRUD ✅ DONE

**Commit:** `feat(trees): add tree CRUD, duplicate, and default tree`

**Test:**
```bash
npm run typecheck
export BASE=http://localhost:3000/api/v1 TOKEN=<access_token>

curl -s -o /dev/null -w "%{http_code}\n" -H "Authorization: Bearer $TOKEN" $BASE/trees
# → 200, body has your trees only

curl -X POST $BASE/trees -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
  -d '{"name":"My Family"}'
# → 201, returns tree _id

curl -H "Authorization: Bearer $TOKEN" $BASE/trees/<treeId>
# → 200, memberCount field present

curl -X PATCH $BASE/trees/<treeId>/default -H "Authorization: Bearer $TOKEN"
# → 200; Mongo: only one isDefault:true per userId

curl -X POST $BASE/trees/<treeId>/duplicate -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" -d '{"copyMembers":false}'
# → 201, new tree id

curl -X DELETE $BASE/trees/<treeId> -H "Authorization: Bearer $TOKEN"
# → 200; list no longer shows deleted tree (isDeleted:true in Mongo)
```

**Flow test:** `npm run test:flow -- 2.1`  
Script: `scripts/test-flows/step-2.1.sh` — chains API calls; passes `TOKEN`, ids from prior responses (needs `jq`, server running).

---

## 4. Members

> Inside a tree. Photo, name, DOB, bio, custom greeting, relation, nickname, “not a related member” flag, voice upload on create.

### DB
- [x] `Member`: `dateOfBirth`, `privateNotes`, `isRelatedMember` (boolean, default true)
- [x] `Member.relatedToMemberId` — optional graph link
- [x] `Member.memberRelationTypeId` — ref MemberRelationType
- [x] `Member.defaultVoiceId` — ref Voice
- [x] Index: `{ treeId: 1 }`, `{ userId: 1, treeId: 1 }`

### Models
- [x] `member.model.ts` — fields aligned
- [x] `memberRelationType.model.ts` — seed data (`npm run seed:relation-types`)

### Services
- [x] `member.service.ts` — CRUD scoped to `userId` + `treeId`
- [x] `member.service.ts` — create with optional photo + initial voice upload (creates Voice v1)
- [x] `member.service.ts` — `getMemberDetails` returns relationType, voices summary, defaultVoiceId
- [x] `memberRelationType.service.ts` — list active types

### Controllers
- [x] `member.controller.ts`
- [x] `memberRelationType.controller.ts` — public list

### Routes / APIs

**User** (ownership via `tree.userId` / `member.userId`):

| Method | Path | Access | Status | Notes |
|--------|------|--------|--------|-------|
| GET | `/trees/:treeId/members` | User | [x] | List members in own tree |
| POST | `/trees/:treeId/members` | User | [x] | Multipart: photo?, voice? |
| GET | `/members/:memberId` | User | [x] | Full details (own) |
| PATCH | `/members/:memberId` | User | [x] | Update + photo |
| DELETE | `/members/:memberId` | User | [x] | Delete + voice docs |
| PATCH | `/members/:memberId/favorite` | User | [x] | Toggle `isFavorite` |
| GET | `/member-relation-types` | Public | [x] | Father, son, etc. (13 types) |

**Dashboard:**

| Method | Path | Access | Status | Notes |
|--------|------|--------|--------|-------|
| POST | `/member-relation-types` | Dashboard | [ ] | `auth('manageUsers')` — Step 6+ |
| PATCH | `/member-relation-types/:id` | Dashboard | [ ] | `auth('manageUsers')` |

### Validations
- [x] `member.validation.ts`

#### Step 2.2 — Members CRUD + relation types ✅ DONE

**Commit:** `feat(members): add member CRUD and relation type list`

**Test:**
```bash
npm run typecheck
npm run seed:relation-types   # once, needs MongoDB
export BASE=http://localhost:3000/api/v1 TOKEN=<access_token> TREE=<treeId>

curl $BASE/member-relation-types
# → 200, array includes father, mother, son (13 types)

curl -H "Authorization: Bearer $TOKEN" $BASE/trees/$TREE/members
# → 200, empty or list

curl -X POST $BASE/trees/$TREE/members -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"name":"Grandma","memberRelationTypeId":"<typeId>","biography":"..."}'
# → 201

curl -H "Authorization: Bearer $TOKEN" $BASE/members/<memberId>
# → 200, has relationType, voices summary, defaultVoiceId

curl -X PATCH $BASE/members/<memberId>/favorite -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" -d '{"isFavorite":true}'
# → 200; Mongo: isFavorite:true
```

**Flow test:** `npm run test:flow -- 2.2`  
Script: `scripts/test-flows/step-2.2.sh` — chains API calls; passes `TOKEN`, ids from prior responses (needs `jq`, server running).

---

## 5. Voice versions

> Multiple versions per member; select default for cloning. Upload new version. External clone API is another project.

### DB
- [x] `Voice`: unique `{ memberId, versionNumber }`
- [x] `Voice.status`: processing | ready | failed | archived
- [x] `Voice`: `name`, `uploadUrl`, `voiceUrl`, `size`, `duration`, `isDefault`

### Models
- [x] `voice.model.ts` — version logic + indexes

### Services
- [x] `voice.service.ts` — `uploadVoice(memberId, file)` → auto-increment `versionNumber`
- [x] `voice.service.ts` — `listVoices(memberId)`, `setDefaultVoice(memberId, voiceId)`
- [x] `voice.service.ts` — `resolveVoiceForChat` (voiceId → versionNumber → default → latest ready)
- [x] `voice.service.ts` — update `Member.defaultVoiceId` when default changes
- [~] Storage: track file size for user storage quota (size stored; quota enforcement Phase 3+)
- [ ] Webhook or poll endpoint for external clone service (optional stub — Phase 6)

### Controllers
- [x] `voice.controller.ts`

### Routes / APIs
| Method | Path | Status | Notes |
|--------|------|--------|-------|
| GET | `/members/:memberId/voices` | [x] | All versions |
| POST | `/members/:memberId/voices` | [x] | Upload new version (multipart `file`) |
| PATCH | `/members/:memberId/voices/:voiceId/default` | [x] | Set default |
| GET | `/members/:memberId/voices/:voiceId` | [x] | Single version metadata |
| DELETE | `/members/:memberId/voices/:voiceId` | [x] | Archive voice |

### Validations
- [x] `voice.validation.ts`

#### Step 2.3 — Voice versions upload + default ✅ DONE

**Commit:** `feat(voices): add voice upload, list, and default selection`

**Test:**
```bash
npm run typecheck
export BASE=http://localhost:3000/api/v1 TOKEN=<access_token> MEMBER=<memberId>

curl -H "Authorization: Bearer $TOKEN" $BASE/members/$MEMBER/voices
# → 200, versions array (empty or v1)

curl -X POST $BASE/members/$MEMBER/voices -H "Authorization: Bearer $TOKEN" \
  -F "file=@/path/to/sample.wav" -F "name=Version 1.0"
# → 201, versionNumber:1, status processing or ready

curl -X PATCH $BASE/members/$MEMBER/voices/<voiceId>/default -H "Authorization: Bearer $TOKEN"
# → 200; Mongo: Member.defaultVoiceId updated, Voice.isDefault:true

curl -H "Authorization: Bearer $TOKEN" $BASE/members/$MEMBER
# → default voice matches selected version
```

**Flow test:** `npm run test:flow -- 2.3`  
Script: `scripts/test-flows/step-2.3.sh` — chains API calls; passes `TOKEN`, ids from prior responses (needs `jq`, server running).

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

#### Step 5.1 — Chat orchestration (proxy)

**Commit:** `feat(chat): add ephemeral chat proxy with voice selection`

**Test:**
```bash
export BASE=http://localhost:3000/api/v1 TOKEN=<access_token>

curl -X POST $BASE/chat -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
  -d '{"memberId":"<memberId>","message":"Hello Grandma"}'
# → 200, body: { text, audioUrl, creditsUsed, creditsRemaining }
# Mongo: Member.lastTimeUsed updated; no chat/message collection docs

curl -X POST $BASE/chat -H "Authorization: Bearer $TOKEN" \
  -d '{"memberId":"<other_user_member>","message":"hi"}'
# → 403 or 404 (not your member)
```

**Flow test:** `npm run test:flow -- 5.1`  
Script: `scripts/test-flows/step-5.1.sh` — chains API calls; passes `TOKEN`, ids from prior responses (needs `jq`, server running).

#### Step 5.2 — Credit deduct on chat

**Commit:** `feat(credits): deduct credits atomically on chat`

**Test:**
```bash
# Before chat: GET $BASE/users/me/credits → balance N
# After chat: balance N - creditsUsed; CreditTransaction type usage in Mongo
curl -X POST $BASE/chat ... -d '{"memberId":"...","message":"test"}'
curl -H "Authorization: Bearer $TOKEN" $BASE/users/me/credits
# → creditsRemaining decreased; repeat with balance 0 → 402 or 400 insufficient credits
```

**Flow test:** `npm run test:flow -- 5.2`  
Script: `scripts/test-flows/step-5.2.sh` — chains API calls; passes `TOKEN`, ids from prior responses (needs `jq`, server running).

---

## 7. Subscription plans (Preservation Plans)

> Monthly/Yearly plans from dashboard (Stripe). Name, price, description, feature bullet points.

### DB
- [x] `SubscriptionPlan`: `credits` (per billing period), `planType` (monthly | yearly | preservation)
- [x] `SubscriptionPlan`: `features` string[] (bullet points)
- [x] Stripe `priceId` sync from dashboard / admin create

### Models
- [x] `subscriptionPlan.model.ts` — `credits`, `planType`

### Services
- [x] `subscriptionPlan.service.ts` — CRUD + auto slug + Stripe Product/Price on create
- [x] `subscriptionPlan.service.ts` — Public list: active plans with credits/planType
- [x] `credit.service.ts` — `grantCredits` with `idempotencyKey` (Step 3.1 hook)
- [~] Dashboard admin: create/update plan → Stripe sync when `STRIPE_SECRET_KEY` set; dev fallback `dev_price_*`

### Controllers
- [x] `subscriptionPlan.controller.ts`

### Routes / APIs

**Public / User:**

| Method | Path | Access | Status | Notes |
|--------|------|--------|--------|-------|
| GET | `/subscriptions/price-plans` | Public | [x] | Active plans with `credits`, `planType` |
| POST | `/subscriptions/checkout-session` | User | [~] | Stripe checkout |
| GET | `/subscriptions/me` | User | [x] | Current plan + history |
| PATCH | `/subscriptions/:id/cancel` | User | [x] | Cancel own plan |
| POST | `/subscriptions/upgrade` | User | [x] | Upgrade own plan |

**Dashboard** (existing paths + guards):

| Method | Path | Access | Status | Notes |
|--------|------|--------|--------|-------|
| POST | `/subscriptions/price-plans` | Dashboard | [~] | `auth('manageUsers')` + `requireAdmin()` in controller |
| PATCH | `/subscriptions/price-plans/:planId` | Dashboard | [~] | `auth('manageUsers')` |
| PATCH | `/subscriptions/:id/activate` | Dashboard | [~] | `auth('manageUsers')` + admin role in controller |

### Validations
- [x] `subscriptionPlan.validation.ts` — credits, planType, optional slug/priceId

#### Step 3.1 — Plan credits + Stripe webhook idempotency ✅ DONE

**Commit:** `feat(subscriptions): add plan credits and idempotent Stripe webhooks`

**Test:**
```bash
npm run typecheck
curl $BASE/subscriptions/price-plans
# → 200, plans include credits and planType fields

# Dashboard (admin token):
curl -X POST $BASE/subscriptions/price-plans -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"name":"Pro","price":80,"credits":100,"planType":"monthly","features":["..."]}'
# → 201, priceId synced to Stripe (or dev_price_* without Stripe)

# Replay same Stripe invoice webhook twice → User.creditBalance increases once only
# Mongo: CreditTransaction idempotencyKey = stripe:invoice:<invoiceId>
```

**Flow test:** `npm run test:flow -- 3.1`  
Script: `scripts/test-flows/step-3.1.sh` — chains API calls; passes `TOKEN`, ids from prior responses (needs `jq`, server running).

#### Step 3.4 — Upgrade / cancel subscription ✅ DONE

**Commit:** `feat(subscriptions): add upgrade and cancel for own plan`

**Test:**
```bash
export BASE=http://localhost:3000/api/v1 TOKEN=<access_token>

curl -H "Authorization: Bearer $TOKEN" $BASE/subscriptions/me
# → 200, current plan + status

curl -X POST $BASE/subscriptions/upgrade -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" -d '{"planId":"<newPlanId>"}'
# → 200 or checkout URL

curl -X PATCH $BASE/subscriptions/<subId>/cancel -H "Authorization: Bearer $TOKEN"
# → 200; Mongo: status canceled or cancelAtPeriodEnd
```

**Flow test:** `npm run test:flow -- 3.4`  
Script: `scripts/test-flows/step-3.4.sh` — chains API calls; passes `TOKEN`, ids from prior responses (needs `jq`, server running).

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
- [x] `billing.service.ts` — get current plan summary (`name`, `$80.00 per month`)
- [x] `billing.service.ts` — list payment methods from Stripe Customer
- [x] `billing.service.ts` — add payment method (Stripe SetupIntent)
- [x] `billing.service.ts` — set default payment method
- [x] `billing.service.ts` — billing history (invoices/payments paginated)
- [~] `stripe.service.ts` — extend webhooks: `invoice.paid` → Payment + credits
- [x] `User`: `stripeCustomerId` for Stripe Customer link

### Controllers
- [x] `billing.controller.ts`
- [~] `payment.controller.ts` — payment intents exist

### Routes / APIs

**User** (own billing only):

| Method | Path | Access | Status | Notes |
|--------|------|--------|--------|-------|
| GET | `/billing/overview` | User | [x] | Plan + payment method summary |
| GET | `/billing/payment-methods` | User | [x] | List own cards |
| POST | `/billing/payment-methods` | User | [x] | Add (SetupIntent client secret) |
| PATCH | `/billing/payment-methods/:id/default` | User | [x] | Set default |
| DELETE | `/billing/payment-methods/:id` | User | [x] | Remove |
| GET | `/billing/history` | User | [x] | Paginated invoices/payments |
| POST | `/payments/create-intent` | User | [~] | Own payments |
| GET | `/payments/:paymentIntentId` | User | [~] | Own payment intent |

**Dashboard:**

| Method | Path | Access | Status | Notes |
|--------|------|--------|--------|-------|
| POST | `/payments/:paymentIntentId/refund` | Admin | [~] | `auth('manageOrders')` — keep existing path |

#### Step 3.3 — Billing overview, payment methods, history ✅ DONE

**Commit:** `feat(billing): add overview, payment methods, and history`

**Test:**
```bash
export BASE=http://localhost:3000/api/v1 TOKEN=<access_token>

curl -H "Authorization: Bearer $TOKEN" $BASE/billing/overview
# → 200, { planName, priceLabel, defaultPaymentMethod }

curl -H "Authorization: Bearer $TOKEN" $BASE/billing/payment-methods
# → 200, cards with last4, brand, isDefault

curl -X POST $BASE/billing/payment-methods -H "Authorization: Bearer $TOKEN"
# → 200, SetupIntent clientSecret for Stripe.js

curl -H "Authorization: Bearer $TOKEN" "$BASE/billing/history?page=1&limit=10"
# → 200, paginated invoices/payments
```

**Flow test:** `npm run test:flow -- 3.3`  
Script: `scripts/test-flows/step-3.3.sh` — chains API calls; passes `TOKEN`, ids from prior responses (needs `jq`, server running).

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

#### Step 9 — Profile `/users/me`

**Commit:** `feat(users): extend profile endpoint with credits and subscription`

**Test:**
```bash
export BASE=http://localhost:3000/api/v1 TOKEN=<access_token>

curl -H "Authorization: Bearer $TOKEN" $BASE/users/me
# → 200, includes creditBalance, subscription summary

curl -X PATCH $BASE/users/me -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" -d '{"fullName":"New Name","username":"newuser1"}'
# → 200; duplicate username → 400

curl -X POST $BASE/users/me/change-password -H "Authorization: Bearer $TOKEN" \
  -d '{"currentPassword":"...","newPassword":"...","confirmNewPassword":"..."}'
# → 200; mismatch confirm → 400
```

**Flow test:** `npm run test:flow -- 9`  
Script: `scripts/test-flows/step-9.sh` — chains API calls; passes `TOKEN`, ids from prior responses (needs `jq`, server running).

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

#### Step 4.2 — Notification settings API

**Commit:** `feat(settings): add notification preferences endpoints`

**Test:**
```bash
export BASE=http://localhost:3000/api/v1 TOKEN=<access_token>

curl -H "Authorization: Bearer $TOKEN" $BASE/users/me/settings
# → 200, notificationsEnabled, birthdayNotificationsEnabled, paymentNotificationsEnabled

curl -X PATCH $BASE/users/me/settings/notifications -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"birthdayNotificationsEnabled":false}'
# → 200; Mongo Settings doc updated
```

**Flow test:** `npm run test:flow -- 4.2`  
Script: `scripts/test-flows/step-4.2.sh` — chains API calls; passes `TOKEN`, ids from prior responses (needs `jq`, server running).

---

## 11. Security — 2FA & logged-in devices

### DB
- [~] `Settings.twoFactorEnabled`, `Settings.verified`
- [x] `Session` — deviceName, deviceType, userAgent, ipAddress, isActive, revokedAt; wired on login
- [x] `Token.sessionId` → ObjectId ref Session

### Services
- [x] `session.service.ts` — create session on login/register
- [x] `session.service.ts` — list active devices for user
- [~] `session.service.ts` — revoke one session / revoke all (service ready; DELETE routes in Step 6.2)
- [ ] `twoFactor.service.ts` — enable/disable 2FA (TOTP or email OTP stub)
- [x] `token.service.ts` — link refresh token to Session document

### Routes / APIs
| Method | Path | Status | Notes |
|--------|------|--------|-------|
| GET | `/users/me/devices` | [x] | Logged-in devices list |
| DELETE | `/users/me/devices/:sessionId` | [ ] | Logout one device |
| DELETE | `/users/me/devices` | [ ] | Logout all |
| POST | `/users/me/security/2fa/enable` | [ ] | |
| POST | `/users/me/security/2fa/disable` | [ ] | |
| POST | `/users/me/security/2fa/verify` | [ ] | Confirm setup |

#### Step 6.1 — 2FA enable/disable

**Commit:** `feat(security): add two-factor authentication endpoints`

**Test:**
```bash
export BASE=http://localhost:3000/api/v1 TOKEN=<access_token>

curl -X POST $BASE/users/me/security/2fa/enable -H "Authorization: Bearer $TOKEN"
# → 200, secret or QR payload

curl -X POST $BASE/users/me/security/2fa/verify -H "Authorization: Bearer $TOKEN" \
  -d '{"code":"123456"}'
# → 200; Settings.twoFactorEnabled:true

curl -X POST $BASE/users/me/security/2fa/disable -H "Authorization: Bearer $TOKEN" \
  -d '{"code":"123456"}'
# → 200; twoFactorEnabled:false
```

**Flow test:** `npm run test:flow -- 6.1`  
Script: `scripts/test-flows/step-6.1.sh` — chains API calls; passes `TOKEN`, ids from prior responses (needs `jq`, server running).

#### Step 6.2 — Logout device / all devices

**Commit:** `feat(security): add device list and session revoke`

**Test:**
```bash
# Login from two clients (different User-Agent) → 2 Session docs
curl -H "Authorization: Bearer $TOKEN" $BASE/users/me/devices
# → 200, lists deviceName, deviceType, lastActive

curl -X DELETE $BASE/users/me/devices/<sessionId> -H "Authorization: Bearer $TOKEN"
# → 200; that refresh token no longer works

curl -X DELETE $BASE/users/me/devices -H "Authorization: Bearer $TOKEN"
# → 200; all other sessions revoked
```

**Flow test:** `npm run test:flow -- 6.2`  
Script: `scripts/test-flows/step-6.2.sh` — chains API calls; passes `TOKEN`, ids from prior responses (needs `jq`, server running).

---

## 12. Credits ledger

> Credits from subscription; deduct on voice/chat usage; admin adjust; refund; idempotent Stripe grants.

### DB
- [~] `CreditTransaction` — full ledger model exists
- [x] `User.creditBalance` — denormalized balance (updated on grant)

### Models
- [x] `user.model.ts` — `creditBalance`
- [~] `creditTransaction.model.ts`

### Services
- [x] `credit.service.ts` — `grantCredits(userId, amount, type, idempotencyKey, meta)`
- [x] `credit.service.ts` — `deductCredits(userId, amount, type, meta)` — MongoDB transaction
- [x] `credit.service.ts` — `getBalance`, `getHistory` (paginated)
- [x] `credit.service.ts` — admin `adjustCredits`
- [x] Hook: Stripe `invoice.payment_succeeded` → grant plan credits once (idempotent by invoiceId)
- [ ] Hook: chat/voice generation → deduct credits
- [ ] Hook: refund → negative grant or reversal transaction

### Routes / APIs

**User** (read-only balance):

| Method | Path | Access | Status | Notes |
|--------|------|--------|--------|-------|
| GET | `/users/me/credits` | User | [x] | Balance + recent transactions |
| GET | `/users/me/credits/history` | User | [x] | Paginated ledger |

**Dashboard:**

| Method | Path | Access | Status | Notes |
|--------|------|--------|--------|-------|
| POST | `/users/:userId/credits` | Dashboard | [x] | `auth('manageUsers')` — manual credit adjust |

#### Step 3.2 — Credits ledger + balance ✅ DONE

**Commit:** `feat(credits): add credit balance, ledger, and admin adjust`

**Test:**
```bash
export BASE=http://localhost:3000/api/v1 TOKEN=<access_token>

curl -H "Authorization: Bearer $TOKEN" $BASE/users/me/credits
# → 200, { balance, recentTransactions }

curl -H "Authorization: Bearer $TOKEN" "$BASE/users/me/credits/history?page=1"
# → 200, paginated CreditTransaction list

# Dashboard:
curl -X POST $BASE/users/<userId>/credits -H "Authorization: Bearer $ADMIN_TOKEN" \
  -d '{"amount":50,"reason":"promo"}'
# → 200; balance += 50; ledger entry type adjustment
```

**Flow test:** `npm run test:flow -- 3.2`  
Script: `scripts/test-flows/step-3.2.sh` — chains API calls; passes `TOKEN`, ids from prior responses (needs `jq`, server running).

---

## 13. In-app notifications

> Tree share invites, backup ready, anniversary, birthday. Accept/decline for shares.

### DB
- [x] `Notification`: extend `type` enum: `tree_share`, `backup`, `anniversary`, `birthday`, `billing`, `subscription`, `system`
- [x] `Notification`: add `title`, `actionStatus` (pending | accepted | declined), `payload` (metadata)
- [x] `TreeShare` collection (new): `treeId`, `ownerId`, `recipientId`, `status`, `message`

### Models
- [x] `notification.model.ts` — extend types
- [x] `treeShare.model.ts` — new

### Services
- [x] `notification.service.ts` — create, list (paginated), mark read, accept/decline share
- [x] `treeShare.service.ts` — share tree with user email → notification
- [ ] Event: backup completed → notification (see §13.1 backup cron)
- [ ] **Cron jobs** — see **§13.1** (birthdays, payments, anniversaries, subscription reminders)

### Routes / APIs

**User:**

| Method | Path | Access | Status | Notes |
|--------|------|--------|--------|-------|
| GET | `/notifications` | User | [x] | Paginated inbox (own) |
| PATCH | `/notifications/:id/read` | User | [x] | Mark read |
| POST | `/notifications/:id/accept` | User | [x] | Accept tree share |
| POST | `/notifications/:id/decline` | User | [x] | Decline tree share |
| POST | `/trees/:treeId/share` | User | [x] | Share own tree with email |
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

#### Step 4.1 — Notification inbox + tree share ✅ DONE

**Commit:** `feat(notifications): add inbox and tree share accept/decline`

**Test:**
```bash
export BASE=http://localhost:3000/api/v1 TOKEN=<access_token>

curl -X POST $BASE/trees/<treeId>/share -H "Authorization: Bearer $TOKEN" \
  -d '{"email":"friend@example.com","message":"Join my tree"}'
# → 201; recipient sees notification type tree_share

curl -H "Authorization: Bearer $FRIEND_TOKEN" $BASE/notifications
# → 200, pending share with actionStatus pending

curl -X POST $BASE/notifications/<id>/accept -H "Authorization: Bearer $FRIEND_TOKEN"
# → 200; TreeShare status accepted

curl -X PATCH $BASE/notifications/<id>/read -H "Authorization: Bearer $FRIEND_TOKEN"
# → 200; isRead:true
```

**Flow test:** `npm run test:flow -- 4.1`  
Script: `scripts/test-flows/step-4.1.sh` — chains API calls; passes `TOKEN`, ids from prior responses (needs `jq`, server running).

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

#### Step 4.3 — Notification scheduler + dedup log

**Commit:** `chore(notifications): register cron scheduler and job dedup log`

**Test:**
```bash
npm run dev
# Logs on start: "Notification schedulers started" (when NOTIFICATION_CRONS_ENABLED=true)

npm run test:notification-crons -- birthday
# → creates Notification + NotificationJobLog; second run same day → skip (dedup)

curl -X POST $BASE/notifications/crons/run -H "Authorization: Bearer $ADMIN_TOKEN" \
  -d '{"job":"birthday"}'
# → 200, { sent, skipped }
```

**Flow test:** `npm run test:flow -- 4.3`  
Script: `scripts/test-flows/step-4.3.sh` — chains API calls; passes `TOKEN`, ids from prior responses (needs `jq`, server running).

#### Step 4.4 — Birthday + anniversary crons

**Commit:** `feat(notifications): add birthday and anniversary cron jobs`

**Test:**
```bash
# Mongo: set Member.dateOfBirth to today (month/day)
npm run test:notification-crons -- birthday
# → in-app Notification type birthday for owning userId

# Mongo: set Member.createdAt to 1 year ago today
npm run test:notification-crons -- anniversary
# → Notification type anniversary, title mentions member name

# User with birthdayNotificationsEnabled:false → job skips (check logs: skip count)
```

**Flow test:** `npm run test:flow -- 4.4`  
Script: `scripts/test-flows/step-4.4.sh` — chains API calls; passes `TOKEN`, ids from prior responses (needs `jq`, server running).

#### Step 4.5 — Payment reminder crons

**Commit:** `feat(notifications): add payment and credits-low cron jobs`

**Test:**
```bash
# Mongo: Subscription.endsAt in 3 days, status active
npm run test:notification-crons -- subscription-reminder
# → type subscription renewal message

# Mongo: User.creditBalance below CREDITS_LOW_THRESHOLD
npm run test:notification-crons -- credits-low
# → type billing credits low message

# Subscription status past_due → payment failed notification
```

**Flow test:** `npm run test:flow -- 4.5`  
Script: `scripts/test-flows/step-4.5.sh` — chains API calls; passes `TOKEN`, ids from prior responses (needs `jq`, server running).

#### Step 4.6 — Monthly backup-ready cron

**Commit:** `feat(notifications): add monthly backup-ready notification`

**Test:**
```bash
npm run test:notification-crons -- backup-ready
# → type backup, title "Your monthly backup is ready"
# → NotificationJobLog referenceKey backup:userId:2026-06 (idempotent per month)
```

**Flow test:** `npm run test:flow -- 4.6`  
Script: `scripts/test-flows/step-4.6.sh` — chains API calls; passes `TOKEN`, ids from prior responses (needs `jq`, server running).

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

#### Step 5.3 — Archive recordings + storage

**Commit:** `feat(archive): add storage usage, recordings list, and download`

**Test:**
```bash
export BASE=http://localhost:3000/api/v1 TOKEN=<access_token>

curl -H "Authorization: Bearer $TOKEN" $BASE/archive/storage
# → 200, { usedBytes, quotaBytes }

curl -H "Authorization: Bearer $TOKEN" $BASE/archive/recent-sessions
# → 200, recent listen/chat metadata (no full chat text)

curl -H "Authorization: Bearer $TOKEN" "$BASE/archive/recordings?search=Grandma"
# → 200, memberName, versionName, lastBackup, duration, size

curl -H "Authorization: Bearer $TOKEN" $BASE/archive/recordings/<id>/download
# → 200, signed URL or redirect
```

**Flow test:** `npm run test:flow -- 5.3`  
Script: `scripts/test-flows/step-5.3.sh` — chains API calls; passes `TOKEN`, ids from prior responses (needs `jq`, server running).

---

## 15. File / storage layer

### DB
- [ ] Track `size` on all uploaded assets (User, Tree, Member images; Voice files)

### Services
- [ ] `storage.service.ts` — upload, delete, getSignedUrl, computeUserStorage(userId)
- [ ] Enforce per-plan storage limits (from SubscriptionPlan metadata)

#### Step 15 — Storage layer (supporting)

**Commit:** `feat(storage): add upload helper and per-user quota tracking`

**Test:**
```bash
# Upload tree image via POST /trees → response includes url, size, mimeType
# Mongo: sum of Voice.size + image sizes matches GET /archive/storage usedBytes
# Exceed plan quota → 413 or 400 storage limit exceeded
```

**Flow test:** `npm run test:flow -- 15`  
Script: `scripts/test-flows/step-15.sh` — chains API calls; passes `TOKEN`, ids from prior responses (needs `jq`, server running).

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

#### Step 6.3 — Dashboard analytics (optional)

**Commit:** `feat(admin): add optional dashboard analytics endpoint`

**Test:**
```bash
curl -H "Authorization: Bearer $ADMIN_TOKEN" $BASE/admin/analytics
# or existing dashboard path you choose
# → 200, { userCount, activeSubscriptions, revenueMTD }
# Non-admin token → 403
```

**Flow test:** `npm run test:flow -- 6.3`  
Script: `scripts/test-flows/step-6.3.sh` — chains API calls; passes `TOKEN`, ids from prior responses (needs `jq`, server running).

---

## 17. Suggested implementation order

```
Phase 1 — Foundation
  1.1  Model alignment + index.ts exports + migrations
  1.2  Settings auto-create on signup
  1.3  Firebase email verification (replace custom OTP) — §0.3
  1.4  Mongo bcrypt passwords + Firebase password sync on register/change-password — §0.3
  1.5  Session model + Mongo Token/refresh wired to login (devices list)

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
- [x] `activity.service.ts` — audit log helper (§0.2)
- [x] `tree.service.ts`
- [x] `member.service.ts`
- [x] `memberRelationType.service.ts`
- [x] `voice.service.ts`
- [x] `home.service.ts`
- [ ] `chat.service.ts`
- [x] `settings.service.ts`
- [x] `session.service.ts`
- [ ] `twoFactor.service.ts`
- [ ] `credit.service.ts`
- [ ] `billing.service.ts`
- [x] `notification.service.ts` (inbox CRUD)
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
- [x] `tree.controller.ts` — User (`auth()`)
- [x] `member.controller.ts` — User
- [x] `voice.controller.ts` — User
- [ ] `chat.controller.ts` — User
- [ ] `settings.controller.ts` — User
- [ ] `session.controller.ts` — User
- [ ] `billing.controller.ts` — User
- [x] `notificationInbox.controller.ts` — User (inbox)
- [ ] `archive.controller.ts` — User
- [x] `home.controller.ts` — User
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

# Firebase Auth (§0.3) — service account + web SDK (see config.ts / .env.example)
FIREBASE_PROJECT_ID=
FIREBASE_CLIENT_EMAIL=
FIREBASE_PRIVATE_KEY=
FIREBASE_WEB_API_KEY=
FIREBASE_WEB_AUTH_DOMAIN=
FIREBASE_WEB_APP_ID=
# Resend verification rate limit (backend proxy only)
AUTH_RESEND_VERIFICATION_COOLDOWN_SECONDS=60

# Legacy OTP — deprecated; use Firebase email verification (§0.3)
# OTP_EXPIRATION_MINUTES=10
# OTP_RESEND_COOLDOWN_SECONDS=60

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
| Firebase auth sync | [~] Partial — target §0.3 (all providers + verification) |
| Mongo bcrypt passwords | [x] Dual Firebase sync on register + change-password (`applyPasswordChange`) |
| JWT / API tokens | [x] Mongo `Token` linked to `Session` on login/refresh (Step 1.5) |
| Stripe checkout + webhooks | [~] Subscription sync only |
| SubscriptionPlan CRUD | [~] On `/subscriptions/price-plans` + `manageUsers` |
| Auth / roles / routes | [x] **Frozen** — no code or flow refactor (Project rules) |
| Ownership scoping | [ ] Add in new services (`userId` filter) |
| FCM + email queues | [x] |
| Log report / cleanup crons | [x] `config/scheduler.ts` |
| Notification crons (birthday, payment, etc.) | [ ] §13.1 — **not started** |
| Activity logging | [x] Central service + auth/subscription/admin wired (§0.2) |
| Tree/Member/Voice models | [~] Schema only |
| CreditTransaction model | [~] Schema only |
| Settings/Session models | [~] Schema only |

---

---

## 22. Flow test scripts (chained API flows)

> **Requires:** `npm run dev` (or server on `BASE`), `jq`, optional `mongosh` + `MONGODB_URL` for dev email-verify bypass.  
> Scripts live in `scripts/test-flows/` and **chain values** from each response (`TOKEN`, `USER_ID`, `TREE_ID`, etc.).

### Run

```bash
# Single step
npm run test:flow -- 1.3

# All steps (skips unimplemented endpoints gracefully)
npm run test:flow

# Core product smoke (auth → trees → members → home)
npm run test:flow:smoke
```

### Environment variables

| Variable | Use |
|----------|-----|
| `BASE` | API root (default `http://localhost:3000/api/v1`) |
| `TEST_EMAIL` / `TEST_PASSWORD` | Already-verified user for login chains |
| `ADMIN_TOKEN` | Admin/dashboard steps (activities admin, plans, credits) |
| `FIREBASE_ID_TOKEN` | Step 1.3 — after client email verify |
| `MONGODB_URL` | Dev-only: auto-set `isEmailVerified` without Firebase UI |
| `VOICE_SAMPLE_FILE` | Step 2.3 — path to `.wav` for upload |

### Response parsing

API uses `config/response.ts` wrapper:

```json
{ "data": { "attributes": { "user": {} }, "token": { "access": {}, "refresh": {} } } }
```

`lib.sh` extracts: `.data.token.access.token`, `.data.attributes.user.id`, etc.

### Step → script map

| Step | Script | Chained flow |
|------|--------|--------------|
| 0.1 | `step-0.1.sh` | seed relation types → count in Mongo |
| 0.2 | `step-0.2.sh` | register → login → GET activities → admin activities |
| 1.1 | `step-1.1.sh` | typecheck → GET /activities 401 |
| 1.2 | `step-1.2.sh` | register → extract `USER_ID` → assert Settings in Mongo |
| 1.3 | `step-1.3.sh` | register → login blocked → resend → verify → login → `TOKEN` |
| 1.4 | `step-1.4.sh` | register → login → change-password → login new password |
| 1.5 | `step-1.5.sh` | login → refresh-tokens → GET devices |
| 2.1 | `step-2.1.sh` | login → CRUD tree → duplicate → delete |
| 2.2 | `step-2.2.sh` | relation types → create tree → create member → favorite |
| 2.3 | `step-2.3.sh` | member → list voices → upload → set default |
| 2.4 | `step-2.4.sh` | GET /home favorites + recentlyUsed |
| 3.1 | `step-3.1.sh` | list plans → admin create plan |
| 3.2 | `step-3.2.sh` | credits balance → history → admin adjust |
| 3.3 | `step-3.3.sh` | billing overview → payment methods → history |
| 3.4 | `step-3.4.sh` | subscriptions/me → upgrade → cancel |
| 4.1 | `step-4.1.sh` | share tree → inbox → accept/read |
| 4.2 | `step-4.2.sh` | GET/PATCH notification settings |
| 4.3–4.6 | `step-4.3.sh` … | notification cron jobs |
| 5.1 | `step-5.1.sh` | POST /chat → text + audioUrl |
| 5.2 | `step-5.2.sh` | credits before/after chat |
| 5.3 | `step-5.3.sh` | archive storage → recordings |
| 6.1–6.3 | `step-6.1.sh` … | 2FA, devices, admin analytics |
| 9 | `step-9.sh` | GET/PATCH /users/me |
| 15 | `step-15.sh` | upload → storage quota |

Unimplemented endpoints return 404/501 → script prints `SKIP` (not a failure).

### Add a script for a new step

1. Copy `scripts/test-flows/step-1.3.sh` as template
2. `source lib.sh` — use `ensure_verified_user_session`, `api_auth_json`, `extract`
3. Register in `§22` table + step **Flow test** line in this doc

---

## 21. Step checklist — Commit & Test (quick reference)

Paste tests in terminal or chat. Replace `<access_token>`, ids, and passwords. **Prefer flow scripts:** `npm run test:flow -- <step>`.

| Step | Commit | Quick test | Flow script |
|------|--------|------------|-------------|
| **0.2** ✅ | `feat(activity): centralize audit logging for user, subscription, and admin actions` | `GET /activities` (user); `GET /activities/admin?type=admin_action` (admin) |
| **0.1** ✅ | `chore: add migrations and seed member relation types` | `npm run seed:relation-types` → 13 relation types in Mongo | `npm run test:flow -- 0.1` |
| **1.1** ✅ | `feat(models): align Eternous schemas and export all models` | `npm run typecheck`; `GET /activities` → 401 without token |
| **1.2** ✅ | `feat(auth): create default Settings on user registration` | Register user → `db.settings.findOne({ userId })` exists |
| **1.3** ✅ | `feat(auth): use Firebase email verification instead of custom OTP` | Unverified email → 400; after Firebase verify → login + Mongo JWT |
| **1.4** ✅ | `feat(auth): sync encrypted Mongo passwords with Firebase on register and change-password` | bcrypt in Mongo; change-password updates Firebase + Mongo; refresh tokens revoked | `npm run test:flow -- 1.4` |
| **1.5** ✅ | `feat(auth): track login sessions and link refresh tokens in Mongo` | Login twice → sessions + Token docs; refresh from Mongo; GET devices | `npm run test:flow -- 1.5` |
| **2.1** ✅ | `feat(trees): add tree CRUD, duplicate, and default tree` | CRUD `/trees`; one `isDefault` per user | `npm run test:flow -- 2.1` |
| **2.2** ✅ | `feat(members): add member CRUD and relation type list` | `GET /member-relation-types`; CRUD members in tree | `npm run test:flow -- 2.2` |
| **2.3** ✅ | `feat(voices): add voice upload, list, and default selection` | Upload voice; `PATCH .../default` updates member | `npm run test:flow -- 2.3` |
| **2.4** ✅ | `feat(home): add favorites and recently used members` | `GET /home` → `{ favorites, recentlyUsed }` | `npm run test:flow -- 2.4` |
| **3.1** ✅ | `feat(subscriptions): add plan credits and idempotent Stripe webhooks` | Plans show `credits`; webhook replay → grant once | `npm run test:flow -- 3.1` |
| **3.2** ✅ | `feat(credits): add credit balance, ledger, and admin adjust` | `GET /users/me/credits`; admin adjust updates balance | `npm run test:flow -- 3.2` |
| **3.3** ✅ | `feat(billing): add overview, payment methods, and history` | `GET /billing/overview`, `/payment-methods`, `/history` | `npm run test:flow -- 3.3` |
| **3.4** ✅ | `feat(subscriptions): add upgrade and cancel for own plan` | `POST /subscriptions/upgrade`; `PATCH .../cancel` | `npm run test:flow -- 3.4` |
| **4.1** ✅ | `feat(notifications): add inbox and tree share accept/decline` | Share tree → inbox → accept/decline | `npm run test:flow -- 4.1` |
| **4.2** ✅ | `feat(settings): add notification preferences endpoints` | `GET/PATCH /users/me/settings/notifications` | `npm run test:flow -- 4.2` |
| **4.3** ✅ | `chore(notifications): register cron scheduler and job dedup log` | Server start logs schedulers; dedup on second run | `npm run test:flow -- 4.3` |
| **4.4** ✅ | `feat(notifications): add birthday and anniversary cron jobs` | `test:notification-crons birthday` → notification | `npm run test:flow -- 4.4` |
| **4.5** ✅ | `feat(notifications): add payment and credits-low cron jobs` | Renewal + credits-low crons fire expected types | `npm run test:flow -- 4.5` |
| **4.6** ✅ | `feat(notifications): add monthly backup-ready notification` | `test:notification-crons backup-ready` | `npm run test:flow -- 4.6` |
| **5.1** ✅ | `feat(chat): add ephemeral chat proxy with voice selection` | `POST /chat` → text + audioUrl; no chat DB docs | `npm run test:flow -- 5.1` |
| **5.2** ✅ | `feat(credits): deduct credits atomically on chat` | Balance drops; 0 credits → error | `npm run test:flow -- 5.2` |
| **5.3** ✅ | `feat(archive): add storage usage, recordings list, and download` | `GET /archive/storage`, `/recordings`, download URL | `npm run test:flow -- 5.3` |
| **6.1** ✅ | `feat(security): add two-factor authentication endpoints` | Enable → verify → disable 2FA | `npm run test:flow -- 6.1` |
| **6.2** ✅ | `feat(security): add device list and session revoke` | List devices; revoke one / all | `npm run test:flow -- 6.2` |
| **6.3** ✅ | `feat(admin): add optional dashboard analytics endpoint` | Admin analytics → 200; user → 403 | `npm run test:flow -- 6.3` |
| **9** ✅ | `feat(users): extend profile endpoint with credits and subscription` | `GET /users/me` includes credits + plan | `npm run test:flow -- 9` |
| **15** ✅ | `feat(storage): add upload helper and per-user quota tracking` | `GET /archive/storage` returns usedBytes + quota | `npm run test:flow -- 15` |

**Always before commit:** `npm run typecheck` (and `npm run test` when tests exist for that step).

---

*Last updated: 2026-06-19 — §22: flow test scripts; §0.3: Firebase identity + Mongo passwords/tokens.*
