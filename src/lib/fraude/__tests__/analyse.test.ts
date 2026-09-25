import { describe, it, expect, vi, beforeEach } from 'vitest';

const lireTexte = vi.fn();
vi.mock('../lecture-photo', () => ({ __esModule: true, lireTexte }));
const enregistrerSignal = vi.fn(async () => true);
vi.mock('../signaux', () => ({ __esModule: true, enregistrerSignal }));

const { analyserPhoto } = await import('../analyse');
const img = Buffer.from('img');

beforeEach(() => vi.clearAllMocks());

describe('analyserPhoto (#443)', () => {
  it('le cas du 2026-09-24 : un identifiant Telegram sur la photo lève un signal fort', async () => {
    lireTexte.mockResolvedValue('Telegram : @lola_privee75\n');
    await analyserPhoto({ userId: 'u1', photoKey: 'p/1.webp', buffer: img });
    expect(enregistrerSignal).toHaveBeenCalledWith({
      userId: 'u1',
      type: 'contact_photo',
      force: 'fort',
      extrait: expect.stringContaining('@lola_privee75'),
      photoKey: 'p/1.webp',
    });
  });

  it('un contact faible lu sur la photo lève un signal faible', async () => {
    lireTexte.mockResolvedValue('Pas de Snapchat');
    await analyserPhoto({ userId: 'u1', photoKey: 'p/1.webp', buffer: img });
    expect(enregistrerSignal).toHaveBeenCalledWith(expect.objectContaining({ force: 'faible' }));
  });

  it('une photo sans texte ne lève rien', async () => {
    lireTexte.mockResolvedValue('');
    await analyserPhoto({ userId: 'u1', photoKey: 'p/1.webp', buffer: img });
    expect(enregistrerSignal).not.toHaveBeenCalled();
  });

  it('ne jette jamais', async () => {
    lireTexte.mockRejectedValue(new Error('boom'));
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    await expect(analyserPhoto({ userId: 'u1', photoKey: 'p/1.webp', buffer: img })).resolves.toBeUndefined();
    warn.mockRestore();
  });
});
