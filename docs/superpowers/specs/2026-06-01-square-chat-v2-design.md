# La Place v2 — Design Spec

**Date:** 2026-06-01
**Status:** Approved

## Overview

Complete overhaul of the public chat ("La Place") adding: daily reset at 3am with pre-reset alerts, automatic moderation with backoffice-manageable word blacklist, manageable rotating theme calendar with editable theme options, emoji reactions on messages, visible countdown to next reset, functional message reporting, and system notifications in the chat.

## Architecture Decision

**Approach A: Full database** — All configuration (themes, schedule, banned words) stored in PostgreSQL via Prisma. Consistent with existing codebase patterns. Vercel Cron for scheduled jobs. SSE for real-time events (already in use).

---

## 1. Database Schema Changes

### New Tables

#### `SquareThemeConfig`
Stores editable configuration for each chat theme.

| Field | Type | Notes |
|-------|------|-------|
| id | String @id @default(uuid()) @db.Uuid | |
| themeId | String @unique | Static identifier: "pseudonyms", "emojis", "polite", "gifs", "freepseudonyms", "riddle", "reactions" |
| label | String | Display name (editable) |
| description | String | Short description (editable) |
| inputType | String | "text", "emoji", "reactions", "gif", "polite", "riddle" |
| placeholder | String | Input placeholder text (editable) |
| maxLength | Int | Max message length (editable) |
| allowFreeText | Boolean @default(false) | |
| options | Json? | Predefined choices (emoji list, phrase list, GIF URLs) |
| pseudonymNames | Json? | Array of pseudonym names for this theme |
| active | Boolean @default(true) | Disabled themes won't appear in schedule dropdown |
| createdAt | DateTime @default(now()) | |
| updatedAt | DateTime @updatedAt | |

#### `SquareThemeSchedule`
Maps each day of the week to a theme.

| Field | Type | Notes |
|-------|------|-------|
| id | String @id @default(uuid()) @db.Uuid | |
| dayOfWeek | Int @unique | 0=Sunday, 1=Monday, ..., 6=Saturday |
| themeConfigId | String @db.Uuid | FK → SquareThemeConfig |
| createdAt | DateTime @default(now()) | |

#### `BannedWord`
Blacklist of prohibited words, manageable from backoffice.

| Field | Type | Notes |
|-------|------|-------|
| id | String @id @default(uuid()) @db.Uuid | |
| word | String @unique | The prohibited word (case-insensitive matching) |
| severity | String @default("block") | "block" (reject message) or "censor" (replace with ***) |
| createdAt | DateTime @default(now()) | |

#### `SquareReaction`
Emoji reaction counts on messages. No per-user tracking (anonymity).

| Field | Type | Notes |
|-------|------|-------|
| id | String @id @default(uuid()) @db.Uuid | |
| messageId | String @db.Uuid | FK → SquareMessage |
| emoji | String | The reaction emoji |
| count | Int @default(0) | Aggregated count |
| createdAt | DateTime @default(now()) | |
| updatedAt | DateTime @updatedAt | |

Unique constraint: `(messageId, emoji)`

#### `SquareMessageReport`
Reports filed by users against specific messages.

| Field | Type | Notes |
|-------|------|-------|
| id | String @id @default(uuid()) @db.Uuid | |
| messageId | String @db.Uuid | FK → SquareMessage |
| reporterId | String @db.Uuid | FK → User |
| reason | String | "inappropriate", "harassment", "spam", "other" |
| status | String @default("pending") | "pending", "reviewed", "dismissed" |
| createdAt | DateTime @default(now()) | |

### Modified Tables

#### `SquareMessage` (add columns)
- `isSystem Boolean @default(false)` — marks system messages (reset alerts, theme changes, welcome)
- `themeConfigId String? @db.Uuid` — links to the active theme config (nullable for system messages)

---

## 2. Daily Reset at 3:00 AM

### Cron Jobs (Vercel Cron)

Two cron jobs in `vercel.json` or `vercel.ts` (Vercel Crons use UTC; target CET = UTC+1 / CEST = UTC+2):

1. **Pre-reset alert** — `45 1 * * *` UTC (02:45 CET / 03:45 CEST)
   - Calls `GET /api/square/presage`
   - Creates a system message: "🧹 La Place sera réinitialisée dans 15 minutes. Profitez de vos derniers échanges !"
   - Broadcasts `system` event via SSE
   - Note: during summer (CEST), alert fires at 03:45 local, 15 min before the 04:00 CEST reset. Acceptable drift.

2. **Daily reset** — `0 2 * * *` UTC (03:00 CET / 04:00 CEST)
   - Calls `GET /api/square/reset` (authenticated with CRON_SECRET)
   - Deletes all SquareMessage rows
   - Deletes all SquareReaction rows
   - Deletes SquareMessageReport rows where status != "pending" (keep pending for admin review)
   - Creates a system message: "✨ Nouveau jour, nouvelle Place ! Le thème d'aujourd'hui est : {theme label}"
   - Broadcasts `reset` event via SSE

### API Endpoints

