# Security Design: Billing MVP (Stripe)

**Spec**: 107-billing-mvp
**Date**: 2026-02-14

## 1. Authentication & Authorization

### 1.1. Client-Side Access Control (Firestore Rules)
- **Billing Data** (`users/{uid}/billing/{docId}`):
  - `read`: Allowed for **Owner** (`request.auth.uid == uid`).
  - `write`: **Denied for everyone** (Server-side modification only).
- **Limits Data** (`users/{uid}/limits/{docId}`):
  - `read`: Allowed for **Owner**.
  - `write`: **Denied for everyone**.
- **Admin Access**:
  - Admins cannot read other users' billing data via Client SDK.
  - Admin Dashboard uses **Cloud Functions** (`adminGetUserBillingStatuses`) which uses Admin SDK to bypass rules.

### 1.2. Cloud Functions Access Control
- **Public Functions**:
  - `handleStripeWebhook`: Public HTTP endpoint. Security relies on **Signature Verification** (see 2.1).
- **Authenticated Functions** (`onCall`):
  - `createCheckoutSession`: Requires `auth`. Created for `context.auth.uid`.
  - `createPortalSession`: Requires `auth`. Restricted to `context.auth.uid`.
  - `joinAsUchideshi`: Requires `auth`. Validates **Token** (see 3.1).
- **Admin Functions** (`onCall`):
  - `adminGetUserBillingStatuses`: Requires `admin` credential (verified via `lib/adminAuth`).
  - `setUchideshiFree`: Requires `admin` credential.
  - `adminSetMaxGroups`: Requires `admin` credential.

## 2. Payment Security (Stripe)

### 2.1. Webhook Verification
- **Endpoint**: `https://.../handleStripeWebhook`
- **Mechanism**:
  - Verify `Stripe-Signature` header using `stripe.webhooks.constructEvent`.
  - Use `STRIPE_WEBHOOK_SECRET` stored in `functions/.env`.
  - **Raw Body** must be preserved for verification.
- **Why**: Prevents spoofed webhook events from malicious actors.

### 2.2. Checkout Session
- **Mode**: `subscription`
- **Customer Creation**:
  - If `stripeCustomerId` exists in Firestore, reuse it.
  - If not, create new Customer in Stripe and save ID to Firestore.
  - **Prevents duplicate customers** for the same Firebase UID.
- **Metadata**:
  - Attach `firebaseUid` to Stripe Customer metadata for cross-reference.

### 2.3. Idempotency
- **Event Handling**:
  - Stripe may send the same webhook event multiple times.
  - **Solution**: (Optional for MVP but recommended) Store processed `eventId` in `system/stripe_events/{eventId}` or rely on idempotent updates (e.g., `status='ACTIVE'` is safe to repeat).
  - MVP Decision: **Idempotent logic preferred**. e.g. Setting `trialEndsAt` or `status` is idempotent.

## 3. High-Value Action Protection

### 3.1. Uchideshi Entry (Token)
- **Risk**: Unauthorized users gaining "Lifetime Free" status.
- **Mechanism**:
  - Client sends `token` string to `joinAsUchideshi`.
  - Server compares with `UCHIDESHI_TOKEN` environment variable.
  - **Rate Limiting**: Not explicitly planned for MVP, but standard Firebase quotas apply.
  - **Rotation**: If leaked, Admin changes env var.

### 3.2. Group Creation Limit
- **Mechanism**: Enforced in `createGroup` function (Server-side).
- **Check**: Count `groups` where `ownerUserId == uid` AND `status == 'active'`.
- **Logic**: `count >= user.limits.maxGroups` (default 2) → Reject.
- **Bypass**: Do NOT trust client-side counts.

## 4. Enforcement of Billing Status

### 4.1. "Hard" vs "Soft" Locks
- **Soft Lock (Client)**: `BillingGuard` redirects `PAST_DUE` users away from `KyogiPage` / `KeikoPage`.
- **Hard Lock (Server)**:
  - `submitOfficialSession` (Spec 101/US3): Must verify `derivedBillingStatus != 'PAST_DUE'`.
  - **Action**: Add check to `submitOfficialSession.ts`.

## 5. Data Privacy
- **PII**: Do NOT store Credit Card numbers in Firestore. Only store `last4` or `brand` if needed (available from Stripe API, but not required for MVP).
- **Stripe Link**: Use `createPortalSession` for user-managed billing (update card, cancel). We do not build UI for this.

## 6. Environment Variables
Stored in `functions/.env` (not committed to git):
- `STRIPE_SECRET_KEY`
- `STRIPE_WEBHOOK_SECRET`
- `STRIPE_PRICE_ID`
- `UCHIDESHI_TOKEN`
