/**
 * Tests — POST / DELETE /api/push/subscriptions (#392, spec 003 R15, T049).
 *
 * Un endpoint de push est une adresse d'envoi : personne n'en enregistre pour
 * quelqu'un d'autre (session obligatoire, upsert rattaché à la session), et
 * on ne supprime que le sien — un endpoint d'un autre compte renvoie 204 sans
 * effet, pour ne pas dire s'il existe. La validation zod refuse tout ce qui
 * n'est pas un abonnement plausible (https, clés base64url aux bonnes longueurs).
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

const mockGetServerSession = vi.fn();
vi.mock('next-auth', () => ({ __esModule: true, default: vi.fn(), getServerSession: mockGetServerSession }));
vi.mock('@/lib/auth', () => ({ authOptions: {} }));

const mockRateLimit = vi.fn();
vi.mock('@/lib/rate-limit', () => ({ __esModule: true, rateLimit: mockRateLimit }));

const fakeDb = { pushSubscription: { upsert: vi.fn(), deleteMany: vi.fn(), findUnique: vi.fn() } };
vi.mock('@/lib/db', () => ({ __esModule: true, getDb: () => fakeDb }));

const { POST, DELETE } = await import('../route');

const P256DH = 'B'.repeat(87);
const AUTH = 'a'.repeat(22);
const ENDPOINT = 'https://fcm.googleapis.com/fcm/send/abc';

function req(method: string, body: unknown) {
  return new NextRequest('http://localhost/api/push/subscriptions', {
    method,
    headers: { 'content-type': 'application/json', 'user-agent': 'UA/1 ' + 'x'.repeat(300) },
    body: JSON.stringify(body),
  });
}
const valid = { endpoint: ENDPOINT, keys: { p256dh: P256DH, auth: AUTH } };

beforeEach(() => {
  vi.clearAllMocks();
  mockGetServerSession.mockResolvedValue({ user: { id: 'me' } });
  mockRateLimit.mockResolvedValue({ success: true });
  fakeDb.pushSubscription.findUnique.mockResolvedValue(null);
  fakeDb.pushSubscription.upsert.mockResolvedValue({ id: 'sub-1' });
  fakeDb.pushSubscription.deleteMany.mockResolvedValue({ count: 1 });
});

describe('POST /api/push/subscriptions', () => {
  it('401 sans session, sans toucher la base', async () => {
    mockGetServerSession.mockResolvedValue(null);
    expect((await POST(req('POST', valid))).status).toBe(401);
    expect(fakeDb.pushSubscription.upsert).not.toHaveBeenCalled();
  });

  it('201 : upsert sur endpoint, rattaché à la session, userAgent tronqué à 256', async () => {
    const res = await POST(req('POST', valid));
    expect(res.status).toBe(201);
    expect(await res.json()).toEqual({ id: 'sub-1' });
    const args = fakeDb.pushSubscription.upsert.mock.calls[0][0];
    expect(args.where).toEqual({ endpoint: ENDPOINT });
    expect(args.create).toEqual(expect.objectContaining({ userId: 'me', endpoint: ENDPOINT, p256dh: P256DH, auth: AUTH }));
    expect(args.create.userAgent).toHaveLength(256);
    expect(mockRateLimit).toHaveBeenCalledWith('push-sub:me', 10, 60_000);
  });

  it('200 sans doublon quand le même endpoint est déjà à ce compte', async () => {
    fakeDb.pushSubscription.findUnique.mockResolvedValue({ id: 'sub-1', userId: 'me' });
    const res = await POST(req('POST', valid));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ id: 'sub-1' });
    expect(fakeDb.pushSubscription.upsert).toHaveBeenCalledTimes(1);
  });

  it('endpoint connu sous un autre compte → réassigné à la session (201)', async () => {
    fakeDb.pushSubscription.findUnique.mockResolvedValue({ id: 'sub-1', userId: 'someone-else' });
    const res = await POST(req('POST', valid));
    expect(res.status).toBe(201);
    const args = fakeDb.pushSubscription.upsert.mock.calls[0][0];
    expect(args.update).toEqual(expect.objectContaining({ userId: 'me', p256dh: P256DH, auth: AUTH }));
  });

  it.each([
    ['endpoint http', { ...valid, endpoint: 'http://push.example/x' }],
    ['endpoint trop long', { ...valid, endpoint: 'https://p.x/' + 'a'.repeat(2048) }],
    ['p256dh malformé', { ...valid, keys: { p256dh: 'B'.repeat(40), auth: AUTH } }],
    ['p256dh non base64url', { ...valid, keys: { p256dh: '+'.repeat(87), auth: AUTH } }],
    ['auth trop court', { ...valid, keys: { p256dh: P256DH, auth: 'a'.repeat(10) } }],
    ['sans keys', { endpoint: ENDPOINT }],
  ])('400 : %s', async (_label, body) => {
    const res = await POST(req('POST', body));
    expect(res.status).toBe(400);
    expect(await res.json()).toEqual(expect.objectContaining({ details: expect.anything() }));
    expect(fakeDb.pushSubscription.upsert).not.toHaveBeenCalled();
  });

  it('429 sous rate limit', async () => {
    mockRateLimit.mockResolvedValue({ success: false });
    expect((await POST(req('POST', valid))).status).toBe(429);
    expect(fakeDb.pushSubscription.upsert).not.toHaveBeenCalled();
  });
});

describe('DELETE /api/push/subscriptions', () => {
  it('401 sans session', async () => {
    mockGetServerSession.mockResolvedValue(null);
    expect((await DELETE(req('DELETE', { endpoint: ENDPOINT }))).status).toBe(401);
  });

  it('204 et supprime seulement si userId = session', async () => {
    const res = await DELETE(req('DELETE', { endpoint: ENDPOINT }));
    expect(res.status).toBe(204);
    expect(fakeDb.pushSubscription.deleteMany).toHaveBeenCalledWith({ where: { endpoint: ENDPOINT, userId: 'me' } });
  });

  it('204 même si rien à supprimer (idempotent, pas de fuite)', async () => {
    fakeDb.pushSubscription.deleteMany.mockResolvedValue({ count: 0 });
    expect((await DELETE(req('DELETE', { endpoint: ENDPOINT }))).status).toBe(204);
  });

  it('400 sur un endpoint invalide', async () => {
    expect((await DELETE(req('DELETE', { endpoint: 'nope' }))).status).toBe(400);
    expect(fakeDb.pushSubscription.deleteMany).not.toHaveBeenCalled();
  });
});
