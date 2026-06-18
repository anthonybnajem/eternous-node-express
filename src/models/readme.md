# Models Documentation

This folder contains all MongoDB/Mongoose models used by the backend.

The app is built around users, family trees, members, voice versions, subscriptions, payments, credits, notifications, settings, sessions, and activity tracking.

## Current Model Files


payment.model.ts
subscriptionPlan.model.ts
activity.model.ts
plugins/
creditTransaction.model.ts
token.model.ts
index.ts
readme.md
tree.model.ts
member.model.ts
session.model.ts
user.model.ts
memberRelationType.model.ts
settings.model.ts
voice.model.ts
notification.model.ts
subscription.model.ts


---

# Main Database Structure

The main relationship is:


User
 ├── Settings
 ├── Sessions
 │    └── Tokens
 ├── Trees
 │    └── Members
 │         ├── MemberRelationType
 │         └── Voices
 ├── Subscription
 │    └── SubscriptionPlan
 ├── Payments
 ├── CreditTransactions
 ├── Notifications
 └── Activities


In simple words:


A user owns trees.
A tree contains members.
A member can have multiple voice versions.
A user can subscribe to a plan.
A plan gives credits.
Credits are tracked using CreditTransaction.
Sessions track logged-in devices.
Tokens handle authentication.
Settings store user preferences.
Notifications alert the user.
Activities log important actions.


---

# 1. `user.model.ts`

## Purpose

The `User` model stores the main account information.

It is the central model of the app. Almost every other model connects back to the user.

## Main Data Stored


fullName
email
password
image
authProvider
authProviderId
firebaseUid
role
phoneNumber
address
dateOfBirth
verification flags
account status flags
currentSubscription
subscriptions
creditBalance


## Why We Need It

The user model is needed for:


signup
login
social login
profile management
role-based access
subscription ownership
credit ownership
security checks


## Connected Models


User -> Tree
User -> Member
User -> Voice
User -> Session
User -> Token
User -> Settings
User -> Subscription
User -> Payment
User -> CreditTransaction
User -> Notification
User -> Activity


## Important Notes

The user should have:


currentSubscription
subscriptions
creditBalance


`currentSubscription` is a shortcut for fast access.

The real subscription history is stored in `subscription.model.ts`.

`creditBalance` is a shortcut for the current balance.

The real credit history is stored in `creditTransaction.model.ts`.

---

# 2. `settings.model.ts`

## Purpose

The `Settings` model stores user-specific app and security settings.

Each user should have exactly one settings document.

## Main Data Stored


userId
applicationLock
newMessagesLock
billingEmail
twoFactorEnabled
verified
notificationsEnabled
birthdayNotificationsEnabled
paymentNotificationsEnabled
metadata


## Why We Need It

Settings should not be stored directly inside the `User` model because settings can grow over time.

This model is cleaner for:


privacy settings
notification settings
billing email
two-factor authentication
security preferences
app lock preferences


## Relationship


User._id -> Settings.userId


## Important Rule

After signup, create default settings automatically.

Example:

ts
await Settings.findOneAndUpdate(
  { userId: user._id },
  {
    $setOnInsert: {
      userId: user._id,
      billingEmail: user.email,
      applicationLock: false,
      newMessagesLock: false,
      twoFactorEnabled: false,
      verified: false,
      notificationsEnabled: true,
      birthdayNotificationsEnabled: true,
      paymentNotificationsEnabled: true,
    },
  },
  {
    upsert: true,
    new: true,
  }
);


---

# 3. `session.model.ts`

## Purpose

The `Session` model tracks logged-in devices.

This is needed because the app supports:


show logged-in devices
logout from one device
logout from all devices
track active sessions
security dashboard


## Main Data Stored


userId
deviceName
deviceType
userAgent
ipAddress
loggedInAt
lastActiveAt
isActive
revokedAt


## Relationship


User._id -> Session.userId
Session._id -> Token.sessionId


## Why We Need It

Without a `Session` model, you can only manage tokens.

With a `Session` model, you can show real devices in the dashboard.

Example:


Chrome on MacBook
iPhone App
Android App
Safari Browser


## Logout One Device


1. Set Session.isActive = false
2. Set Session.revokedAt = current date
3. Blacklist all tokens connected to this session


## Logout All Devices


1. Set all user sessions isActive = false
2. Set revokedAt for all sessions
3. Blacklist all user refresh tokens


---

# 4. `token.model.ts`

## Purpose

The `Token` model stores auth-related tokens.

## Main Data Stored


token
user
type
expires
blacklisted
sessionId
userAgent
ipAddress


## Token Types


refresh token
reset password token
verify email token


