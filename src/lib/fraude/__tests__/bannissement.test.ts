import { describe, it, expect, vi, beforeEach, afterAll } from 'vitest';

const fakeDb = {
  photoFingerprint: { findMany: vi.fn() },
  bannedPhotoFingerprint: { createMany: vi.fn() },
  user: { findUnique: vi.fn() },
  bannedIdentityFingerprint: { createMany: vi.fn() },
};
vi.mock('@/lib/db', () => ({ __esModule: true, getDb: () => fakeDb }));
const { retenirEmpreintesBannies, retenirIdentiteBannie } = await import('../bannissement');
const secretAvant = process.env.NEXTAUTH_SECRET;
process.env.NEXTAUTH_SECRET = 'secret-de-test';

beforeEach(() => vi.clearAllMocks());

describe('retenirEmpreintesBannies (#445, FR-018)', () => {
  it('copie les empreintes du compte, sans photo', async () => {
    fakeDb.photoFingerprint.findMany.mockResolvedValue([{ hash: BigInt(3) }, { hash: BigInt(9) }]);
    fakeDb.bannedPhotoFingerprint.createMany.mockResolvedValue({ count: 2 });
    expect(await retenirEmpreintesBannies('u1')).toBe(2);
    expect(fakeDb.bannedPhotoFingerprint.createMany).toHaveBeenCalledWith({
      data: [{ hash: BigInt(3), bannedUserId: 'u1' }, { hash: BigInt(9), bannedUserId: 'u1' }],
    });
  });

  it('ne jette jamais', async () => {
    fakeDb.photoFingerprint.findMany.mockRejectedValue(new Error('db'));
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    expect(await retenirEmpreintesBannies('u1')).toBe(0);
    warn.mockRestore();
  });
});

describe('retenirIdentiteBannie (spec 010, FR-002)', () => {
  it('retient appareil et e-mail en HMAC, jamais en clair', async () => {
    fakeDb.user.findUnique.mockResolvedValue({ deviceId: 'dev-123', normalizedEmail: 'lola@example.test' });
    fakeDb.bannedIdentityFingerprint.createMany.mockResolvedValue({ count: 2 });
    expect(await retenirIdentiteBannie('u1')).toBe(2);
    const { data } = fakeDb.bannedIdentityFingerprint.createMany.mock.calls[0][0];
    expect(data.map((d: { kind: string }) => d.kind)).toEqual(['appareil', 'email']);
    expect(JSON.stringify(data)).not.toMatch(/dev-123|lola/);
    expect(data[0].hash).toMatch(/^[0-9a-f]{64}$/);
  });

  it('sans appareil connu, retient seulement l’e-mail', async () => {
    fakeDb.user.findUnique.mockResolvedValue({ deviceId: null, normalizedEmail: 'lola@example.test' });
    fakeDb.bannedIdentityFingerprint.createMany.mockResolvedValue({ count: 1 });
    await retenirIdentiteBannie('u1');
    expect(fakeDb.bannedIdentityFingerprint.createMany.mock.calls[0][0].data).toHaveLength(1);
  });

  it('le bannissement retient les deux volets, même si les photos échouent', async () => {
    fakeDb.user.findUnique.mockResolvedValue({ deviceId: 'd', normalizedEmail: 'e@x.test' });
    fakeDb.bannedIdentityFingerprint.createMany.mockResolvedValue({ count: 2 });
    fakeDb.photoFingerprint.findMany.mockRejectedValue(new Error('db'));
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    await retenirEmpreintesBannies('u1');
    expect(fakeDb.bannedIdentityFingerprint.createMany).toHaveBeenCalled();
    warn.mockRestore();
  });
});

afterAll(() => { process.env.NEXTAUTH_SECRET = secretAvant; });

describe('garde : chaque bannissement retient les empreintes (#445)', () => {
  it('toute route qui bannit appelle retenirEmpreintesBannies', async () => {
    const { readFileSync, readdirSync, statSync } = await import('node:fs');
    const path = await import('node:path');
    const racine = path.join(process.cwd(), 'src/app/api');
    const routes = (d: string): string[] =>
      readdirSync(d).flatMap((f) => {
        const p = path.join(d, f);
        if (statSync(p).isDirectory()) return f === '__tests__' ? [] : routes(p);
        return f === 'route.ts' ? [p] : [];
      });
    // Spec 011/012 : les gestes partagés (`src/lib/moderation/gestes.ts`)
    // portent désormais tous les bannissements des routes admin ; ils sont
    // gardés comme les routes, écriture par écriture.
    const gestes = path.join(process.cwd(), 'src/lib/moderation/gestes.ts');
    const ecriture = /data:\s*\{\s*isBanned:\s*(true|banned|banni)\b/;
    const ecritures = new RegExp(ecriture.source, 'g');
    const bannissent = [...routes(racine), gestes].filter((f) => ecriture.test(readFileSync(f, 'utf8')));
    expect(bannissent).toContain(gestes);
    for (const f of bannissent) {
      const texte = readFileSync(f, 'utf8');
      const nbBans = texte.match(ecritures)?.length ?? 0;
      const nbRetenues = texte.match(/retenirEmpreintesBannies\(/g)?.length ?? 0;
      expect(nbRetenues, path.relative(racine, f)).toBeGreaterThanOrEqual(nbBans);
    }
    // Signalement, dossier d'indices, fiche : trois chemins qui bannissent.
    expect(readFileSync(gestes, 'utf8').match(ecritures)?.length).toBeGreaterThanOrEqual(3);
  });
});
