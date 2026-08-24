/**
 * Tests — reset paresseux de La Place (#13).
 *
 * Bug d'origine : le cron Vercel appelait `/api/square/reset`, qui exige un
 * `CRON_SECRET` absent de l'environnement de prod. La route répondait 401 à
 * chaque passage, sans bruit, et la Place n'a jamais été nettoyée. Le reset est
 * désormais porté par le trafic ; ce qu'il faut verrouiller, c'est qu'il
 * s'exécute **une seule fois** par journée et qu'il ne casse jamais la lecture.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

const fakeDb = {
  squareState: { updateMany: vi.fn(), create: vi.fn() },
  squareReaction: { deleteMany: vi.fn() },
  squareMessage: { deleteMany: vi.fn() },
  squareMessageReport: { deleteMany: vi.fn() },
};
vi.mock('@/lib/db', () => ({ __esModule: true, getDb: () => fakeDb }));

const addSystemMessage = vi.fn();
const broadcastReset = vi.fn();
vi.mock('@/lib/square/store', () => ({
  __esModule: true,
  addSystemMessage: (...args: unknown[]) => addSystemMessage(...args),
  broadcastReset: () => broadcastReset(),
}));
vi.mock('@/lib/square/themes-server', () => ({
  __esModule: true,
  getTodayThemeConfig: async () => ({ label: 'Thème du jour', description: 'Une description.' }),
}));

const { ensureSquareFresh, resetSquare, _oublierBorneConnue } = await import('../reset');

const MIDI = new Date('2026-08-24T12:00:00Z');
const BORNE = new Date('2026-08-24T02:00:00.000Z');

beforeEach(() => {
  vi.clearAllMocks();
  _oublierBorneConnue();
  fakeDb.squareReaction.deleteMany.mockResolvedValue({ count: 3 });
  fakeDb.squareMessage.deleteMany.mockResolvedValue({ count: 8 });
  fakeDb.squareMessageReport.deleteMany.mockResolvedValue({ count: 0 });
});

describe('ensureSquareFresh — une seule purge par journée', () => {
  it('purge quand le témoin est en retard sur la borne du jour', async () => {
    fakeDb.squareState.updateMany.mockResolvedValue({ count: 1 });

    const outcome = await ensureSquareFresh(MIDI);

    expect(outcome).toEqual({ reset: true, deletedMessages: 8, deletedReactions: 3 });
    // C'est la borne UTC qui est inscrite, pas l'instant d'exécution : deux
    // instances de la même journée écrivent la même valeur.
    expect(fakeDb.squareState.updateMany).toHaveBeenCalledWith({
      where: { id: 'singleton', lastResetAt: { lt: BORNE } },
      data: { lastResetAt: BORNE },
    });
    expect(broadcastReset).toHaveBeenCalledTimes(1);
  });

  it('ne purge pas deux fois : le perdant de la course ne touche à rien', async () => {
    fakeDb.squareState.updateMany.mockResolvedValue({ count: 0 });
    fakeDb.squareState.create.mockRejectedValue(new Error('duplicate key'));

    const outcome = await ensureSquareFresh(MIDI);

    expect(outcome.reset).toBe(false);
    expect(fakeDb.squareMessage.deleteMany).not.toHaveBeenCalled();
    expect(addSystemMessage).not.toHaveBeenCalled();
  });

  it('pose le témoin à la première exécution, quand la ligne n’existe pas', async () => {
    fakeDb.squareState.updateMany.mockResolvedValue({ count: 0 });
    fakeDb.squareState.create.mockResolvedValue({ id: 'singleton', lastResetAt: BORNE });

    const outcome = await ensureSquareFresh(MIDI);

    expect(outcome.reset).toBe(true);
    expect(fakeDb.squareState.create).toHaveBeenCalledWith({
      data: { id: 'singleton', lastResetAt: BORNE },
    });
  });

  it('n’interroge plus la base une fois la journée connue', async () => {
    fakeDb.squareState.updateMany.mockResolvedValue({ count: 1 });
    await ensureSquareFresh(MIDI);
    await ensureSquareFresh(new Date('2026-08-24T18:00:00Z'));

    expect(fakeDb.squareState.updateMany).toHaveBeenCalledTimes(1);
  });

  it('repurge le lendemain, une fois la borne franchie', async () => {
    fakeDb.squareState.updateMany.mockResolvedValue({ count: 1 });
    await ensureSquareFresh(MIDI);
    await ensureSquareFresh(new Date('2026-08-25T02:30:00Z'));

    expect(fakeDb.squareState.updateMany).toHaveBeenCalledTimes(2);
    expect(fakeDb.squareMessage.deleteMany).toHaveBeenCalledTimes(2);
  });
});

describe('ensureSquareFresh — ne casse jamais la lecture', () => {
  it('avale une panne de base et laisse la Place se charger', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    fakeDb.squareState.updateMany.mockRejectedValue(new Error('Can’t reach database server'));

    await expect(ensureSquareFresh(MIDI)).resolves.toEqual({
      reset: false, deletedMessages: 0, deletedReactions: 0,
    });
  });

  it('retente au passage suivant quand la tentative a échoué', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    fakeDb.squareState.updateMany.mockRejectedValueOnce(new Error('timeout'));
    fakeDb.squareState.updateMany.mockResolvedValue({ count: 1 });

    await ensureSquareFresh(MIDI);
    const seconde = await ensureSquareFresh(MIDI);

    expect(seconde.reset).toBe(true);
  });
});

describe('resetSquare — ce que la purge laisse debout', () => {
  it('garde les signalements en attente et annonce le thème du jour', async () => {
    await resetSquare();

    expect(fakeDb.squareMessageReport.deleteMany).toHaveBeenCalledWith({
      where: { status: { not: 'pending' } },
    });
    expect(addSystemMessage).toHaveBeenCalledWith(
      expect.stringContaining('Thème du jour'),
    );
  });
});
