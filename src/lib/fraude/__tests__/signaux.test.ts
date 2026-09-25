import { describe, it, expect, vi, beforeEach } from 'vitest';

const upsert = vi.fn();
vi.mock('@/lib/db', () => ({ __esModule: true, getDb: () => ({ profileSignal: { upsert } }) }));

const { enregistrerSignal, cleDeSignal, dansLaFile } = await import('../signaux');

beforeEach(() => {
  upsert.mockReset();
  upsert.mockResolvedValue({});
});

describe('cleDeSignal', () => {
  it('normalise le contenu : casse, espaces et accents ne créent pas un second signal', () => {
    expect(cleDeSignal('contact_bio', { extrait: 'T . me / Lola' })).toBe(cleDeSignal('contact_bio', { extrait: 't.me/lola' }));
  });

  it('préfère une clé explicite, puis la photo', () => {
    expect(cleDeSignal('signalement_faux', { cle: 'r1', extrait: 'x' })).toBe('signalement_faux:r1');
    expect(cleDeSignal('contact_photo', { photoKey: 'p/1.webp', extrait: '@lola' })).toBe('contact_photo:p/1.webp:@lola');
  });
});

describe('enregistrerSignal', () => {
  it('upsert sur (userId, cle) sans rien écraser : un signal ne rouvre pas un dossier tranché', async () => {
    await enregistrerSignal({ userId: 'u1', type: 'contact_bio', force: 'fort', extrait: 't.me/lola' });
    const arg = upsert.mock.calls[0][0];
    expect(arg.where).toEqual({ userId_cle: { userId: 'u1', cle: 'contact_bio:t.me/lola' } });
    expect(arg.update).toEqual({});
    expect(arg.create).toMatchObject({ userId: 'u1', type: 'contact_bio', force: 'fort', extrait: 't.me/lola' });
  });

  it('tronque l’extrait à 200 caractères', async () => {
    await enregistrerSignal({ userId: 'u1', type: 'contact_bio', force: 'faible', extrait: 'a'.repeat(500) });
    expect(upsert.mock.calls[0][0].create.extrait).toHaveLength(200);
  });

  it('ne jette jamais : un signal perdu ne casse pas la requête du membre', async () => {
    upsert.mockRejectedValue(new Error('db down'));
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    await expect(enregistrerSignal({ userId: 'u1', type: 'contact_bio', force: 'fort', extrait: 'x' })).resolves.toBe(false);
    expect(JSON.stringify(warn.mock.calls)).not.toContain('u1');
    warn.mockRestore();
  });
});

describe('dansLaFile', () => {
  const t = (iso: string) => new Date(iso);
  const s = (type: string, force: 'faible' | 'fort', createdAt = '2026-09-25') => ({ type, force, createdAt: t(createdAt) });

  it('entre sur un signal fort', () => {
    expect(dansLaFile([s('contact_photo', 'fort')], null)).toBe(true);
  });

  it('entre sur deux signaux faibles, pas sur un seul', () => {
    expect(dansLaFile([s('contact_bio', 'faible')], null)).toBe(false);
    expect(dansLaFile([s('contact_bio', 'faible'), s('contact_pseudo', 'faible')], null)).toBe(true);
  });

  it('entre sur un signalement « faux profil », même faible', () => {
    expect(dansLaFile([s('signalement_faux', 'faible')], null)).toBe(true);
  });

  it('« photo récupérée » seule ne compte jamais', () => {
    expect(dansLaFile([s('photo_recuperee', 'faible'), s('photo_recuperee', 'faible')], null)).toBe(false);
    expect(dansLaFile([s('photo_recuperee', 'faible'), s('contact_bio', 'faible')], null)).toBe(true);
  });

  it('ignore les signaux antérieurs à la dernière décision', () => {
    expect(dansLaFile([s('contact_photo', 'fort', '2026-09-20')], t('2026-09-21'))).toBe(false);
    expect(dansLaFile([s('contact_photo', 'fort', '2026-09-22')], t('2026-09-21'))).toBe(true);
  });
});
