/**
 * Tests unitaires — Stub notifyContact.
 *
 * Cf. docs/roadmap/chantiers/01-securite/plan.md tâche 2.7.
 *
 * On vérifie :
 * 1. Le stub retourne toujours 'sent' en V1
 * 2. Le log est structuré (JSON) avec tous les champs attendus
 * 3. Les dates sont sérialisées en ISO
 * 4. La position (lastLat/lng) est `null` si non fournie
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { notifyContactExpired } from '../notify';

describe('notifyContactExpired (V1 stub)', () => {
  let consoleSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
  });

  afterEach(() => {
    consoleSpy.mockRestore();
  });

  it('retourne toujours { status: "sent" } en V1', async () => {
    const result = await notifyContactExpired({
      contact: { id: 'contact-1', pseudonym: 'Marie' },
      owner: { id: 'owner-1', pseudonym: 'Julie' },
      checkin: {
        id: 'checkin-1',
        triggeredAt: new Date('2026-06-10T10:00:00Z'),
        expiresAt: new Date('2026-06-10T10:30:00Z'),
      },
    });
    expect(result).toEqual({ status: 'sent' });
  });

  it('log un JSON structuré avec tous les champs', async () => {
    await notifyContactExpired({
      contact: { id: 'c-1', pseudonym: 'Marie' },
      owner: { id: 'o-1', pseudonym: 'Julie' },
      checkin: {
        id: 'ci-1',
        triggeredAt: new Date('2026-06-10T10:00:00Z'),
        expiresAt: new Date('2026-06-10T10:30:00Z'),
      },
    });

    expect(consoleSpy).toHaveBeenCalledTimes(1);
    const logged = JSON.parse(consoleSpy.mock.calls[0][0] as string);

    expect(logged.event).toBe('checkin.notify.stub');
    expect(logged.deliveryChannel).toBe('stub');
    expect(logged.contact).toEqual({ id: 'c-1', pseudonym: 'Marie' });
    expect(logged.owner).toEqual({ id: 'o-1', pseudonym: 'Julie' });
    expect(logged.checkin.id).toBe('ci-1');
    expect(logged.checkin.triggeredAt).toBe('2026-06-10T10:00:00.000Z');
    expect(logged.checkin.expiresAt).toBe('2026-06-10T10:30:00.000Z');
  });

  it('serialize les dates en ISO 8601', async () => {
    await notifyContactExpired({
      contact: { id: 'c', pseudonym: 'p' },
      owner: { id: 'o', pseudonym: 'p' },
      checkin: {
        id: 'ci',
        triggeredAt: new Date('2026-01-15T08:00:00Z'),
        expiresAt: new Date('2026-01-15T08:30:00Z'),
      },
    });

    const logged = JSON.parse(consoleSpy.mock.calls[0][0] as string);
    // ISO 8601 strict
    expect(logged.checkin.triggeredAt).toMatch(
      /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/,
    );
    expect(logged.checkin.expiresAt).toMatch(
      /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/,
    );
  });

  it('position null si non fournie (V1)', async () => {
    await notifyContactExpired({
      contact: { id: 'c', pseudonym: 'p' },
      owner: { id: 'o', pseudonym: 'p' },
      checkin: {
        id: 'ci',
        triggeredAt: new Date(),
        expiresAt: new Date(),
        // Pas de lastLat/lng
      },
    });

    const logged = JSON.parse(consoleSpy.mock.calls[0][0] as string);
    expect(logged.checkin.lastLat).toBeNull();
    expect(logged.checkin.lastLng).toBeNull();
  });

  it('position préservée si fournie', async () => {
    await notifyContactExpired({
      contact: { id: 'c', pseudonym: 'p' },
      owner: { id: 'o', pseudonym: 'p' },
      checkin: {
        id: 'ci',
        triggeredAt: new Date(),
        expiresAt: new Date(),
        lastLat: 48.8566,
        lastLng: 2.3522,
      },
    });

    const logged = JSON.parse(consoleSpy.mock.calls[0][0] as string);
    expect(logged.checkin.lastLat).toBe(48.8566);
    expect(logged.checkin.lastLng).toBe(2.3522);
  });

  it('ne throw jamais (V1 stub = toujours safe)', async () => {
    // Meme avec des inputs limites
    await expect(
      notifyContactExpired({
        contact: { id: '', pseudonym: '' },
        owner: { id: '', pseudonym: '' },
        checkin: {
          id: '',
          triggeredAt: new Date(0),
          expiresAt: new Date(0),
        },
      }),
    ).resolves.toBeDefined();
  });
});
