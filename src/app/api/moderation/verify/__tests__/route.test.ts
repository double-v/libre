// @vitest-environment node
/**
 * #436 — parcours membre du badge vérifié.
 *
 * Le geste est tiré par le serveur et relu dans un jeton signé ; le selfie est
 * rangé sous `<userId>/verif/` et n'entre jamais dans `profile.photos` — sans
 * quoi il deviendrait une photo publique du profil.
 */
import { describe, it, expect, vi, beforeEach, beforeAll } from 'vitest';

const ME = '11111111-1111-4111-8111-111111111111';
const AUTRE = '22222222-2222-4222-8222-222222222222';

beforeAll(() => {
  process.env.NEXTAUTH_SECRET = 'secret-de-test-assez-long-pour-hs256';
});

const session = { user: { id: ME } as { id: string } | undefined };
vi.mock('next-auth', () => ({ __esModule: true, getServerSession: vi.fn(async () => (session.user ? session : null)) }));
vi.mock('@/lib/auth', () => ({ __esModule: true, authOptions: {} }));
vi.mock('@/lib/rate-limit', () => ({
  __esModule: true,
  rateLimit: vi.fn(async () => ({ success: true })),
  limits: { api: { limit: 100, windowMs: 60_000 } },
}));
const mockUpload = vi.fn(async (_f: File, userId: string, dossier?: string) => `${userId}/${dossier}/abc.jpg`);
vi.mock('@/lib/r2', () => ({ __esModule: true, uploadPhoto: mockUpload, isR2Configured: () => true }));

const fakeDb = {
  user: { findUnique: vi.fn() },
  verificationRequest: { findFirst: vi.fn(), create: vi.fn() },
  profile: { update: vi.fn(), upsert: vi.fn() },
};
vi.mock('@/lib/db', () => ({ __esModule: true, getDb: () => fakeDb }));

const route = () => import('../route');
const routeGeste = () => import('../geste/route');
const { signerJetonGeste, lireJetonGeste } = await import('@/lib/verification/jeton-geste');

function etat({ verifie = false, derniere = null as null | { status: string; rejectReason?: string | null } } = {}) {
  fakeDb.user.findUnique.mockResolvedValue({ isVerified: verifie });
  fakeDb.verificationRequest.findFirst.mockResolvedValue(derniere);
}

function envoi(champs: Record<string, string | File>) {
  const fd = new FormData();
  for (const [k, v] of Object.entries(champs)) fd.append(k, v);
  return new Request('http://x/api/moderation/verify', { method: 'POST', body: fd });
}
const selfie = () => new File([new Uint8Array([0xff, 0xd8, 0xff])], 's.jpg', { type: 'image/jpeg' });

beforeEach(() => {
  vi.clearAllMocks();
  session.user = { id: ME };
  etat();
});

describe('GET — où j’en suis', () => {
  it('401 sans session', async () => {
    session.user = undefined;
    expect((await (await route()).GET()).status).toBe(401);
  });

  it.each([
    [{}, { statut: 'aucune' }],
    [{ derniere: { status: 'pending' } }, { statut: 'en_cours' }],
    [{ derniere: { status: 'rejected', rejectReason: 'geste_invisible' } }, { statut: 'refusee', motif: 'Le geste demandé ne se voit pas sur la photo.' }],
    [{ verifie: true, derniere: { status: 'approved' } }, { statut: 'validee' }],
  ])('%o → %o', async (e, attendu) => {
    etat(e);
    const res = await (await route()).GET();
    expect(await res.json()).toEqual(attendu);
  });

  it('un refus sans motif connu reste un refus, sans texte inventé', async () => {
    etat({ derniere: { status: 'rejected', rejectReason: null } });
    expect(await (await (await route()).GET()).json()).toEqual({ statut: 'refusee', motif: null });
  });
});

