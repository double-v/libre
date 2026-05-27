# PeterlGame — Free Dating App Design Spec

**Date**: 2026-05-27
**Status**: Draft
**Philosophy**: *"Notre but, c'est que vous quittiez l'appli"*

## Overview

Open-source, free dating app focused on libre/alternative encounters. Geolocation-based matching (crossed paths + nearby). Like-mutual unlocks E2E chat. No subscription, no data selling, no profit. Community-funded for hosting costs only. Goal: disrupt paid dating apps.

## Architecture

### Stack

| Layer | Technology | Rationale |
|-------|-----------|-----------|
| Frontend | Next.js (App Router) + TypeScript + Tailwind CSS | SSR/CSR, PWA-ready, single repo |
| Backend | Next.js API Routes (monolith) | Simple, deployable, contributes easily |
| Database | PostgreSQL + PostGIS (Neon free tier) | Spatial queries, robust, free tier |
| Realtime | Pusher free tier → Soketi (self-hosted if scaling) | Chat + geoloc notifications |
| Storage | Cloudflare R2 free tier | Photos, verification selfies |
| Crypto | X25519 + AES-CBC (E2E encryption) | Privacy-first: server never reads messages |
| Auth | NextAuth.js (email+password, Google/GitHub OAuth) | Proven, flexible |
| Tests | Vitest + Testing Library + Playwright | TDD workflow |
| CI | GitHub Actions (free tier) | Auto-test on push |
| Deploy | Vercel (front + API) | Zero-cost, PWA-ready |

### Architecture Diagram

```
┌─────────────────────────────────────────────┐
│                Vercel (free tier)            │
│  ┌─────────────┐  ┌──────────────────────┐  │
│  │  Next.js     │  │  API Routes          │  │
│  │  App Router  │  │  /api/auth/*         │  │
│  │  (SSR/CSR)   │  │  /api/users/*        │  │
│  │              │  │  /api/geoloc/*       │  │
│  │              │  │  /api/match/*        │  │
│  │              │  │  /api/chat/*          │  │
│  │              │  │  /api/moderation/*    │  │
│  └─────────────┘  └──────────────────────┘  │
└──────────────┬───────────────────────────────┘
               │
    ┌──────────┴──────────┐
    │  PostgreSQL + PostGIS│  (Neon / CleverCloud free tier)
    │  - users             │
    │  - profiles          │
    │  - encounters        │
    │  - matches           │
    │  - messages (cipher) │
    │  - reports           │
    └──────────────────────┘
    
    ┌──────────────────────┐
    │  Pusher (free tier)  │  ← WebSocket for realtime chat
    │  or Soketi (self)    │     + geoloc encounter notifications
    └──────────────────────┘
```

## Data Model

### users

| Column | Type | Notes |
|--------|------|-------|
| id | uuid, PK | |
| email | varchar, unique | Never shown to other users |
| display_name | varchar | |
| password_hash | varchar | bcrypt |
| created_at | timestamp | |
| is_verified | boolean | Badge from selfie verification |
| is_banned | boolean | |
| last_active | timestamp | |

### profiles

| Column | Type | Notes |
|--------|------|-------|
| user_id | uuid, PK, FK → users | |
| bio | text | |
| birth_date | date | |
| gender_identity | varchar | Free text |
| orientation | varchar[] | Multi-select |
| relationship_type | varchar[] | poly, libre, casual, etc. |
| interests | varchar[] | Free tags |
| social_links | jsonb | {snapchat: "...", instagram: "..."} optional |
| photos | varchar[] | URLs on Cloudflare R2 |
| max_distance_km | integer | Matching radius |
| age_min | integer | Preference filter |
| age_max | integer | Preference filter |
| invisible_mode | boolean | See crossings without being seen |
| created_at | timestamp | |
| updated_at | timestamp | |

### encounters (crossed paths IRL)

| Column | Type | Notes |
|--------|------|-------|
| id | uuid, PK | |
| user_a | uuid, FK → users | |
| user_b | uuid, FK → users | |
| location | PostGIS point | Fuzzed to ~100m |
| distance_m | integer | Rounded |
| happened_at | timestamp | |
| INDEX | | Geo + time composite |

### likes (swipes)

| Column | Type | Notes |
|--------|------|-------|
| liker_id | uuid, FK → users | |
| liked_id | uuid, FK → users | |
| created_at | timestamp | |
| PK | (liker_id, liked_id) | |

### matches (mutual like)

| Column | Type | Notes |
|--------|------|-------|
| id | uuid, PK | |
| user_a | uuid, FK → users | |
| user_b | uuid, FK → users | |
| created_at | timestamp | |
| UNIQUE | (user_a, user_b) | |

### conversations

| Column | Type | Notes |
|--------|------|-------|
| id | uuid, PK | |
| match_id | uuid, FK → matches | |
| created_at | timestamp | |
| updated_at | timestamp | |

### messages (E2E encrypted)

| Column | Type | Notes |
|--------|------|-------|
| id | uuid, PK | |
| conversation_id | uuid, FK → conversations | |
| sender_id | uuid, FK → users | |
| content | text | Ciphertext — server cannot decrypt |
| created_at | timestamp | |
| read_at | timestamp, nullable | |

### user_keys (E2E encryption)

| Column | Type | Notes |
|--------|------|-------|
| user_id | uuid, PK, FK → users | |
| public_key | text | X25519 public key |
| key_created_at | timestamp | |

> Private key is stored locally on the client device, encrypted by the user's password. Never transmitted to the server. Loss of private key = loss of message history.

### reports

