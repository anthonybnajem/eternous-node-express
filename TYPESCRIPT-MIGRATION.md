# TypeScript Migration Notes

This version is not only a `` → `.ts` rename. It includes a real TypeScript typing pass across the backend.

## What was typed

- Express controllers with typed params, request bodies, query objects, and `Response` return flow.
- Auth request bodies: register, login, forgot password, reset password, change password, verify email, delete account.
- User request params and bodies: `userId`, NID request bodies, update user bodies, user filter query.
- Payment request params and bodies: Stripe payment intent ID params, refund body, webhook signature handling.
- Notification request bodies: email, push, multicast, topic subscribe/unsubscribe payloads.
- Mongoose models with interfaces and hydrated document types:
  - User
  - Token
  - Payment
  - Notification
  - Activity
  - Terms
  - Privacy
  - About
- Mongoose statics/plugins:
  - `User.isEmailTaken`
  - `User.isPhoneNumberTaken`
  - `Model.paginate`
  - `toJSON`
- Services with typed function params and return values for auth, users, tokens, static pages, Stripe, Firebase FCM, queues, email helpers, and reports.
- Middlewares with `Request`, `Response`, `NextFunction`, `RequestHandler`, and multer file types.
- Utilities including `ApiError`, `catchAsync`, `pick`, socket helper, image unlink helper, and user status helper.
- Config helpers including Redis, MongoDB, Passport JWT, Prometheus metrics, Swagger, Morgan, scheduler, and server bootstrap.

## Recommended install

```bash
npm install --legacy-peer-deps
npm run typecheck
npm run dev
```

`--legacy-peer-deps` is recommended because the original JavaScript boilerplate uses older ESLint/Jest peer dependency ranges.

## Important note

Some business-level behavior was left unchanged. For example, the existing backend has placeholder/legacy areas like refresh tokens, interest list, and some report/scheduler logic. Those are typed, but the business logic should still be reviewed before production.
