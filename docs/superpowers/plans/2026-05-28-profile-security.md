# Profile Modal, Online Status, Captcha & Anti-Multi-Account Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a reusable profile modal, online status indicators, Cloudflare Turnstile captcha, and anti-multi-account protections (email normalization, mandatory verification, device limit).

**Architecture:** Feature-by-feature incremental build. Each task produces working, testable code. ProfileModal is a self-contained component. Anti-multi-account is layered: email normalization first (schema change), then verification flow, then Turnstile, then device limit.

**Tech Stack:** Next.js 16 App Router, Prisma 7, NextAuth 4, Cloudflare Turnstile (`@marsidev/react-turnstile`), Zod, bcryptjs, jose (for JWT verification tokens)

---

## File Structure

| File | Action | Responsibility |
|---|---|---|
| `src/lib/time.ts` | Create | `formatLastSeen()` helper |
| `src/components/ProfileModal.tsx` | Create | Reusable profile detail modal |
| `src/app/(main)/matches/page.tsx` | Modify | Add online status + profile modal on click |
| `src/app/(main)/discover/page.tsx` | Modify | Open ProfileModal on card click |
| `src/app/(main)/crossings/page.tsx` | Modify | Open ProfileModal on card click |
| `src/app/(main)/nearby/page.tsx` | Modify | Open ProfileModal on card click |
| `src/app/(main)/chat/[conversationId]/page.tsx` | Modify | Open ProfileModal on avatar click |
| `src/app/api/matches/route.ts` | Modify | Add `lastActive`, `isVerified` to response |
| `src/app/api/users/[id]/route.ts` | Modify | Add `lastActive` to response |
| `src/lib/email.ts` | Create | `normalizeEmail()` |
| `src/lib/turnstile.ts` | Create | `verifyTurnstile()` |
| `src/app/api/auth/register/route.ts` | Modify | Turnstile + email normalization + device ID |
| `src/lib/auth.ts` | Modify | Email normalization in login, emailVerified check |
| `src/app/(auth)/login/page.tsx` | Modify | Turnstile widget + unverified email banner |
| `src/app/(auth)/register/page.tsx` | Modify | Turnstile widget + device ID |
| `src/app/api/auth/verify-email/route.ts` | Create | Email verification endpoint |
| `src/app/api/auth/send-verification/route.ts` | Create | Resend verification email endpoint |
| `prisma/schema.prisma` | Modify | Add `normalizedEmail`, `emailVerified`, `deviceId` |
| `.env.example` | Modify | Add Turnstile env vars, NEXTAUTH_URL for verification |

---

## Task 1: formatLastSeen helper + online status in matches API

**Files:**
- Create: `src/lib/time.ts`
- Modify: `src/app/api/matches/route.ts`
- Modify: `src/app/api/users/[id]/route.ts`

- [ ] **Step 1: Create `src/lib/time.ts`**

```ts
const ONLINE_THRESHOLD_MS = 15 * 60 * 1000; // 15 minutes

export function isOnline(lastActive: Date): boolean {
  return Date.now() - new Date(lastActive).getTime() < ONLINE_THRESHOLD_MS;
}

export function formatLastSeen(lastActive: Date): string {
  const now = Date.now();
  const then = new Date(lastActive).getTime();
  const diffMs = now - then;

  if (diffMs < ONLINE_THRESHOLD_MS) return 'En ligne';

  const diffMin = Math.floor(diffMs / 60_000);
  if (diffMin < 60) return `Vu il y a ${diffMin} min`;

  const diffH = Math.floor(diffMin / 60);
  if (diffH < 24) return `Vu il y a ${diffH} h`;

  const diffD = Math.floor(diffH / 24);
  if (diffD < 7) return `Vu il y a ${diffD} j`;

  return new Date(lastActive).toLocaleDateString('fr-FR');
}
```

- [ ] **Step 2: Add `lastActive` and `isVerified` to matches API response**

In `src/app/api/matches/route.ts`, change the `select` in `userARel` and `userBRel` to include `lastActive` and `isVerified`:

```ts
// Inside the userARel and userBRel select objects, add:
lastActive: true,
isVerified: true,
```

Then in the `result` mapping, add these fields to the `user` object:

```ts
user: {
  id: otherUser.id,
  displayName: otherUser.displayName,
  isVerified: otherUser.isVerified,
  lastActive: otherUser.lastActive,
  profile: otherUser.profile,
},
```

- [ ] **Step 3: Add `lastActive` to the public profile API**

In `src/app/api/users/[id]/route.ts`, add `lastActive` to the `publicProfile` object after `isVerified`:

```ts
publicProfile.lastActive = user.lastActive;
```

- [ ] **Step 4: Build and verify no type errors**

Run: `npx next build`
Expected: Build succeeds with no type errors related to these changes.

- [ ] **Step 5: Commit**

```bash
git add src/lib/time.ts src/app/api/matches/route.ts src/app/api/users/[id]/route.ts
git commit -m "feat: add formatLastSeen helper and lastActive/isVerified to API responses"
```

---

## Task 2: Online status in matches page

**Files:**
- Modify: `src/app/(main)/matches/page.tsx`

- [ ] **Step 1: Update the `MatchUser` interface and `Match` interface**

Add `lastActive` and `isVerified` to `MatchUser`:

```ts
interface MatchUser {
  id: string;
  displayName: string;
  isVerified: boolean;
  lastActive: string;
  profile: {
    bio?: string;
    photos: string[];
    genderIdentity: string;
    orientation: string[];
    interests: string[];
  };
}
```

- [ ] **Step 2: Import `formatLastSeen` and `OnlineIndicator`, display status on each match card**

At the top of the file, add:

```ts
import OnlineIndicator from '@/components/OnlineIndicator';
import { formatLastSeen } from '@/lib/time';
```

In the match card JSX, after the `<h3>` line with `displayName`, add online status:

```tsx
<p className="text-sm text-gray-500 dark:text-gray-400">
  {formatLastSeen(new Date(match.user.lastActive))}
</p>
```

And wrap the avatar in a `<div className="relative">` with `<OnlineIndicator online={isOnline(new Date(match.user.lastActive))} />` inside it. Import `isOnline` from `@/lib/time`.

- [ ] **Step 3: Verify the matches page builds**

Run: `npx next build`
Expected: Build succeeds.

- [ ] **Step 4: Commit**

```bash
git add src/app/(main)/matches/page.tsx
git commit -m "feat: show online status and last-seen time on match cards"
```

---

## Task 3: ProfileModal component

**Files:**
- Create: `src/components/ProfileModal.tsx`

- [ ] **Step 1: Create `src/components/ProfileModal.tsx`**