**`GET /api/square/reset`**
- Validates `Authorization: Bearer <CRON_SECRET>`
- Performs the purge and system message creation
- Returns `{ success: true, deletedMessages: n }`

**`GET /api/square/presage`**
- Validates `Authorization: Bearer <CRON_SECRET>`
- Creates pre-reset warning system message
- Returns `{ success: true }`

### Client Behavior

- SSE event `reset`: client clears all local messages, shows the new system welcome message
- SSE event `system`: client appends the system message to the chat

### Data Retention

No archival. All messages are purged on reset. This is RGPD-compliant (data minimization principle, article 5.1.e). Anonymous chat messages have no legal retention requirement.

---

## 3. Automatic Moderation (Banned Words)

### API Endpoints

**`GET /api/admin/banned-words`**
- List all banned words (paginated, searchable)
- Query params: `page`, `limit`, `search`

**`POST /api/admin/banned-words`**
- Add a banned word
- Body: `{ word: string, severity: "block" | "censor" }`
- Validates uniqueness (case-insensitive)

**`POST /api/admin/banned-words/bulk`**
- Bulk import banned words
- Body: `{ words: [{ word, severity }], clearExisting: boolean }`

**`DELETE /api/admin/banned-words/[id]`**
- Remove a banned word

### Message Sending Flow (modified `/api/square/messages`)

Before inserting a message:
1. Fetch all banned words from DB (cached in-memory with 5min TTL)
2. Check content against each banned word (case-insensitive, whole-word match)
3. If any word has severity `block`: return 403 `{ error: "Ce message contient du contenu non autorisé" }`
4. If any word has severity `censor`: replace with `***` in content
5. Proceed with insertion

### In-Memory Cache

`src/lib/square/moderation.ts`:
- `getCachedBannedWords()`: returns cached list, refreshes every 5 minutes
- `checkContent(content: string)`: returns `{ allowed: boolean, censored: string }`

### Backoffice Page

`/admin/banned-words`:
- Table listing all banned words with severity badges
- Search/filter input
- "Add word" form with word input + severity dropdown
- "Bulk import" button → textarea modal (one word per line)
- Delete button per row
- Part of the `/admin/square` tab layout (see section 6)

---

## 4. Rotating Themes with Manageable Calendar

### Theme Configuration in DB

On first deployment, a seed script (`prisma/seed-square-themes.ts`) populates `SquareThemeConfig` from the existing hardcod themes in `src/lib/square/themes.ts`. The schedule defaults to the current day-of-week mapping.

### API Endpoints

**`GET /api/admin/square-themes`**
- List all theme configs + current schedule

**`PATCH /api/admin/square-themes/[id]`**
- Update label, description, options, maxLength, pseudonymNames, placeholder, active

**`PUT /api/admin/square-themes/schedule`**
- Body: `{ schedule: [{ dayOfWeek: 0-6, themeConfigId: string }] }`
- Updates the day-to-theme mapping

**`GET /api/square/theme`** (public, cached)
- Returns today's theme config based on the schedule
- Falls back to hardcod if no DB config exists

### Theme Resolution

`src/lib/square/themes.ts` refactored:
- `getTodayTheme()` checks DB schedule first via `getThemeConfig()`
- If DB is empty (first run, migration), falls back to hardcod `SQUARE_THEMES`
- `getPseudonym()` uses theme's `pseudonymNames` array from DB config
- Cache: theme config cached for 1 minute (theme changes at midnight, no need for real-time)

### Backoffice Page

`/admin/square` tab **Thèmes**:
- Card per theme with inline edit (label, description, options list, pseudonym names, maxLength)
- Toggle active/inactive
- Preview of the theme's input type

`/admin/square` tab **Calendrier**:
- 7-day grid (Mon-Sun) with dropdown per day to select theme
- Save button to update schedule
- Visual indicator of which theme is active today

---

## 5. Emoji Reactions on Messages

### API Endpoints

**`POST /api/square/messages/[id]/react`**
- Body: `{ emoji: string }`
- Validates emoji is in the allowed list (`REACTIONS_EMOJIS` constant)
- Upserts `SquareReaction` (messageId + emoji): increment count
- Rate-limited: max 5 reactions per user per minute
- Broadcasts reaction via SSE event `reaction`

**`DELETE /api/square/messages/[id]/react`**
- Body: `{ emoji: string }`
- Decrements count (min 0, never negative)
- Broadcasts reaction via SSE event `reaction`

### Allowed Reaction Emojis

Default list: ❤️ 😂 🔥 👋 💯 ✨ 🤔 😢

Note: Reactions are simple counters — no per-user deduplication. A user can click multiple times, but rate-limiting (5/min) makes spam impractical. This is acceptable for an ephemeral daily chat where perfect accuracy is less important than simplicity.

### Client UI

Under each message (except system messages):
- Small reaction bar: allowed emojis with count badges
- Click to toggle (add/remove)
- Styled small, doesn't overwhelm text messages

### SSE Event

```json
{
  "type": "reaction",
  "messageId": "uuid",
  "emoji": "❤️",
  "count": 3
}
```

---