| Column | Type | Notes |
|--------|------|-------|
| id | uuid, PK | |
| reporter_id | uuid, FK → users | |
| reported_id | uuid, FK → users | |
| reason | enum | harassment, spam, fake, inappropriate, other |
| description | text | |
| status | enum | pending, reviewed, dismissed, actioned |
| reviewed_by | uuid, FK → users, nullable | Moderator |
| created_at | timestamp | |
| resolved_at | timestamp, nullable | |

### verification_requests

| Column | Type | Notes |
|--------|------|-------|
| id | uuid, PK | |
| user_id | uuid, FK → users | |
| selfie_url | varchar | Cloudflare R2 |
| status | enum | pending, approved, rejected |
| reviewed_by | uuid, FK → users, nullable | |
| created_at | timestamp | |
| resolved_at | timestamp, nullable | |

### blocks

| Column | Type | Notes |
|--------|------|-------|
| blocker_id | uuid, FK → users | |
| blocked_id | uuid, FK → users | |
| created_at | timestamp | |
| PK | (blocker_id, blocked_id) | |

## User Flows

### Registration

1. Email + password (or OAuth: Google/GitHub)
2. Profile creation: display name, birth date, bio, photos
3. Preferences: orientation, relationship type, age range, max distance, interest tags, social media (optional)
4. Geolocation activation (browser permission)
5. E2E key pair generated client-side, public key uploaded
→ Profile active, ready to match

### Discovery (2 tabs)

**Tab "Croisements" (Crossed Paths)**:
- List of people physically crossed, sorted by recency
- Card shows: photo, name, age, fuzzed distance, crossing time
- Actions: Like / Pass

**Tab "À proximité" (Nearby)**:
- Map or list of people nearby RIGHT NOW
- Same card format
- Actions: Like / Pass

### Match

- When A likes B and B already liked A → Match
- Push notification + in-app: "Vous avez un match avec X"
- Conversation created automatically
- Daily like limit: 50/day (configurable server-side, anti-spam)

### Chat (E2E encrypted)

- Simple text messaging (V1 — no media, voice, or video)
- Messages encrypted client-side with recipient's public key
- Server only stores ciphertext
- "On échange nos réseaux ?" button to share contact info
- Block/unmatch available at any time

### Verification Badge

1. Settings → "Obtenir le badge vérifié"
2. Take a selfie with an on-screen code displayed
3. Community moderator reviews and approves/rejects
4. Badge displayed on profile

### Reporting

- Button on any profile or message: "Signaler"
- Choose reason + optional description
- Community moderator reviews

## Security & Privacy

### Geolocation Privacy

- Position sent to server fuzzed to ~100m (never exact)
- Encounters store fuzzed point + rounded distance
- No continuous position tracking — only crossing events
- User can disable geolocation at any time
- Invisible mode: see crossings without appearing in others'

### Data Privacy

- Email never shown to other users
- No social media links on profile visible (chat is the bridge)
- Account deletion = complete data purge (GDPR-friendly)
- No third-party analytics or tracking
- Messages are E2E encrypted — server cannot read them

### Technical Security

- Rate limiting on all API endpoints (anti-spam, anti-brute-force)
- Server-side validation on everything (never trust the frontend)
- CORS strict, security headers (HSTS, CSP)
- HTTPS only, httpOnly + secure cookies
- Daily like limit: 50/day (configurable server-side, prevents mass swiping)

### Anti-Harassment

- Daily like limit: 50/day
- Block = immediate, blocked user cannot see profile or cross paths
- Unmatch = instant removal from matches and conversations
- Easy reporting with visible button

### E2E Encryption Details

- Algorithm: X25519 for key exchange + AES-256-CBC for message encryption
- Key pair generated at registration (client-side)
- Public key stored on server, private key encrypted with user password and stored locally
- Each message encrypted with recipient's public key
- Key rotation: not in V1 (accepted trade-off)
- Private key loss = message history loss (acceptable: the app's goal is ephemeral connection)

## TDD Methodology

**Rule**: No production code without a test first.

### Process (Red → Green → Refactor)

1. Write a test describing expected behavior (RED)
2. Implement the minimum to pass the test (GREEN)
3. Refactor if needed (REFACTOR)
4. Commit only if all tests are green

### Test Tools

- **Vitest**: unit tests + integration tests
- **Testing Library**: React component tests
- **Playwright**: E2E tests for critical flows (signup, match, chat)

### Test Priority

1. **Crypto E2E** (most critical, most fragile)
2. **Match logic** (mutual like, encounters, proximity)
3. **API routes** (auth, profiles, moderation)
4. **UI components** (cards, chat, filters)

### CI

- GitHub Actions runs on every push
- PRs blocked if tests fail
- No merge without green CI

## Monetization & Funding

- **Zero subscription, zero paid features**
- Hosting funded by community donations (cagnotte)
- Open source: contributions welcome
- No ads, no data selling, no premium tier

## V1 Feature Scope

| # | Feature | Priority |
|---|---------|----------|
| 1 | Auth (email+password, OAuth) | Must |
| 2 | Profile + free preferences (orientation, relationship type, tags, social media) | Must |
| 3 | Dual geoloc (crossed paths + nearby) | Must |
| 4 | Like mutual → Match | Must |
| 5 | E2E encrypted chat | Must |
| 6 | Verification badge (selfie) | Must |
| 7 | Reporting + community moderation | Must |
| 8 | Block / unmatch | Must |
| 9 | Invisible mode | Must |
| 10 | Account deletion (full purge) | Must |
| 11 | PWA (installable on mobile) | Should |
| 12 | Social media as search filter | Should |

## Out of Scope (V2+)

- Media messages (photos, voice, video)
- E2E key rotation
- Push notifications (native — requires Play Store)
- Advanced moderation tools (AI detection)
- Admin dashboard
- Internationalization