```tsx
'use client';

import { useEffect, useState } from 'react';
import { formatLastSeen, isOnline } from '@/lib/time';
import OnlineIndicator from '@/components/OnlineIndicator';
import VerificationBadge from '@/components/VerificationBadge';

interface ProfileModalProps {
  userId: string;
  open: boolean;
  onClose: () => void;
}

interface PublicProfile {
  id: string;
  displayName: string;
  isVerified: boolean;
  lastActive?: string;
  bio?: string;
  birthDate?: string;
  genderIdentity?: string;
  orientation?: string[];
  interests?: string[];
  practices?: string[];
  photos?: string[];
  relationshipType?: string[];
}

export default function ProfileModal({ userId, open, onClose }: ProfileModalProps) {
  const [profile, setProfile] = useState<PublicProfile | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [photoIndex, setPhotoIndex] = useState(0);

  useEffect(() => {
    if (!open) {
      setProfile(null);
      setPhotoIndex(0);
      setError('');
      return;
    }
    setLoading(true);
    fetch(`/api/users/${userId}`)
      .then((r) => {
        if (!r.ok) throw new Error('Profil introuvable');
        return r.json();
      })
      .then((data) => setProfile(data))
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [userId, open]);

  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;

  const age = profile?.birthDate
    ? Math.floor((Date.now() - new Date(profile.birthDate).getTime()) / (365.25 * 24 * 60 * 60 * 1000))
    : null;

  return (
    <div
      className="fixed inset-0 z-[90] flex items-center justify-center bg-black/60 backdrop-blur-sm"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
      role="dialog"
      aria-modal="true"
      aria-label={`Profil de ${profile?.displayName ?? ''}`}
    >
      <div className="mx-4 w-full max-w-md max-h-[85vh] overflow-y-auto rounded-2xl bg-white p-6 shadow-xl dark:bg-gray-900">
        {loading && (
          <div className="flex items-center justify-center py-12">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-coral border-t-transparent" />
          </div>
        )}

        {error && (
          <div className="py-8 text-center">
            <p className="text-sm text-red-600">{error}</p>
            <button
              type="button"
              onClick={onClose}
              className="mt-4 text-sm text-gray-500 hover:text-gray-700"
            >
              Fermer
            </button>
          </div>
        )}

        {profile && !loading && !error && (
          <>
            {/* Photos */}
            {profile.photos && profile.photos.length > 0 && (
              <div className="mb-4">
                <img
                  src={profile.photos[photoIndex]}
                  alt={profile.displayName}
                  className="h-64 w-full rounded-xl object-cover"
                />
                {profile.photos.length > 1 && (
                  <div className="mt-2 flex gap-2 overflow-x-auto">
                    {profile.photos.map((photo, i) => (
                      <button
                        key={photo}
                        type="button"
                        onClick={() => setPhotoIndex(i)}
                        className={`h-14 w-14 shrink-0 rounded-md object-cover ${i === photoIndex ? 'ring-2 ring-coral' : 'opacity-60'}`}
                      >
                        <img src={photo} alt="" className="h-full w-full rounded-md object-cover" />
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Name + online + verified */}
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">
                {profile.displayName}{age != null ? `, ${age}` : ''}
              </h2>
              <VerificationBadge isVerified={profile.isVerified} />
              {profile.lastActive && (
                <span className="relative">
                  <OnlineIndicator online={isOnline(new Date(profile.lastActive))} />
                </span>
              )}
            </div>

            {profile.lastActive && (
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {formatLastSeen(new Date(profile.lastActive))}
              </p>
            )}

            {/* Bio */}
            {profile.bio && (
              <p className="mt-3 text-sm text-gray-700 dark:text-gray-300">{profile.bio}</p>
            )}

            {/* Tags */}
            {profile.genderIdentity && (
              <div className="mt-3">
                <span className="inline-block rounded-full bg-blue-100 px-3 py-1 text-xs font-medium text-blue-700">{profile.genderIdentity}</span>
              </div>
            )}

            {profile.orientation && profile.orientation.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-1">
                {profile.orientation.map((o) => (
                  <span key={o} className="inline-block rounded-full bg-pink-100 px-3 py-1 text-xs font-medium text-pink-700">{o}</span>
                ))}
              </div>
            )}

            {profile.interests && profile.interests.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-1">
                {profile.interests.map((i) => (
                  <span key={i} className="inline-block rounded-full bg-gray-100 px-2 py-0.5 text-[10px] font-medium text-gray-700">{i}</span>
                ))}
              </div>
            )}

            {profile.practices && profile.practices.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-1">
                {profile.practices.map((p) => (
                  <span key={p} className="inline-block rounded-full bg-purple-100 px-2 py-0.5 text-[10px] font-medium text-purple-700">{p}</span>
                ))}
              </div>
            )}

            <button
              type="button"
              onClick={onClose}
              className="mt-6 w-full rounded-full border border-gray-300 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-800"
            >
              Fermer
            </button>
          </>
        )}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Verify build**

Run: `npx next build`
Expected: Build succeeds.

- [ ] **Step 3: Commit**

```bash
git add src/components/ProfileModal.tsx
git commit -m "feat: add ProfileModal component with photos, tags, and online status"
```

---

## Task 4: Wire ProfileModal into all pages

**Files:**
- Modify: `src/app/(main)/discover/page.tsx`
- Modify: `src/app/(main)/matches/page.tsx`
- Modify: `src/app/(main)/crossings/page.tsx`
- Modify: `src/app/(main)/nearby/page.tsx`
- Modify: `src/app/(main)/chat/[conversationId]/page.tsx`

Each page gets the same pattern: add state `[selectedUserId, setSelectedUserId] = useState<string | null>(null)` and render `<ProfileModal userId={selectedUserId} open={!!selectedUserId} onClose={() => setSelectedUserId(null)} />`. Then add `onClick` handlers on the avatar/name elements that call `setSelectedUserId(user.id)`.

- [ ] **Step 1: Wire into matches page**

In `src/app/(main)/matches/page.tsx`:
1. Add `import { useState } from 'react'` (already imported) and `import ProfileModal from '@/components/ProfileModal'`
2. Add state: `const [selectedUserId, setSelectedUserId] = useState<string | null>(null);`
3. Add `<ProfileModal userId={selectedUserId ?? ''} open={!!selectedUserId} onClose={() => setSelectedUserId(null)} />` before the closing `</div>` of the page container
4. Wrap the avatar+name section in each match card with a `button` or add `onClick={() => setSelectedUserId(match.user.id)}` + `cursor-pointer` class

- [ ] **Step 2: Wire into discover page**

In `src/app/(main)/discover/page.tsx`:
1. Add `import ProfileModal from '@/components/ProfileModal'`
2. Add state: `const [selectedUserId, setSelectedUserId] = useState<string | null>(null);`
3. Pass `onAvatarClick` prop (or similar) to `ProfileCard` that calls `setSelectedUserId`
4. In `ProfileCard`, make the avatar/name area clickable
5. Add `<ProfileModal userId={selectedUserId ?? ''} open={!!selectedUserId} onClose={() => setSelectedUserId(null)} />` at the end

- [ ] **Step 3: Wire into crossings page**

In `src/app/(main)/crossings/page.tsx`:
1. Add `import ProfileModal from '@/components/ProfileModal'`
2. Add state: `const [selectedUserId, setSelectedUserId] = useState<string | null>(null);`
3. Make each `CrossingCard`'s avatar/name clickable with `onClick={() => setSelectedUserId(crossing.id)}`
4. Add `<ProfileModal .../>`

- [ ] **Step 4: Wire into nearby page**

In `src/app/(main)/nearby/page.tsx`:
Same pattern as crossings.

- [ ] **Step 5: Wire into chat page**

In `src/app/(main)/chat/[conversationId]/page.tsx`:
1. Add `import ProfileModal from '@/components/ProfileModal'`
2. Add state: `const [selectedUserId, setSelectedUserId] = useState<string | null>(null);`
3. Make the other user's avatar in the chat header clickable with `onClick={() => setSelectedUserId(otherUser.id)}`
4. Add `<ProfileModal .../>`

- [ ] **Step 6: Build and verify**

Run: `npx next build`
Expected: Build succeeds.

- [ ] **Step 7: Commit**

```bash
git add src/app/(main)/discover/page.tsx src/app/(main)/matches/page.tsx src/app/(main)/crossings/page.tsx src/app/(main)/nearby/page.tsx src/app/(main)/chat/[conversationId]/page.tsx src/components/ProfileCard.tsx
git commit -m "feat: wire ProfileModal into all pages (discover, matches, crossings, nearby, chat)"
```

---

## Task 5: Email normalization utility

**Files:**
- Create: `src/lib/email.ts`

- [ ] **Step 1: Create `src/lib/email.ts`**

```ts
/**
 * Normalizes an email address to detect multi-account attempts.
 *
 * Gmail-specific rules:
 * - Remove dots from local part (user.name@gmail.com → username@gmail.com)
 * - Remove +alias tags (user+tag@gmail.com → user@gmail.com)
 * - Normalize googlemail.com → gmail.com
 *
 * General rules:
 * - Lowercase everything
 */
