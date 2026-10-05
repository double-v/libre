/**
 * GET/PUT /api/users/profile — spec 010 : invitation lue par soi, lexique et
 * fuseau analysés après la réponse, fuseau jamais écrit.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { randomUUID } from 'crypto';

const mockGetServerSession = vi.fn();
vi.mock('next-auth', () => ({ __esModule: true, default: vi.fn(), getServerSession: mockGetServerSession }));

const fakeDb = {
  user: { findUnique: vi.fn() },
  profile: { upsert: vi.fn() },
  consent: { findFirst: vi.fn(async () => null) },
};
vi.mock('@/lib/db', () => ({ __esModule: true, getDb: () => fakeDb }));
vi.mock('@/lib/photo-veil', () => ({ __esModule: true, photoSensitivityMap: vi.fn(async () => ({})) }));
const enregistrerSignal = vi.fn();
vi.mock('@/lib/fraude/signaux', () => ({ __esModule: true, enregistrerSignal }));
const signalerLexique = vi.fn();
vi.mock('@/lib/fraude/lexique', () => ({ __esModule: true, signalerLexique }));

let taches: Promise<unknown>[] = [];
vi.mock('next/server', async (importOriginal) => {
  const orig = await importOriginal<typeof import('next/server')>();
  return { ...orig, after: (task: () => unknown) => { taches.push(Promise.resolve().then(task)); } };
});

const { GET, PUT } = await import('../route');

const ME = randomUUID();
const put = (body: unknown) =>
  PUT(new Request('http://localhost/api/users/profile', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }));
const lyon = { label: 'Lyon', qualifier: '69, Rhône', country: 'France', lat: 45.76, lng: 4.83 };

beforeEach(() => {
  vi.clearAllMocks();
  taches = [];
  mockGetServerSession.mockResolvedValue({ user: { id: ME } });
  fakeDb.profile.upsert.mockImplementation(async ({ update }: { update: Record<string, unknown> }) => ({ userId: ME, ...update }));
});

describe('GET — invitation à la vérification (FR-017, FR-021)', () => {
  const base = { displayName: 'Noor', isVerified: false, mustRenameDisplayName: false, retraitAt: null, profile: null };

  it('un booléen quand l’invitation est posée, sans date ni motif', async () => {
    fakeDb.user.findUnique.mockResolvedValue({ ...base, verifInviteeAt: new Date() });
    const body = await (await GET()).json();
    expect(body.invitationVerification).toBe(true);
    expect(JSON.stringify(body)).not.toMatch(/verifInviteeAt|niveau|signal/i);
  });

  it('la clé est absente sans invitation', async () => {
    fakeDb.user.findUnique.mockResolvedValue({ ...base, verifInviteeAt: null });
    const body = await (await GET()).json();
    expect('invitationVerification' in body).toBe(false);
  });
});

describe('PUT — analyses après la réponse', () => {
  it('passe la bio au lexique, sans refuser l’écriture', async () => {
    const res = await put({ bio: 'paiement par coupon PCS' });
    expect(res.status).toBe(200);
    await Promise.all(taches);
    expect(signalerLexique).toHaveBeenCalledWith(ME, 'paiement par coupon PCS');
  });

  it('fuseau lointain + ville en France → indice faible', async () => {
    await put({ city: lyon, fuseau: 'Africa/Lagos' });
    await Promise.all(taches);
    expect(enregistrerSignal).toHaveBeenCalledWith({ userId: ME, type: 'fuseau_incoherent', force: 'faible', cle: 'fuseau' });
  });

  it('fuseau européen → rien', async () => {
    await put({ city: lyon, fuseau: 'Europe/Paris' });
    await Promise.all(taches);
    expect(enregistrerSignal).not.toHaveBeenCalled();
  });

  it('le fuseau n’est jamais écrit en base', async () => {
    await put({ city: lyon, fuseau: 'Africa/Lagos' });
    const { update, create } = fakeDb.profile.upsert.mock.calls[0][0];
    expect(JSON.stringify({ update, create })).not.toContain('Lagos');
  });
});
