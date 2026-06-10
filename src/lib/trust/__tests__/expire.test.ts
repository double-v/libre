/**
 * Tests unitaires — expireOverdueCheckins (lazy expiration on read).
 *
 * Cf. #94 — remplace le cron Vercel 5-minutes par une expiration à la volée.
 *
 * On vérifie :
 * 1. 0 checkin à expirer : 0 updateMany, retourne { expired: 0, alertsCreated: 0 }
 * 2. 1 checkin + 3 contacts : 1 updateMany, 3 alertes, retourne { expired: 1, alertsCreated: 3 }
 * 3. N checkins indépendants : N updateMany indépendants, alertes correctes
 * 4. checkin expiré sans contact : log warn, 0 alerte, compte quand même expired=1
 * 5. idempotence : si updateMany retourne count=0 (race), on skip sans créer d alerte
 * 6. log un résumé du nombre d expirations et d alertes créées
 *
 * Pattern : on mock le PrismaClient minimal (findMany, updateMany, createMany).
 * Le but est de tester la logique de la fonction, pas Prisma.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { expireOverdueCheckins } from '../expire';

// Helper : crée un mock PrismaClient avec les méthodes utilisées.
// `findMany` est typiquement différent entre safetyCheckin (1er appel)
// et trustContact (2e appel). On prend donc 2 callbacks séparés.
function makeMockDb(overrides: {
  safetyCheckinFindMany?: ReturnType<typeof vi.fn>;
  trustContactFindMany?: ReturnType<typeof vi.fn>;
  updateMany?: ReturnType<typeof vi.fn>;
  createMany?: ReturnType<typeof vi.fn>;
} = {}) {
  return {
    safetyCheckin: {
      findMany: overrides.safetyCheckinFindMany ?? vi.fn().mockResolvedValue([]),
      updateMany: overrides.updateMany ?? vi.fn().mockResolvedValue({ count: 0 }),
    },
    trustContact: {
      findMany: overrides.trustContactFindMany ?? vi.fn().mockResolvedValue([]),
    },
    checkinAlert: {
      createMany: overrides.createMany ?? vi.fn().mockResolvedValue({ count: 0 }),
    },
  } as unknown as Parameters<typeof expireOverdueCheckins>[0];
}

describe('expireOverdueCheckins', () => {
  let warnSpy: ReturnType<typeof vi.spyOn>;
  let logSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
  });

  afterEach(() => {
    warnSpy.mockRestore();
    logSpy.mockRestore();
  });

  it('retourne { expired: 0, alertsCreated: 0 } si aucun checkin à expirer', async () => {
    const db = makeMockDb({
      safetyCheckinFindMany: vi.fn().mockResolvedValue([]),
    });

    const result = await expireOverdueCheckins(db, new Date('2026-06-10T10:00:00Z'));

    expect(result).toEqual({ expired: 0, alertsCreated: 0 });
  });

  it('expire 1 checkin et crée 1 alerte par contact du cercle', async () => {
    const now = new Date('2026-06-10T10:00:00Z');
    const db = makeMockDb({
      safetyCheckinFindMany: vi
        .fn()
        .mockResolvedValueOnce([{ id: 'checkin-1', userId: 'user-1' }]),
      trustContactFindMany: vi
        .fn()
        .mockResolvedValueOnce([{ id: 'contact-1' }, { id: 'contact-2' }, { id: 'contact-3' }]),
      updateMany: vi.fn().mockResolvedValue({ count: 1 }),
      createMany: vi.fn().mockResolvedValue({ count: 3 }),
    });

    const result = await expireOverdueCheckins(db, now);

    expect(result).toEqual({ expired: 1, alertsCreated: 3 });

    // Le findMany a bien filtré sur status='active' + expiresAt < now
    expect(db.safetyCheckin.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          status: 'active',
          expiresAt: expect.objectContaining({ lt: now }),
        }),
      }),
    );

    // L'updateMany est atomique : on filtre aussi sur status='active'
    // pour éviter le race avec un autre process concurrent
    expect(db.safetyCheckin.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ id: 'checkin-1', status: 'active' }),
        data: expect.objectContaining({ status: 'expired', resolvedAt: now }),
      }),
    );

    // 3 alertes créées, une par contact, deliveryStatus='queued'
    expect(db.checkinAlert.createMany).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.arrayContaining([
          expect.objectContaining({ checkinId: 'checkin-1', contactId: 'contact-1', deliveryStatus: 'queued' }),
          expect.objectContaining({ checkinId: 'checkin-1', contactId: 'contact-2', deliveryStatus: 'queued' }),
          expect.objectContaining({ checkinId: 'checkin-1', contactId: 'contact-3', deliveryStatus: 'queued' }),
        ]),
      }),
    );
  });

  it('expire N checkins indépendants', async () => {
    const now = new Date('2026-06-10T10:00:00Z');
    const db = makeMockDb({
      safetyCheckinFindMany: vi
        .fn()
        .mockResolvedValueOnce([
          { id: 'c-1', userId: 'u-1' },
          { id: 'c-2', userId: 'u-2' },
          { id: 'c-3', userId: 'u-3' },
          { id: 'c-4', userId: 'u-4' },
          { id: 'c-5', userId: 'u-5' },
        ]),
      // Tous les users ont 2 contacts : on répond la même chose à chaque appel
      trustContactFindMany: vi
        .fn()
        .mockResolvedValue([{ id: 'contact-x' }, { id: 'contact-y' }]),
      updateMany: vi.fn().mockResolvedValue({ count: 1 }),
      createMany: vi.fn().mockResolvedValue({ count: 2 }),
    });

    const result = await expireOverdueCheckins(db, now);

    expect(result).toEqual({ expired: 5, alertsCreated: 10 });
    expect(db.safetyCheckin.updateMany).toHaveBeenCalledTimes(5);
  });

  it('expire un checkin sans contact : log warn, expired=1, alertsCreated=0', async () => {
    const now = new Date('2026-06-10T10:00:00Z');
    const db = makeMockDb({
      safetyCheckinFindMany: vi
        .fn()
        .mockResolvedValueOnce([{ id: 'checkin-orphan', userId: 'user-orphan' }]),
      trustContactFindMany: vi.fn().mockResolvedValueOnce([]),
      updateMany: vi.fn().mockResolvedValue({ count: 1 }),
    });

    const result = await expireOverdueCheckins(db, now);

    expect(result).toEqual({ expired: 1, alertsCreated: 0 });
    expect(warnSpy).toHaveBeenCalledWith(
      expect.stringContaining('checkin-orphan'),
    );
    expect(warnSpy).toHaveBeenCalledWith(
      expect.stringContaining('user-orphan'),
    );
    expect(db.checkinAlert.createMany).not.toHaveBeenCalled();
  });

  it("idempotent : si l'updateMany retourne count=0 (race), on skip sans créer d'alerte", async () => {
    const now = new Date('2026-06-10T10:00:00Z');
    const db = makeMockDb({
      safetyCheckinFindMany: vi
        .fn()
        .mockResolvedValueOnce([{ id: 'checkin-raced', userId: 'user-1' }]),
      // Un autre process a déjà expiré ce checkin
      updateMany: vi.fn().mockResolvedValue({ count: 0 }),
    });

    const result = await expireOverdueCheckins(db, now);

    expect(result).toEqual({ expired: 0, alertsCreated: 0 });
    expect(db.checkinAlert.createMany).not.toHaveBeenCalled();
  });

  it('log un résumé du nombre d expirations et d alertes créées', async () => {
    const now = new Date('2026-06-10T10:00:00Z');
    const db = makeMockDb({
      safetyCheckinFindMany: vi
        .fn()
        .mockResolvedValueOnce([{ id: 'c-1', userId: 'u-1' }]),
      trustContactFindMany: vi
        .fn()
        .mockResolvedValueOnce([{ id: 'contact-1' }, { id: 'contact-2' }]),
      updateMany: vi.fn().mockResolvedValue({ count: 1 }),
      createMany: vi.fn().mockResolvedValue({ count: 2 }),
    });

    await expireOverdueCheckins(db, now);

    expect(logSpy).toHaveBeenCalledWith(
      expect.stringContaining('processed 1 expired checkins, created 2 alerts'),
    );
  });
});