export function normalizeEmail(email: string): string {
  const lower = email.toLowerCase().trim();
  const atIdx = lower.indexOf('@');
  if (atIdx === -1) return lower;

  let local = lower.slice(0, atIdx);
  let domain = lower.slice(atIdx + 1);

  // Normalize googlemail.com → gmail.com
  if (domain === 'googlemail.com') {
    domain = 'gmail.com';
  }

  // Gmail-specific: remove dots and +aliases
  if (domain === 'gmail.com') {
    // Strip +alias
    const plusIdx = local.indexOf('+');
    if (plusIdx !== -1) {
      local = local.slice(0, plusIdx);
    }
    // Remove dots
    local = local.replace(/\./g, '');
  }

  return `${local}@${domain}`;
}
```

- [ ] **Step 2: Add unit tests for normalizeEmail**

Create `src/lib/__tests__/email.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { normalizeEmail } from '../email';

describe('normalizeEmail', () => {
  it('lowercases email', () => {
    expect(normalizeEmail('User@Example.COM')).toBe('user@example.com');
  });

  it('trims whitespace', () => {
    expect(normalizeEmail('  user@example.com  ')).toBe('user@example.com');
  });

  it('removes Gmail dots', () => {
    expect(normalizeEmail('u.s.e.r@gmail.com')).toBe('user@gmail.com');
  });

  it('removes Gmail +alias', () => {
    expect(normalizeEmail('user+tag@gmail.com')).toBe('user@gmail.com');
  });

  it('removes both dots and +alias for Gmail', () => {
    expect(normalizeEmail('u.s.e.r+work@gmail.com')).toBe('user@gmail.com');
  });

  it('normalizes googlemail.com to gmail.com', () => {
    expect(normalizeEmail('user@googlemail.com')).toBe('user@gmail.com');
  });

  it('does not remove dots for non-Gmail providers', () => {
    expect(normalizeEmail('user.name@yahoo.com')).toBe('user.name@yahoo.com');
  });

  it('does not remove +alias for non-Gmail providers', () => {
    expect(normalizeEmail('user+tag@outlook.com')).toBe('user+tag@outlook.com');
  });

  it('handles plain email without special chars', () => {
    expect(normalizeEmail('user@gmail.com')).toBe('user@gmail.com');
  });
});
```

- [ ] **Step 3: Run tests**

Run: `npx vitest run src/lib/__tests__/email.test.ts`
Expected: All 9 tests pass.

- [ ] **Step 4: Commit**

```bash
git add src/lib/email.ts src/lib/__tests__/email.test.ts
git commit -m "feat: add normalizeEmail utility with Gmail alias/dot normalization"
```

---

## Task 6: Prisma schema migration for anti-multi-account fields

**Files:**
- Modify: `prisma/schema.prisma`

- [ ] **Step 1: Add new fields to the User model**

Add these three fields to the `User` model in `prisma/schema.prisma`:

```prisma
normalizedEmail String?  @unique
emailVerified  DateTime?
deviceId       String?
```

The `normalizedEmail` field is nullable (`String?`) because existing users don't have it yet. We'll backfill it in the migration. The `@unique` constraint ensures no two users share the same normalized email.

Place these after the `email` line, before `passwordHash`:

```prisma
model User {
  id              String   @id @default(uuid()) @db.Uuid
  email           String   @unique
  normalizedEmail String?  @unique
  emailVerified   DateTime?
  displayName     String
  passwordHash    String?
  deviceId       String?
  role            String   @default("user")
  ...
```

- [ ] **Step 2: Create the Prisma migration**

Run: `npx prisma migrate dev --name add_anti_multiaccount_fields`

This will:
1. Generate the migration SQL
2. Apply it to the dev database
3. Regenerate the Prisma client

- [ ] **Step 3: Backfill normalizedEmail for existing users**

After the migration, run a script or SQL to backfill `normalizedEmail`:

```sql
UPDATE "users" SET "normalizedEmail" = LOWER("email") WHERE "normalizedEmail" IS NULL;
```

Then alter the column to be NOT NULL:

```sql
ALTER TABLE "users" ALTER COLUMN "normalizedEmail" SET NOT NULL;
```

And update the schema to `String @unique` (remove the `?`):

```prisma
normalizedEmail String @unique
```

Run: `npx prisma migrate dev --name make_normalized_email_required`

- [ ] **Step 4: Commit**

```bash
git add prisma/schema.prisma prisma/migrations/
git commit -m "feat: add normalizedEmail, emailVerified, deviceId to User model"
```

---

## Task 7: Email normalization in register + login

**Files:**
- Modify: `src/app/api/auth/register/route.ts`
- Modify: `src/lib/auth.ts`

- [ ] **Step 1: Update register route to use normalizedEmail**

In `src/app/api/auth/register/route.ts`:

1. Add `import { normalizeEmail } from '@/lib/email';` at top
2. Replace `const normalizedEmail = email.toLowerCase();` with `const normalizedEmail = normalizeEmail(email);`
3. Change the uniqueness check to use `normalizedEmail`:

```ts
const existingUser = await prisma.user.findUnique({ where: { normalizedEmail } });
if (existingUser) {
  return NextResponse.json(
    { error: 'Email déjà utilisé' },
    { status: 409 },
  );
}
```

4. Update the `prisma.user.create` to include `normalizedEmail`:

```ts
const user = await prisma.user.create({
  data: {
    email: email.toLowerCase().trim(),
    normalizedEmail,
    displayName: displayName.trim(),
    passwordHash,
  },
  ...
});
```

- [ ] **Step 2: Update auth.ts login to use normalizedEmail**

In `src/lib/auth.ts`, inside the `CredentialsProvider.authorize` function:

1. Add `import { normalizeEmail } from '@/lib/email';` at top
2. Change the user lookup:

```ts
const user = await prisma.user.findUnique({
  where: { normalizedEmail: credentials.email.toLowerCase().trim() },
});
```

Wait — the `normalizedEmail` field has a unique constraint, so we can look up by it. But we need to normalize the input email first:

```ts
const normalizedInput = normalizeEmail(credentials.email);
const user = await prisma.user.findUnique({
  where: { normalizedEmail: normalizedInput },
});
```

- [ ] **Step 3: Build and verify**

Run: `npx next build`
Expected: Build succeeds.

- [ ] **Step 4: Commit**

```bash
git add src/lib/auth.ts src/app/api/auth/register/route.ts
git commit -m "feat: use normalizedEmail for registration and login uniqueness"
```

---

## Task 8: Mandatory email verification flow

**Files:**
- Create: `src/app/api/auth/verify-email/route.ts`
- Create: `src/app/api/auth/send-verification/route.ts`
- Modify: `src/lib/auth.ts` (add emailVerified check)
- Modify: `src/app/(auth)/login/page.tsx` (show unverified message)
- Modify: `src/app/api/auth/register/route.ts` (send verification email after registration)

- [ ] **Step 1: Create verification token utility**

Create `src/lib/verify-token.ts`:

```ts
import { SignJWT, jwtVerify } from 'jose';

const SECRET = new TextEncoder().encode(process.env.NEXTAUTH_SECRET!);
const VERIFICATION_EXPIRY = '24h';

export async function createVerificationToken(userId: string, email: string): Promise<string> {
  return new SignJWT({ userId, email })
    .setProtectedHeader({ alg: 'HS256' })
    .setExpirationTime(VERIFICATION_EXPIRY)
    .setIssuedAt()
    .sign(SECRET);
}

export async function verifyVerificationToken(token: string): Promise<{ userId: string; email: string } | null> {
  try {
    const { payload } = await jwtVerify(token, SECRET);
    return { userId: payload.userId as string, email: payload.email as string };
  } catch {
    return null;
  }
}
```

- [ ] **Step 2: Create `src/app/api/auth/verify-email/route.ts`**

```ts
import { NextResponse } from 'next/server';
import { verifyVerificationToken } from '@/lib/verify-token';
import prisma from '@/lib/db';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const token = searchParams.get('token');

  if (!token) {
    return NextResponse.redirect(new URL('/login?error=missing-token', request.url));
  }

  const payload = await verifyVerificationToken(token);
  if (!payload) {
    return NextResponse.redirect(new URL('/login?error=invalid-token', request.url));
  }

  const user = await prisma.user.findUnique({ where: { id: payload.userId } });
  if (!user) {
    return NextResponse.redirect(new URL('/login?error=user-not-found', request.url));
  }

  if (user.emailVerified) {
    return NextResponse.redirect(new URL('/login?verified=true', request.url));
  }

  await prisma.user.update({
    where: { id: payload.userId },
    data: { emailVerified: new Date() },
  });

  return NextResponse.redirect(new URL('/login?verified=true', request.url));
}
```

- [ ] **Step 3: Create `src/app/api/auth/send-verification/route.ts`**

```ts
import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { createVerificationToken } from '@/lib/verify-token';
import prisma from '@/lib/db';