describe('POST /geste — tirer un geste', () => {
  const tirer = async (body: unknown = {}) =>
    (await routeGeste()).POST(new Request('http://x', { method: 'POST', body: JSON.stringify(body) }));

  it('rend un geste connu et un jeton qui le porte, premier tirage', async () => {
    const res = await tirer();
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.geste.texte).toBeTruthy();
    expect(json.peutRetirer).toBe(true);
    expect(await lireJetonGeste(json.jeton, ME)).toEqual({ geste: json.geste.code, tirage: 1 });
  });

  it('un seul nouveau tirage, et jamais le même geste', async () => {
    const premier = await signerJetonGeste({ userId: ME, geste: 'pouce', tirage: 1 });
    const res = await tirer({ precedent: premier });
    const json = await res.json();
    expect(json.geste.code).not.toBe('pouce');
    expect(json.peutRetirer).toBe(false);
    const second = json.jeton;
    expect((await tirer({ precedent: second })).status).toBe(409);
  });

  it('409 si une demande est en cours ou le profil déjà vérifié', async () => {
    etat({ derniere: { status: 'pending' } });
    expect((await tirer()).status).toBe(409);
    etat({ verifie: true });
    expect((await tirer()).status).toBe(409);
  });
});

describe('POST — envoyer le selfie', () => {
  it('crée la demande avec le geste relu dans le jeton, selfie sous verif/, profil intact', async () => {
    const jeton = await signerJetonGeste({ userId: ME, geste: 'pouce', tirage: 1 });
    fakeDb.verificationRequest.create.mockResolvedValue({ id: 'v1' });
    const res = await (await route()).POST(envoi({ selfie: selfie(), jeton }));
    expect(res.status).toBe(201);
    expect(mockUpload).toHaveBeenCalledWith(expect.any(File), ME, 'verif');
    expect(fakeDb.verificationRequest.create).toHaveBeenCalledWith({
      data: { userId: ME, selfieUrl: `/api/photos/${encodeURIComponent(`${ME}/verif/abc.jpg`)}`, challenge: 'pouce', status: 'pending' },
    });
    expect(fakeDb.profile.update).not.toHaveBeenCalled();
    expect(fakeDb.profile.upsert).not.toHaveBeenCalled();
    expect(await res.json()).toEqual({ statut: 'en_cours' });
  });

  it('400 sans jeton valide pour ce membre — rien n’est téléversé', async () => {
    const autre = await signerJetonGeste({ userId: AUTRE, geste: 'pouce', tirage: 1 });
    const cas: Record<string, string | File>[] = [{ selfie: selfie() }, { selfie: selfie(), jeton: autre }, { selfie: selfie(), jeton: 'nimporte' }];
    for (const champs of cas) {
      expect((await (await route()).POST(envoi(champs))).status).toBe(400);
    }
    expect(mockUpload).not.toHaveBeenCalled();
  });

  it('400 sans image, et le message de l’upload remonte tel quel', async () => {
    const jeton = await signerJetonGeste({ userId: ME, geste: 'pouce', tirage: 1 });
    expect((await (await route()).POST(envoi({ jeton }))).status).toBe(400);
    mockUpload.mockRejectedValueOnce(new Error('L\'image ne doit pas dépasser 5 Mo.'));
    const res = await (await route()).POST(envoi({ selfie: selfie(), jeton }));
    expect(res.status).toBe(400);
    expect((await res.json()).error).toBe('L\'image ne doit pas dépasser 5 Mo.');
  });

  it('409 si une demande est déjà en cours ou le profil vérifié', async () => {
    const jeton = await signerJetonGeste({ userId: ME, geste: 'pouce', tirage: 1 });
    etat({ derniere: { status: 'pending' } });
    expect((await (await route()).POST(envoi({ selfie: selfie(), jeton }))).status).toBe(409);
    etat({ verifie: true });
    expect((await (await route()).POST(envoi({ selfie: selfie(), jeton }))).status).toBe(409);
    expect(mockUpload).not.toHaveBeenCalled();
  });
});