## Why We Need It

This model is needed for:


JWT refresh tokens
logout
blacklisting tokens
reset password
verify email
token expiration


## Relationship


User._id -> Token.user
Session._id -> Token.sessionId


## Important Note

`Token` and `Session` are different.


Session = device/login record
Token = authentication token


The recommended structure is:


User -> Session -> Token


---

# 5. `tree.model.ts`

## Purpose

The `Tree` model stores family trees.

A user can have one or many trees.

## Main Data Stored


userId
name
image
backgroundImage
description
isDefault
isDeleted


## Why We Need It

The app is built around family trees.

A tree groups members together.

Example:


Anthony Family Tree
Mother Side Tree
Father Side Tree


## Relationship


User._id -> Tree.userId
Tree._id -> Member.treeId


## Soft Delete

`isDeleted` is useful because you may not want to permanently delete a tree and all its members immediately.

---

# 6. `member.model.ts`

## Purpose

The `Member` model stores people inside a family tree.

## Main Data Stored


userId
name
bio
customGreetings
relatedToMemberId
treeId
image
memberRelationTypeId
nickname
isFavorite
lastTimeUsed
defaultVoiceId


## Why We Need It

A member represents a person in the user’s family tree.

Example:


Father
Mother
Grandfather
Grandmother
Brother
Sister
Friend


## Relationship


User._id -> Member.userId
Tree._id -> Member.treeId
Member._id -> Member.relatedToMemberId
MemberRelationType._id -> Member.memberRelationTypeId
Voice._id -> Member.defaultVoiceId


## Important Notes

`relatedToMemberId` points to another member.

Example:


John is related to Mary
Mary is related to George


`memberRelationTypeId` says what the relation is.

Example:


father
mother
son
daughter
brother
sister


`defaultVoiceId` is optional.

The real voice history is stored in `voice.model.ts`.

---

# 7. `memberRelationType.model.ts`

## Purpose

The `MemberRelationType` model stores the allowed relationship types.

## Main Data Stored


name
slug
description
sortOrder
active
metadata


## Example Data


Father
Mother
Son
Daughter
Brother
Sister
Grandfather
Grandmother
Uncle
Aunt
Cousin
Friend


## Why We Need It

This keeps relation types clean and controlled.

Instead of typing random strings inside every member, the app references a predefined relation type.

## Relationship


MemberRelationType._id -> Member.memberRelationTypeId


## Example

json
{
  "name": "Father",
  "slug": "father",
  "sortOrder": 1,
  "active": true
}


---

# 8. `voice.model.ts`

## Purpose

The `Voice` model stores voice versions for each member.

Each member can have multiple voice versions.

## Main Data Stored


userId
memberId
name
uploadUrl
voiceUrl
versionNumber
size
duration
status
isDefault
backupId
backupDate
metadata


## Why We Need It

A member may upload or generate multiple voice versions.

Example:


Member: Grandfather

Voice version 1
Voice version 2
Voice version 3


## Relationship


User._id -> Voice.userId
Member._id -> Voice.memberId


## Version Logic

Each member has voice versions:


versionNumber: 1
versionNumber: 2
versionNumber: 3


The version number should be unique per member.

Recommended index:

ts
voiceSchema.index({ memberId: 1, versionNumber: 1 }, { unique: true });


## Voice Selection Logic

When generating audio:


1. If request sends voiceId, use that voice.
2. Else if request sends versionNumber, use that version.
3. Else if a default voice exists, use it.
4. Else use latest ready voice version.


## Important Note

You do not need `isActive`.

A user can choose any voice version from the request.

Usually the latest ready voice is used by default unless the user manually chooses another default voice.

---

# 9. `subscriptionPlan.model.ts`

## Purpose

The `SubscriptionPlan` model stores available plans.

## Main Data Stored


name
slug
description
priceId
currency
amount
credits
interval
trialDays
features
active
sortOrder
metadata


## Why We Need It

Plans are what users can buy.

Example:


Basic Plan
Pro Plan
Premium Plan


## Example

json
{
  "name": "Pro",
  "slug": "pro",
  "priceId": "price_123",
  "currency": "usd",
  "amount": 2900,
  "credits": 500,
  "interval": "month",
  "active": true
}


## Relationship


SubscriptionPlan._id -> Subscription.plan
SubscriptionPlan._id -> CreditTransaction.subscriptionPlanId


## Important Note

`priceId` should match Stripe Price ID.

The `credits` field defines how many credits the user receives from the plan.

---

# 10. `subscription.model.ts`

## Purpose

The `Subscription` model stores the user’s subscription.

## Main Data Stored


