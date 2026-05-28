# Profile Modal, Online Status, Captcha & Anti-Multi-Account

## Overview

Four features to improve UX and security:
1. **ProfileModal** — reusable modal to view any user's full profile from anywhere (Discover, Matches, Chat, Crossings)
2. **Online status in Matches** — show last-active indicator ("En ligne" / "Vu il y a X min") on match cards
3. **Cloudflare Turnstile** — invisible captcha on login & register
4. **Anti-multi-account** — email normalization, mandatory email verification, device-based soft limit

---

## 1. ProfileModal

### Component

`src/components/ProfileModal.tsx` — client component.

**Props:**
- `userId: string`
- `open: boolean`
- `onClose: () => void`

**Behavior:**
- When `open` becomes true, fetches `GET /api/users/[id]` (already exists)
- Shows a centered modal overlay with:
  - Photo carousel or grid (first photo large, rest in thumbnails)
  - Display name, age, verified badge
  - Bio
  - Tags: gender identity, orientation, interests, practices
  - Online status: green dot + "En ligne" or "Vu il y a X"
  - Action buttons: "Like" (if not already liked), "Discuter" (if matched/conversation exists)
- Clicking outside or pressing Escape closes the modal
- Loading skeleton while fetching
- Error state if user not found

**Usage sites:**
- Discover page: click on any profile card avatar/name
- Matches page: click on match card
- Chat page: click on other user's avatar in header
- Crossings page: click on profile card
- Nearby page: click on profile card

### API changes

No API changes needed — `GET /api/users/[id]` already returns the full profile with `lastActive`.

---

## 2. Online Status in Matches

### API changes

`GET /api/matches` — add `lastActive` and `isVerified` to the other user object in the response.

### Matches page

Each match card shows:
- Green dot + "En ligne" if `lastActive` < 15 min ago
- "Vu il y a X min/heures/jours" otherwise
- Reuse existing `OnlineIndicator` component

### Helper function

`src/lib/time.ts` — `formatLastSeen(date: Date): string`:
- < 15 min → "En ligne"
- < 60 min → "Vu il y a X min"
- < 24h → "Vu il y a X h"
- < 7d → "Vu il y a X j"
- else → date formatted as locale date

---

## 3. Cloudflare Turnstile

### Setup

- Install `@marsidev/react-turnstile` (React wrapper)
- Env vars: `NEXT_PUBLIC_TURNSTILE_SITE_KEY`, `TURNSTILE_SECRET_KEY`
- Turnstile widget in "managed" mode (invisible by default, shows challenge only when suspicious)

### Register page

Add `<Turnstile>` component inside the form. On submit, include `turnstileToken` in the POST body.

### Login page

Same — add `<Turnstile>` inside the form, send token with credentials.

### Server-side verification

`src/lib/turnstile.ts`:
- `verifyTurnstile(token: string, ip?: string): Promise<boolean>`
- POST to `https://challenges.cloudflare.com/turnstile/v0/siteverify` with secret + token
- Return `success` field from response

### API route changes

- `/api/auth/register`: verify Turnstile token before processing registration
- `/api/auth/[...nextauth]`: verify Turnstile token in the Credentials authorize callback (only when `turnstileToken` is present in the credentials)

---

## 4. Anti-Multi-Account

### 4a. Email normalization (Gmail-specific)

`src/lib/email.ts`:
- `normalizeEmail(email: string): string`
- Lowercase the whole email
- Strip everything from `+` to `@` in the local part (e.g., `user+tag@gmail.com` → `user@gmail.com`)
- Remove dots from local part for Gmail addresses (e.g., `u.s.e.r@gmail.com` → `user@gmail.com`)
- Normalize Googlemail subdomains (`user@googlemail.com` → `user@gmail.com`)
- Store the original email as-is, but check uniqueness against the normalized version

**Schema change:** Add `normalizedEmail String @unique` to User model. Migration required.

**Register flow:**
1. Receive `email`
2. Compute `normalizeEmail(email)`
3. Check if `normalizedEmail` already exists → 409 conflict
4. Store both `email` (original) and `normalizedEmail`

**Login flow:**
1. Normalize the input email
2. Find user by `normalizedEmail` (not `email`)
3. Compare password

### 4b. Mandatory email verification

**Schema change:** Add `emailVerified DateTime?` to User model.

**Register flow:**
1. After creating user, generate a verification token (signed JWT with `{ userId, email, exp: 24h }`)
2. Send email via a `POST /api/auth/send-verification` endpoint
3. For now, log the verification URL to console (email sending will be added later with a provider)

**New endpoint:** `GET /api/auth/verify-email?token=...`
- Verify JWT signature and expiry
- Set `emailVerified` to `now()` on the user
- Redirect to `/login?verified=true`

**Login flow:**
- In Credentials authorize: if `emailVerified` is null, throw "Veuillez verifier votre email avant de vous connecter"
- This error is displayed on the login page

**Resend verification:** Add a "Renvoyer l'email" link on the login page when the error is about unverified email.

### 4c. Device-based soft limit

**Client-side:**
- On register form load, check `localStorage` for `libre_device_id`
- If not found, generate a UUID and store it
- Include `deviceId` in the register POST body

**Server-side:**
- Add `deviceId String?` to User model (optional, not unique — multiple users can share a device in edge cases)
- On registration, if `deviceId` is provided:
  - Count existing users with this `deviceId`
  - If count >= 2, return 403: "Nombre maximum de comptes atteint sur cet appareil"
  - Otherwise, store `deviceId` on the new user

**Why not unique constraint on deviceId?** Because legitimate scenarios exist (shared family device, public computer). A soft limit of 2 is reasonable.

---

## Implementation Order

1. ProfileModal + online status (UX improvement, no security dependency)
2. Email normalization (prerequisite for verification)
3. Email verification (blocks bots that use disposable emails)
4. Turnstile captcha (blocks automated bots)
5. Device-based soft limit (additional bot mitigation)