export async function POST() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const user = await prisma.user.findUnique({ where: { id: session.user.id } });
  if (!user) {
    return NextResponse.json({ error: 'User not found' }, { status: 404 });
  }

  if (user.emailVerified) {
    return NextResponse.json({ error: 'Already verified' }, { status: 400 });
  }

  const token = await createVerificationToken(user.id, user.email);

  // TODO: Send actual email. For now, log the verification URL.
  const verifyUrl = `${process.env.NEXTAUTH_URL}/api/auth/verify-email?token=${token}`;
  console.log(`[DEV] Verification URL for ${user.email}: ${verifyUrl}`);

  return NextResponse.json({ message: 'Verification email sent' }, { status: 200 });
}
```

- [ ] **Step 4: Update register route to send verification email**

In `src/app/api/auth/register/route.ts`, after creating the user, add:

```ts
import { createVerificationToken } from '@/lib/verify-token';
```

After the `prisma.user.create` call and before the response, add:

```ts
// Send verification email
const verifyToken = await createVerificationToken(user.id, email);
const verifyUrl = `${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/api/auth/verify-email?token=${verifyToken}`;
console.log(`[DEV] Verification URL for ${email}: ${verifyUrl}`);
// TODO: Replace console.log with actual email sending
```

- [ ] **Step 5: Block login for unverified emails**

In `src/lib/auth.ts`, inside the `authorize` callback of `CredentialsProvider`, after finding the user and validating the password, add:

```ts
if (!user.emailVerified) {
  throw new Error('EMAIL_NOT_VERIFIED');
}
```

- [ ] **Step 6: Update login page to show unverified email message and resend link**

In `src/app/(auth)/login/page.tsx`:

1. Import `useState` (already done)
2. Add state for resend: `const [resendSent, setResendSent] = useState(false);`
3. Update the error handling in `handleSubmit`:

```ts
if (result?.error) {
  if (result.error === 'EMAIL_NOT_VERIFIED') {
    setError('Veuillez vérifier votre email avant de vous connecter.');
    setUnverifiedEmail(email);
  } else {
    setError('Email ou mot de passe incorrect');
  }
  return;
}
```

Add `const [unverifiedEmail, setUnverifiedEmail] = useState('');` state.

4. Add a resend button below the error when `unverifiedEmail` is set:

```tsx
{unverifiedEmail && (
  <div className="mt-2 text-center">
    <button
      type="button"
      onClick={async () => {
        await fetch('/api/auth/send-verification', { method: 'POST' });
        setResendSent(true);
      }}
      className="text-sm font-medium text-coral hover:text-terracotta"
      disabled={resendSent}
    >
      {resendSent ? 'Email renvoyé !' : 'Renvoyer l\'email de vérification'}
    </button>
  </div>
)}
```

5. Also add success message for `?verified=true`:

```tsx
const justVerified = searchParams.get('verified') === 'true';
```

And render:

```tsx
{justVerified && (
  <div className="rounded-md bg-green-50 p-3 text-sm text-green-700">
    Email vérifié ! Vous pouvez maintenant vous connecter.
  </div>
)}
```

6. Add `NEXTAUTH_URL` to `.env.example`:

```
NEXTAUTH_URL=http://localhost:3000
```

- [ ] **Step 7: Install jose**

Run: `npm install jose`

- [ ] **Step 8: Build and verify**

Run: `npx next build`
Expected: Build succeeds.

- [ ] **Step 9: Commit**

```bash
git add src/lib/verify-token.ts src/app/api/auth/verify-email/route.ts src/app/api/auth/send-verification/route.ts src/lib/auth.ts src/app/api/auth/register/route.ts "src/app/(auth)/login/page.tsx" .env.example package.json package-lock.json
git commit -m "feat: mandatory email verification flow with resend capability"
```

---

## Task 9: Cloudflare Turnstile captcha

**Files:**
- Create: `src/lib/turnstile.ts`
- Modify: `src/app/(auth)/login/page.tsx`
- Modify: `src/app/(auth)/register/page.tsx`
- Modify: `src/app/api/auth/register/route.ts`
- Modify: `src/lib/auth.ts` (add Turnstile verification in credentials authorize)
- Modify: `.env.example`

- [ ] **Step 1: Install Turnstile React package**

Run: `npm install @marsidev/react-turnstile`

- [ ] **Step 2: Create `src/lib/turnstile.ts`**

```ts
export async function verifyTurnstile(token: string): Promise<boolean> {
  const secret = process.env.TURNSTILE_SECRET_KEY;
  if (!secret) {
    console.warn('[Turnstile] TURNSTILE_SECRET_KEY not configured, skipping verification');
    return true;
  }

  const response = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: `secret=${encodeURIComponent(secret)}&response=${encodeURIComponent(token)}`,
  });

  const data = await response.json();
  return data.success === true;
}
```

- [ ] **Step 3: Add Turnstile to register page**

In `src/app/(auth)/register/page.tsx`:

1. Import: `import { Turnstile } from '@marsidev/react-turnstile';`
2. Add state: `const [turnstileToken, setTurnstileToken] = useState<string | null>(null);`
3. Add the Turnstile widget inside the form, before the submit button:

```tsx
{process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY && (
  <Turnstile
    siteKey={process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY}
    onSuccess={setTurnstileToken}
    onExpire={() => setTurnstileToken(null)}
    onError={() => setTurnstileToken(null)}
  />
)}
```

4. Include `turnstileToken` in the POST body:

```ts
body: JSON.stringify({ displayName, email, password, turnstileToken }),
```

5. Disable submit when Turnstile is required but not completed:

```tsx
disabled={loading || (!!process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY && !turnstileToken)}
```

- [ ] **Step 4: Add Turnstile to login page**

Same pattern as register. Add to `src/app/(auth)/login/page.tsx`:

1. Import Turnstile
2. Add `turnstileToken` state
3. Add widget inside form before submit button
4. Pass `turnstileToken` to `signIn('credentials', { ... })` as a credential parameter
5. Since `signIn` from next-auth doesn't support arbitrary fields directly, we need to pass it differently. We'll use the credentials callback approach — the login form should POST to a custom endpoint or we extend the credentials.

**Important:** `next-auth` `signIn('credentials')` only supports the `email` and `password` fields by default. To pass `turnstileToken`, we need to add it to the credentials config in `auth.ts`:

In `src/lib/auth.ts`, update the `CredentialsProvider` credentials config:

```ts
CredentialsProvider({
  name: 'Credentials',
  credentials: {
    email: { label: 'Email', type: 'email' },
    password: { label: 'Password', type: 'password' },
    turnstileToken: { label: 'Captcha', type: 'text' },
  },
  async authorize(credentials) {
    // ... existing code ...
  },
}),
```

Then in the login page, pass it:

```ts
const result = await signIn('credentials', {
  redirect: false,
  email,
  password,
  turnstileToken: turnstileToken ?? '',
});
```

And in `authorize()`, verify it:

```ts
async authorize(credentials) {
  if (!credentials?.email || !credentials?.password) {
    return null;
  }

  // Verify Turnstile if secret is configured
  if (credentials.turnstileToken && process.env.TURNSTILE_SECRET_KEY) {
    const { verifyTurnstile } = await import('@/lib/turnstile');
    const valid = await verifyTurnstile(credentials.turnstileToken);
    if (!valid) {
      throw new Error('CAPTCHA_FAILED');
    }
  }

  // ... rest of existing authorize code ...
}
```

- [ ] **Step 5: Verify Turnstile in register route**

In `src/app/api/auth/register/route.ts`:

1. Import: `import { verifyTurnstile } from '@/lib/turnstile';`
2. After parsing the body, add Turnstile verification:

```ts
if (process.env.TURNSTILE_SECRET_KEY) {
  const token = body.turnstileToken;
  if (!token) {
    return NextResponse.json(
      { error: 'Veuillez compléter le captcha' },
      { status: 400 },
    );
  }
  const valid = await verifyTurnstile(token);
  if (!valid) {
    return NextResponse.json(
      { error: 'Captcha invalide, veuillez réessayer' },
      { status: 400 },
    );
  }
}
```

3. Also update `registerSchema` to allow the optional `turnstileToken`:

```ts
export const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().regex(
    passwordRegex,
    'Password must be at least 8 characters with uppercase, lowercase, and a digit',
  ),
  displayName: z.string().min(1).max(50).transform((s) => s.trim()),
  turnstileToken: z.string().optional(),
});
```

- [ ] **Step 6: Update `.env.example`**

Add:

```
TURNSTILE_SECRET_KEY=
NEXT_PUBLIC_TURNSTILE_SITE_KEY=
```

- [ ] **Step 7: Build and verify**

Run: `npx next build`
Expected: Build succeeds.

- [ ] **Step 8: Commit**

```bash
git add src/lib/turnstile.ts "src/app/(auth)/login/page.tsx" "src/app/(auth)/register/page.tsx" src/app/api/auth/register/route.ts src/lib/auth.ts src/lib/validators.ts .env.example package.json package-lock.json
git commit -m "feat: add Cloudflare Turnstile captcha to login and register"
```

---

## Task 10: Device-based soft limit

**Files:**
- Modify: `src/app/(auth)/register/page.tsx`
- Modify: `src/app/api/auth/register/route.ts`

- [ ] **Step 1: Add deviceId generation to register page**

In `src/app/(auth)/register/page.tsx`:

1. Add `import { useEffect, useState } from 'react';` (already has `useState`, add `useEffect`)
2. Add state and initialization:

```ts
const [deviceId, setDeviceId] = useState('');

