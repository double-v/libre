// @vitest-environment node
/**
 * #418 — garde de non-régression : chaque route d'une fonctionnalité coupable
 * refuse (403 `feature_disabled`) quand elle est coupée, AVANT toute autre
 * vérification. Si une route de La Place, des croisements ou du check-in
 * oublie sa garde, ce test la nomme.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

vi.mock('next-auth', () => ({ __esModule: true, default: vi.fn(), getServerSession: vi.fn(async () => null) }));
const fakeDb = { siteConfig: { findUnique: vi.fn() } };
vi.mock('@/lib/db', () => ({ __esModule: true, getDb: () => fakeDb }));
vi.mock('@/lib/rate-limit', () => ({ __esModule: true, rateLimit: vi.fn(async () => ({ success: true })), limits: { api: { limit: 100, windowMs: 60000 } } }));
vi.mock('@/lib/pusher', () => ({ __esModule: true, pusher: { trigger: vi.fn() }, getUserChannel: () => 'x' }));

const { invaliderFeatures } = await import('@/lib/features-server');

const req = (methode = 'GET') => new NextRequest('http://x/api/y', { method: methode, ...(methode === 'POST' ? { body: '{}' } : {}) });
const params = { params: Promise.resolve({ id: '00000000-0000-0000-0000-000000000000' }) };

const routes: { nom: string; feature: string; appel: () => Promise<Response> }[] = [
  { nom: 'GET /api/square/messages', feature: 'square', appel: async () => (await import('@/app/api/square/messages/route')).GET() },
  { nom: 'POST /api/square/messages', feature: 'square', appel: async () => (await import('@/app/api/square/messages/route')).POST(req('POST')) },
  { nom: 'GET /api/square/stream', feature: 'square', appel: async () => (await import('@/app/api/square/stream/route')).GET() },
  { nom: 'GET /api/square/theme', feature: 'square', appel: async () => (await import('@/app/api/square/theme/route')).GET() },
  { nom: 'GET /api/square/reset', feature: 'square', appel: async () => (await import('@/app/api/square/reset/route')).GET(req()) },
  { nom: 'GET /api/square/presage', feature: 'square', appel: async () => (await import('@/app/api/square/presage/route')).GET(req()) },
  { nom: 'POST /api/square/messages/[id]/react', feature: 'square', appel: async () => (await import('@/app/api/square/messages/[id]/react/route')).POST(req('POST'), params) },
  { nom: 'POST /api/square/messages/[id]/report', feature: 'square', appel: async () => (await import('@/app/api/square/messages/[id]/report/route')).POST(req('POST'), params) },
  { nom: 'GET /api/geoloc/crossings', feature: 'crossings', appel: async () => (await import('@/app/api/geoloc/crossings/route')).GET() },
  { nom: 'POST /api/circle/check-in', feature: 'checkin', appel: async () => (await import('@/app/api/circle/check-in/route')).POST(req('POST')) },
];

beforeEach(() => {
  vi.clearAllMocks();
  invaliderFeatures();
  fakeDb.siteConfig.findUnique.mockResolvedValue({ featuresDisabled: ['checkin', 'crossings', 'square'] });
});

describe('routes gardées par un interrupteur (#418)', () => {
  for (const r of routes) {
    it(`${r.nom} refuse quand « ${r.feature} » est coupée`, async () => {
      const res = await r.appel();
      expect(res.status).toBe(403);
      await expect(res.json()).resolves.toMatchObject({ error: 'feature_disabled', feature: r.feature });
    });
  }
});