user
plan
name
provider
status
startedAt
endsAt
trialEndsAt
canceledAt
externalCustomerId
externalSubscriptionId
externalPriceId
metadata


## Why We Need It

This model stores subscription history and current subscription status.

## Relationship


User._id -> Subscription.user
SubscriptionPlan._id -> Subscription.plan
Subscription._id -> Payment.subscriptionId
Subscription._id -> CreditTransaction.subscriptionId


## Subscription Status Examples


active
trial
inactive
past_due
canceled
unpaid


## Important Note

`User.currentSubscription` is only a shortcut.

The real source of truth is the `Subscription` collection.

---

# 11. `payment.model.ts`

## Purpose

The `Payment` model stores payment records.

## Main Data Stored


userId
subscriptionId
provider
providerPaymentId
providerCustomerId
providerSubscriptionId
amount
currency
status
paidAt
refundedAt
metadata


## Why We Need It

Payments are needed for billing history, Stripe webhook tracking, admin dashboard, invoices, and refunds.

## Relationship


User._id -> Payment.userId
Subscription._id -> Payment.subscriptionId


## Example Usage

When Stripe sends a webhook:


payment_intent.succeeded
invoice.paid
charge.refunded


The backend can create or update a Payment record.

## Important Note

Stripe can retry webhooks.

So payment logic should be idempotent.

Do not create duplicate payments for the same Stripe payment ID.

---

# 12. `creditTransaction.model.ts`

## Purpose

The `CreditTransaction` model stores every credit movement.

This is the wallet ledger of the app.

## Main Data Stored


userId
amount
balanceAfter
type
status
description
subscriptionId
subscriptionPlanId
paymentIntentId
invoiceId
memberId
voiceId
voiceGenerationId
createdBy
idempotencyKey
metadata


## Why We Need It

Do not only store credits as a number on the user.

If you only store:


user.creditBalance = 100


you will not know:


why credits changed
when credits changed
which payment added credits
which generation consumed credits
who manually adjusted credits
whether Stripe webhook added credits twice


`CreditTransaction` gives full history.

## Relationship


User._id -> CreditTransaction.userId
Subscription._id -> CreditTransaction.subscriptionId
SubscriptionPlan._id -> CreditTransaction.subscriptionPlanId
Member._id -> CreditTransaction.memberId
Voice._id -> CreditTransaction.voiceId


## Positive and Negative Amounts

Positive amount means credits were added:


+100 subscription_grant
+20 bonus
+10 refund


Negative amount means credits were consumed or removed:


-5 voice_generation
-10 expiration


## Transaction Types


purchase
subscription_grant
voice_generation
refund
admin_adjustment
bonus
expiration
reversal


## Important Rule

Always create a `CreditTransaction` whenever credits change.

## Source of Truth


CreditTransaction = full source of truth
User.creditBalance = fast current balance


## Stripe Idempotency

Use an idempotency key to prevent adding credits twice.

Example:


stripe_invoice_<invoiceId>_credits


---

# 13. `notification.model.ts`

## Purpose

The `Notification` model stores notifications for users.

## Main Data Stored


receiverId
title
message
image
linkId
type
viewStatus
metadata


## Why We Need It

Notifications are needed for:


birthday reminders
payment updates
subscription updates
voice processing status
system messages
tree/member updates


## Relationship


User._id -> Notification.receiverId


## Notification Types

Recommended types:


birthday
payment
subscription
member
tree
voice
system


## Read/Unread

`viewStatus` can be used as read status.


false = unread
true = read


---

# 14. `activity.model.ts`

## Purpose

The `Activity` model stores user activity logs.

## Main Data Stored


user
type
description
ipAddress
userAgent
metadata


## Why We Need It

Activity logs are useful for:


security dashboard
admin dashboard
audit logs
debugging user actions
tracking important events


## Relationship


User._id -> Activity.user


## Activity Types

Examples:


login
logout
register
update_profile
password_change
payment
subscription
member_created
member_updated
tree_created
voice_uploaded
other


## Example

json
{
  "user": "user_id",
  "type": "login",
  "description": "User logged in from Chrome",
  "ipAddress": "127.0.0.1",
  "userAgent": "Chrome on macOS"
}


---

# 15. `index.ts`

## Purpose

The `index.ts` file exports all models from one place.

Instead of importing models like this:

ts
import User from './user.model.js';
import Settings from './settings.model.js';


You can import from one place:

ts
import { User, Settings, Member, Tree } from '../models/index.js';


## Example Exports