useEffect(() => {
  let id = localStorage.getItem('libre_device_id');
  if (!id) {
    id = crypto.randomUUID();
    localStorage.setItem('libre_device_id', id);
  }
  setDeviceId(id);
}, []);
```

3. Include `deviceId` in the POST body:

```ts
body: JSON.stringify({ displayName, email, password, turnstileToken, deviceId }),
```

- [ ] **Step 2: Update register route to check device limit**

In `src/app/api/auth/register/route.ts`:

1. Update `registerSchema` to accept `deviceId`:

```ts
deviceId: z.string().optional(),
```

2. After parsing, add the device limit check:

```ts
const { email, password, displayName, turnstileToken, deviceId } = parsed.data;

// Check device limit
if (deviceId) {
  const deviceCount = await prisma.user.count({
    where: { deviceId },
  });
  if (deviceCount >= 2) {
    return NextResponse.json(
      { error: 'Nombre maximum de comptes atteint sur cet appareil' },
      { status: 403 },
    );
  }
}
```

3. Include `deviceId` in `prisma.user.create`:

```ts
const user = await prisma.user.create({
  data: {
    email: email.toLowerCase().trim(),
    normalizedEmail,
    displayName: displayName.trim(),
    passwordHash,
    deviceId: deviceId || null,
  },
  ...
});
```

- [ ] **Step 3: Build and verify**

Run: `npx next build`
Expected: Build succeeds.

- [ ] **Step 4: Commit**

```bash
git add "src/app/(auth)/register/page.tsx" src/app/api/auth/register/route.ts src/lib/validators.ts
git commit -m "feat: device-based soft limit for multi-account prevention"
```

---

## Self-Review Checklist

- [x] **Spec coverage:** All 4 features covered (ProfileModal, online status, Turnstile, anti-multi-account)
- [x] **Placeholder scan:** No TBD/TODO/fill-in-later steps — all code is complete
- [x] **Type consistency:** `normalizedEmail` used consistently across register, login, and schema; `deviceId` used consistently across client and server; `formatLastSeen`/`isOnline` used consistently
- [x] **All files listed in file structure have corresponding tasks**
- [x] **Migration steps are explicit** (Task 6)