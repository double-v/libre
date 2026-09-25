/**
 * Purge de rétention (#427) — chaque règle avec une ligne « dedans » et une
 * « dehors » de la fenêtre, et le verrou d'une exécution par jour.
 *
 * La politique §5 promettait ces durées ; rien ne les appliquait. Le test
 * fige l'écart de chaque seuil, et vérifie qu'une règle qui tombe n'empêche
 * pas les autres — une purge partielle vaut mieux qu'aucune.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { JOUR_MS } from '../regles';

const mockDeletePhoto = vi.fn();
vi.mock('@/lib/r2', () => ({ __esModule: true, deletePhoto: mockDeletePhoto, isR2Configured: () => true }));

const fakeDb = {
  moderationLog: { deleteMany: vi.fn(async () => ({ count: 2 })) },
  passwordResetToken: { deleteMany: vi.fn(async () => ({ count: 3 })) },
  verificationRequest: { findMany: vi.fn<(args: unknown) => Promise<unknown[]>>(async () => []), deleteMany: vi.fn(async () => ({ count: 0 })) },
  report: { deleteMany: vi.fn(async () => ({ count: 1 })) },
  feedback: { deleteMany: vi.fn(async () => ({ count: 1 })) },
  encounter: { deleteMany: vi.fn(async () => ({ count: 5 })) },
  safetyCheckin: { deleteMany: vi.fn(async () => ({ count: 1 })) },
  consent: { updateMany: vi.fn(async () => ({ count: 4 })) },
  message: { updateMany: vi.fn(async () => ({ count: 6 })) },
  profileReview: { findMany: vi.fn<(args: unknown) => Promise<unknown[]>>(async () => []) },
  profileSignal: { deleteMany: vi.fn(async () => ({ count: 2 })) },
  bannedPhotoFingerprint: { deleteMany: vi.fn(async () => ({ count: 3 })) },
  user: { findMany: vi.fn<(args: unknown) => Promise<unknown[]>>(async () => []) },
  retentionState: { updateMany: vi.fn(), create: vi.fn(), upsert: vi.fn(), findUnique: vi.fn() },
};
const mockEffacerCompte = vi.fn(async () => {});
vi.mock('@/lib/suppression-compte', () => ({ __esModule: true, effacerCompte: mockEffacerCompte }));
vi.mock('@/lib/db', () => ({ __esModule: true, getDb: () => fakeDb }));

const { purgerRetention, ensureRetentionFresh, borneDuJour, _resetBorneConnue } = await import('../purge');

const NOW = new Date('2026-09-21T10:00:00Z');
const il_y_a = (jours: number) => new Date(NOW.getTime() - jours * JOUR_MS);

beforeEach(() => {
  vi.clearAllMocks();
  _resetBorneConnue();
  fakeDb.verificationRequest.findMany.mockResolvedValue([]);
});

describe('purgerRetention — seuils', () => {
  it('logs de modération : plus de 3 ans', async () => {
    await purgerRetention(NOW);
    expect(fakeDb.moderationLog.deleteMany).toHaveBeenCalledWith({ where: { createdAt: { lt: il_y_a(3 * 365) } } });
  });

  it('tokens de réinitialisation : expirés ou utilisés', async () => {
    await purgerRetention(NOW);
    expect(fakeDb.passwordResetToken.deleteMany).toHaveBeenCalledWith({
      where: { OR: [{ expiresAt: { lt: NOW } }, { usedAt: { not: null } }] },
    });
  });

  it('signalements : résolus depuis plus d’un an (jamais les non résolus)', async () => {
    await purgerRetention(NOW);
    expect(fakeDb.report.deleteMany).toHaveBeenCalledWith({ where: { resolvedAt: { lt: il_y_a(365) } } });
  });

  it('retours : clos (resolved/spam) et créés il y a plus d’un an — jamais les ouverts', async () => {
    await purgerRetention(NOW);
    expect(fakeDb.feedback.deleteMany).toHaveBeenCalledWith({
      where: { status: { in: ['resolved', 'spam'] }, createdAt: { lt: il_y_a(365) } },
    });
  });

  it('croisements : plus de 90 jours', async () => {
    await purgerRetention(NOW);
    expect(fakeDb.encounter.deleteMany).toHaveBeenCalledWith({ where: { happenedAt: { lt: il_y_a(90) } } });
  });

  it('check-ins : résolus depuis plus de 30 jours', async () => {
    await purgerRetention(NOW);
    expect(fakeDb.safetyCheckin.deleteMany).toHaveBeenCalledWith({ where: { resolvedAt: { lt: il_y_a(30) } } });
  });

  it('trace de consentement : IP et navigateur effacés après 3 ans, la ligne reste', async () => {
    await purgerRetention(NOW);
    expect(fakeDb.consent.updateMany).toHaveBeenCalledWith({
      where: { createdAt: { lt: il_y_a(3 * 365) }, OR: [{ ipAddress: { not: null } }, { userAgent: { not: null } }] },
      data: { ipAddress: null, userAgent: null },
    });
  });

  it('messages effacés : 30 j après l’effacement, le chiffré est vidé — la pierre tombale reste (#202)', async () => {
    const bilan = await purgerRetention(NOW);
    expect(fakeDb.message.updateMany).toHaveBeenCalledWith({
      where: { deletedAt: { lt: il_y_a(30) }, content: { not: '' } },
      data: { content: '' },
    });
    expect(bilan.messagesEffaces).toBe(6);
  });

  it('signaux d’un dossier clos « rien » depuis 1 an : seuls ceux d’avant la décision partent (spec 006)', async () => {
    const decidedAt = new Date(NOW.getTime() - 400 * 24 * 3600 * 1000);
    fakeDb.profileReview.findMany.mockResolvedValue([{ userId: 'u1', decidedAt }]);
    const bilan = await purgerRetention(NOW);
    expect(fakeDb.profileReview.findMany).toHaveBeenCalledWith(expect.objectContaining({ where: { decision: 'rien', decidedAt: { lt: il_y_a(365) } } }));
    expect(fakeDb.profileSignal.deleteMany).toHaveBeenCalledWith({ where: { userId: 'u1', createdAt: { lte: decidedAt } } });
    expect(bilan.signauxTranches).toBe(2);
  });

  it('empreintes des bannis : un an après le bannissement (spec 006)', async () => {
    const bilan = await purgerRetention(NOW);
    expect(fakeDb.bannedPhotoFingerprint.deleteMany).toHaveBeenCalledWith({ where: { bannedAt: { lt: il_y_a(365) } } });
    expect(bilan.empreintesBannies).toBe(3);
  });

  it('comptes en retrait sans selfie depuis 90 j : effacés entièrement, sauf selfie en examen (#437)', async () => {
    fakeDb.user.findMany.mockResolvedValue([{ id: 'r1' }, { id: 'r2' }]);
    const bilan = await purgerRetention(NOW);
    expect(fakeDb.user.findMany).toHaveBeenCalledWith(expect.objectContaining({
      where: { retraitAt: { lt: il_y_a(90) }, isBanned: false, isVerified: false, verificationRequests: { none: { status: 'pending' } } },
    }));
    expect(mockEffacerCompte).toHaveBeenCalledWith('r1');
    expect(mockEffacerCompte).toHaveBeenCalledWith('r2');
    expect(bilan.retraitsSansSelfie).toBe(2);
  });

  it('selfies : résolus + 30 j → ligne effacée et objet R2 aussi, sauf si c’est encore une photo du profil', async () => {
    fakeDb.verificationRequest.findMany.mockResolvedValue([
      { id: 'v1', selfieUrl: '/api/photos/u1/selfie.jpg', user: { profile: { photos: [] } } },
      { id: 'v2', selfieUrl: 'https://x/api/photos/u2/portrait.jpg', user: { profile: { photos: ['u2/portrait.jpg'] } } },
      // Format du badge selfie (#436) : clé encodée, sous verif/.
      { id: 'v3', selfieUrl: `/api/photos/${encodeURIComponent('u3/verif/s.jpg')}`, user: { profile: { photos: [] } } },
    ]);
    fakeDb.verificationRequest.deleteMany.mockResolvedValue({ count: 3 });
    const bilan = await purgerRetention(NOW);
    expect(fakeDb.verificationRequest.findMany).toHaveBeenCalledWith(expect.objectContaining({ where: { resolvedAt: { lt: il_y_a(30) } } }));
    expect(mockDeletePhoto).toHaveBeenCalledTimes(2);
    expect(mockDeletePhoto).toHaveBeenCalledWith('u1/selfie.jpg');
    expect(mockDeletePhoto).toHaveBeenCalledWith('u3/verif/s.jpg');
    expect(fakeDb.verificationRequest.deleteMany).toHaveBeenCalledWith({ where: { id: { in: ['v1', 'v2', 'v3'] } } });
    expect(bilan.verificationRequests).toBe(3);
  });

  it('une règle qui tombe n’empêche pas les autres, et le bilan le dit', async () => {
    fakeDb.encounter.deleteMany.mockRejectedValueOnce(new Error('boom'));
    const bilan = await purgerRetention(NOW);
    expect(bilan.encounters).toEqual({ erreur: 'boom' });
    expect(bilan.reports).toBe(1);
    expect(bilan.consentTrace).toBe(4);
  });
});

describe('ensureRetentionFresh — une fois par jour, un seul gagnant', () => {
  it('réclame la journée par UPDATE … WHERE lastRunAt < borne, puis purge et enregistre le bilan', async () => {
    fakeDb.retentionState.updateMany.mockResolvedValue({ count: 1 });
    const res = await ensureRetentionFresh(NOW);
    expect(fakeDb.retentionState.updateMany).toHaveBeenCalledWith({
      where: { id: 'singleton', lastRunAt: { lt: borneDuJour(NOW) } },
      data: { lastRunAt: borneDuJour(NOW) },
    });
    expect(res.executee).toBe(true);
    expect(fakeDb.encounter.deleteMany).toHaveBeenCalled();
    expect(fakeDb.retentionState.updateMany).toHaveBeenLastCalledWith({
      where: { id: 'singleton' },
      data: { lastReport: expect.objectContaining({ encounters: 5 }) },
    });
  });

  it('première exécution : le témoin n’existe pas, le create tranche', async () => {
    fakeDb.retentionState.updateMany.mockResolvedValue({ count: 0 });
    fakeDb.retentionState.create.mockResolvedValue({});
    expect((await ensureRetentionFresh(NOW)).executee).toBe(true);
    expect(fakeDb.retentionState.create).toHaveBeenCalledWith({ data: { id: 'singleton', lastRunAt: borneDuJour(NOW) } });
  });

  it('journée déjà traitée (par une autre instance) : rien', async () => {
    fakeDb.retentionState.updateMany.mockResolvedValue({ count: 0 });
    fakeDb.retentionState.create.mockRejectedValue(new Error('unique'));
    expect((await ensureRetentionFresh(NOW)).executee).toBe(false);
    expect(fakeDb.encounter.deleteMany).not.toHaveBeenCalled();
  });

  it('même journée, même instance : un seul SELECT économisé, pas de second passage', async () => {
    fakeDb.retentionState.updateMany.mockResolvedValue({ count: 1 });
    await ensureRetentionFresh(NOW);
    await ensureRetentionFresh(new Date(NOW.getTime() + 3600_000));
    expect(fakeDb.encounter.deleteMany).toHaveBeenCalledTimes(1);
  });

  it('ne jette jamais : une base injoignable rend « pas exécutée »', async () => {
    fakeDb.retentionState.updateMany.mockRejectedValue(new Error('db down'));
    await expect(ensureRetentionFresh(NOW)).resolves.toEqual({ executee: false });
  });
});