ts
export { default as User } from './user.model.js';
export { default as Token } from './token.model.js';
export { default as Session } from './session.model.js';
export { default as Settings } from './settings.model.js';
export { default as Tree } from './tree.model.js';
export { default as Member } from './member.model.js';
export { default as MemberRelationType } from './memberRelationType.model.js';
export { default as Voice } from './voice.model.js';
export { default as SubscriptionPlan } from './subscriptionPlan.model.js';
export { default as Subscription } from './subscription.model.js';
export { default as Payment } from './payment.model.js';
export { default as CreditTransaction } from './creditTransaction.model.js';
export { default as Notification } from './notification.model.js';
export { default as Activity } from './activity.model.js';


---

# 16. `plugins/`

## Purpose

The `plugins/` folder contains reusable Mongoose plugins.

Common plugins:


toJSON
paginate


## `toJSON`

Used to clean model output.

Usually removes:


__v
private fields
password


It can also convert `_id` to `id`.

## `paginate`

Used for pagination in list APIs.

Example:


GET /members?page=1&limit=10
GET /notifications?page=1&limit=20


---

# 17. `readme.md`

## Purpose

This file documents all models, relationships, and the reason each model exists.

It helps developers understand the backend structure quickly.

---

# Main Flows

## Signup Flow


1. User signs up.
2. Create User.
3. Create default Settings.
4. Create Session.
5. Create Token.
6. Return access token and refresh token.


Connected models:


User
Settings
Session
Token
Activity


---

## Login Flow


1. User logs in.
2. Create Session.
3. Create refresh Token linked to Session.
4. Update User.lastLogin.
5. Create Activity log.


Connected models:


User
Session
Token
Activity


---

## Create Tree Flow


1. User creates tree.
2. Create Tree with userId.
3. Members can now be added to this tree.


Connected models:


User
Tree


---

## Create Member Flow


1. User selects tree.
2. User creates member.
3. Member references treeId.
4. Member can optionally reference relatedToMemberId.
5. Member can optionally reference memberRelationTypeId.


Connected models:


User
Tree
Member
MemberRelationType


---

## Upload Voice Flow


1. User selects member.
2. User uploads/generates voice.
3. Backend checks latest versionNumber for this member.
4. New Voice is created with versionNumber + 1.
5. If no default voice exists, latest ready voice becomes fallback default by query.


Connected models:


User
Member
Voice


---

## Generate Audio Flow


1. User requests generation for a member.
2. Backend selects voice:
   - exact voiceId if provided
   - exact versionNumber if provided
   - default voice if exists
   - latest ready voice otherwise
3. Backend checks user creditBalance.
4. Deduct credits.
5. Create CreditTransaction.
6. Generate audio.


Connected models:


User
Member
Voice
CreditTransaction


---

## Subscription Payment Flow


1. User chooses SubscriptionPlan.
2. Stripe checkout/payment starts.
3. Stripe webhook confirms payment.
4. Create or update Subscription.
5. Create Payment record.
6. Add credits to User.creditBalance.
7. Create CreditTransaction with positive amount.


Connected models:


User
SubscriptionPlan
Subscription
Payment
CreditTransaction


---

## Logout One Device Flow


1. User selects a device/session.
2. Set Session.isActive = false.
3. Set Session.revokedAt.
4. Blacklist all Tokens for that sessionId.


Connected models:


User
Session
Token


---

## Logout All Devices Flow


1. Set all user Sessions isActive = false.
2. Set revokedAt for all sessions.
3. Blacklist all user refresh Tokens.


Connected models:


User
Session
Token


---

# Professional Rules

## 1. Do not duplicate source of truth

Use shortcuts only for performance.

Examples:


User.creditBalance = shortcut
CreditTransaction = source of truth

User.currentSubscription = shortcut
Subscription = source of truth

Member.defaultVoiceId = shortcut
Voice = source of truth


---

## 2. Always use transactions for credits

Credit deduction should be atomic:


check balance
deduct balance
create credit transaction


These should happen together.

---

## 3. Stripe webhooks must be idempotent

Stripe can send the same webhook more than once.

Use unique fields like:


paymentIntentId
invoiceId
idempotencyKey


---

## 4. Sessions should control device logout

Do not only delete tokens.

Use:


Session.isActive
Session.revokedAt
Token.blacklisted


---

## 5. Voice versions should not overwrite each other

Each new voice upload should create a new version.

Do not overwrite old voices.

Use:


memberId + versionNumber unique


---

# Final Summary

The backend currently has these model groups:

## Authentication and Security


User
Session
Token
Settings
Activity


## Family Tree System


Tree
Member
MemberRelationType
Voice


## Billing and Credits


SubscriptionPlan
Subscription
Payment
CreditTransaction


## Communication


Notification


## Shared Infrastructure


plugins
index.ts
readme.md


