import { describe, it, expect, vi, beforeEach } from 'vitest';

const fakeDb = {
  photoFingerprint: { findMany: vi.fn() },
  bannedPhotoFingerprint: { createMany: vi.fn() },
};
vi.mock('@/lib/db', () => ({ __esModule: true, getDb: () => fakeDb }));
const { retenirEmpreintesBannies } = await import('../bannissement');

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
    const bannissent = routes(racine).filter((f) => /data:\s*\{\s*isBanned:\s*(true|banned)/.test(readFileSync(f, 'utf8')));
    expect(bannissent.length).toBeGreaterThanOrEqual(3);
    for (const f of bannissent) {
      expect(readFileSync(f, 'utf8'), path.relative(racine, f)).toContain('retenirEmpreintesBannies(');
    }
  });
});