## 6. Visible Countdown

### Client-Side Calculation

In the theme banner component:
- Calculate time remaining until next 03:00 local time
- Display: "🔄 Réinitialisation dans Xh XXmin"
- Update every minute via `useEffect` + `setInterval`
- Hidden if time > 23 hours (show only during last 23 hours)

### No API Needed

Pure client-side calculation. The reset time is always 03:00 local (or 01:00 UTC for CET). Server broadcasts the actual reset event.

---

## 7. Functional Message Reporting

### API Endpoints

**`POST /api/square/messages/[id]/report`**
- Requires authentication
- Body: `{ reason: "inappropriate" | "harassment" | "spam" | "other" }`
- Creates `SquareMessageReport` row
- Rate-limited: max 3 reports per user per hour

### Backoffice

`/admin/square` tab **Signalements**:
- List of pending reports: message content, pseudonym, reason, timestamp
- Actions per report:
  - **Ignorer**: set status to "dismissed"
  - **Avertissement**: send system message warning to the Place
  - **Bannir de la Place**: set `squareBannedUntil` on user (7 days default), set report status to "reviewed"
  - **Supprimer le message**: delete the message, broadcast `delete` SSE event
- Filter by status (pending/reviewed/dismissed)

### Client Changes

- The ⚑ button becomes functional: opens a small modal/dropdown with reason selection
- After reporting, the button changes to "Signalé ✓" (disabled state)

---

## 8. System Notifications

### Message Types

| Type | When | Content |
|------|------|---------|
| `daily_reset` | 03:00 cron | "✨ Nouveau jour, nouvelle Place ! Le thème d'aujourd'hui est : {label}" |
| `reset_warning` | 02:45 cron | "🧹 La Place sera réinitialisée dans 15 minutes." |
| `theme_change` | Manual admin action | "🎭 Le thème change : {label}" |
| `moderation_warning` | Admin action | "⚠️ Un message a été supprimé par la modération." |
| `welcome` | First message of day / after reset | "👋 Bienvenue sur la Place ! Respecte les autres et amuse-toi bien." |

### System Message Style

- Distinct visual: colored background (light blue/gray), 📢 Système as pseudonym
- No report button, no reaction bar
- Pseudonym: "📢 Système" with `isSystem: true`

### System Message Creation

`src/lib/square/store.ts` — `addSystemMessage(type, content)`:
- Creates `SquareMessage` with `isSystem: true`, `pseudonym: "📢 Système"`, `type: "system"`
- Broadcasts via SSE

---

## 9. Enhanced SSE Protocol

### Current Events
- `message` (default SSE event) — new chat message

### New Events
- `reset` — `{ type: "reset" }` — client should clear all messages and reload
- `system` — system message object — displayed with special styling
- `reaction` — `{ messageId, emoji, count }` — update reaction count on message
- `delete` — `{ messageId }` — remove a message from the client (admin deletion)

### Client-Side Handling

`SquareChat.tsx` updated to handle all event types:
- `message` → append to messages list
- `reset` → clear messages, fetch fresh state
- `system` → append system message with special styling
- `reaction` → update reaction count on specific message
- `delete` → remove message from list

---

## 10. Backoffice Admin Square Page

### Route: `/admin/square`

Single page with 4 tabs:
1. **Thèmes** — Edit theme configurations (label, description, options, pseudonyms)
2. **Calendrier** — Assign themes to days of the week
3. **Modération** — Banned words management (add, search, delete, bulk import)
4. **Signalements** — Pending reports with actions (dismiss, warn, ban, delete message)

### Admin API Routes

All under `/api/admin/square/`:
- `GET /themes` — list theme configs + schedule
- `PATCH /themes/[id]` — update theme config
- `PUT /themes/schedule` — update schedule
- `GET /banned-words` — list banned words
- `POST /banned-words` — add banned word
- `POST /banned-words/bulk` — bulk import
- `DELETE /banned-words/[id]` — remove banned word
- `GET /reports` — list reports (filterable by status)
- `PATCH /reports/[id]` — handle report (dismiss/ban/delete)
- `POST /system-message` — send system message from admin

---

## 11. Rate Limiting

Existing rate limiter (`src/lib/rate-limit.ts`) will be extended:
- Message sending: 10 messages per minute per user (existing)
- Reactions: 5 per minute per user
- Reports: 3 per hour per user

---

## 12. Implementation Order

1. Prisma schema migration (new tables + SquareMessage modifications)
2. Seed script for theme configs and schedule
3. Banned words backend (model, cache, check function, admin API)
4. Theme config backend (getThemeConfig, getTodayTheme refactored, admin API)
5. Message reporting backend (API, moderation flow)
6. System messages backend (addSystemMessage, system message types)
7. SSE enhancements (new event types: reset, system, reaction, delete)
8. Daily reset cron jobs (presage + reset endpoints)
9. Reactions backend (API, SSE events)
10. Client refactor: SquareChat.tsx (new SSE events, reactions, system messages, countdown, report modal)
11. Admin backoffice: `/admin/square` page with 4 tabs
12. Integration testing