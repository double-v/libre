/**
 * Tests — envoi Web Push côté serveur (#392/#393, spec 003 R9, T045/T067).
 *
 * `web-push` et la base sont mockés : on vérifie ce que le module promet,
 * pas le protocole. Trois promesses : chaque abonnement de la personne reçoit ;
 * un envoi qui échoue n'échappe jamais (best-effort, SC-008) et nettoie les
 * abonnements morts (404/410) ; la charge utile ne transporte ni contenu, ni
 * nom, ni motif (SC-006) — on la sérialise et on cherche ce qui ne doit pas
 * y être, plutôt que de vérifier ce qui y est.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

const mockSendNotification = vi.fn();
const mockSetVapidDetails = vi.fn();
vi.mock('web-push', () => ({
  __esModule: true,
  default: { sendNotification: mockSendNotification, setVapidDetails: mockSetVapidDetails },
}));

const fakeDb = {
  pushSubscription: { findMany: vi.fn(), delete: vi.fn(), update: vi.fn() },
};
vi.mock('@/lib/db', () => ({ __esModule: true, getDb: () => fakeDb }));

const { sendPushToUser, sendPushToAdmins, buildPayload } = await import('../server');

const sub = (id: string, userId = 'u1') => ({
  id,
  userId,
  endpoint: `https://push.example/${id}`,
  p256dh: 'p',
  auth: 'a',
});

function withVapid() {
  process.env.VAPID_PUBLIC_KEY = 'pub';
  process.env.VAPID_PRIVATE_KEY = 'priv';
  process.env.VAPID_SUBJECT = 'mailto:x@y.z';
}

beforeEach(() => {
  vi.clearAllMocks();
  withVapid();
  mockSendNotification.mockResolvedValue({ statusCode: 201 });
  fakeDb.pushSubscription.findMany.mockResolvedValue([]);
  fakeDb.pushSubscription.delete.mockResolvedValue({});
  fakeDb.pushSubscription.update.mockResolvedValue({});
  vi.spyOn(console, 'error').mockImplementation(() => {});
  vi.spyOn(console, 'info').mockImplementation(() => {});
});
afterEach(() => {
  vi.restoreAllMocks();
  delete process.env.VAPID_PRIVATE_KEY;
});

describe('buildPayload — rien qui identifie ou révèle (SC-006)', () => {
  const secrets = {
    content: 'coucou c’est moi',
    displayName: 'Camille',
    reason: 'harcèlement',
    reporterName: 'Sam',
    reportedName: 'Noor',
    message: 'le site bug',
    url: 'https://libre.example/profile/123',
    // Ville saisie à la main (#402) : privée, même pour la membre elle-même
    // dans une notification qui transite par un tiers.
    cityLabel: 'Saint-Denis (93)',
    positionSource: 'city',
  };
  const cases = [
    ['message', buildPayload('message', { conversationId: 'c1', ...secrets })],
    ['match', buildPayload('match', secrets)],
    ['admin-report', buildPayload('admin-report', secrets)],
    ['admin-feedback', buildPayload('admin-feedback', secrets)],
  ] as const;

  for (const [kind, payload] of cases) {
    it(`${kind} : la charge sérialisée ne contient aucun des champs sensibles`, () => {
      const json = JSON.stringify(payload);
      for (const value of Object.values(secrets)) {
        expect(json, `${kind} laisse fuir « ${value} »`).not.toContain(value);
      }
      expect(payload.kind).toBe(kind);
      expect(payload.title).toBeTruthy();
      expect(payload.body).toBeTruthy();
      expect(payload.url.startsWith('/')).toBe(true);
    });
  }

  it('message : ouvre la conversation, un tag par conversation ; match : /messages', () => {
    const m = buildPayload('message', { conversationId: 'c1' });
    expect(m.url).toBe('/chat/c1');
    expect(m.tag).toBe('conv-c1');
    const x = buildPayload('match', {});
    expect(x.url).toBe('/messages');
    expect(x.tag).toBe('match');
  });

  it('admin : ouvre la file concernée', () => {
    expect(buildPayload('admin-report', {}).url).toBe('/admin/reports');
    expect(buildPayload('admin-feedback', {}).url).toBe('/admin/feedback');
  });
});

describe('sendPushToUser', () => {
  it('envoie à chaque abonnement de la personne, avec le TTL du kind, et note lastUsedAt', async () => {
    fakeDb.pushSubscription.findMany.mockResolvedValue([sub('s1'), sub('s2')]);
    await sendPushToUser('u1', buildPayload('message', { conversationId: 'c1' }));

    expect(fakeDb.pushSubscription.findMany).toHaveBeenCalledWith(expect.objectContaining({ where: { userId: 'u1' } }));
    expect(mockSendNotification).toHaveBeenCalledTimes(2);
    const [target, body, opts] = mockSendNotification.mock.calls[0];
    expect(target).toEqual({ endpoint: 'https://push.example/s1', keys: { p256dh: 'p', auth: 'a' } });
    expect(JSON.parse(body).url).toBe('/chat/c1');
    expect(opts).toEqual(expect.objectContaining({ TTL: 24 * 3600, urgency: 'normal' }));
    expect(fakeDb.pushSubscription.update).toHaveBeenCalledTimes(2);
    expect(fakeDb.pushSubscription.update).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: 's1' }, data: { lastUsedAt: expect.any(Date) } }),
    );
  });

  it('TTL de 7 jours pour les notifications admin', async () => {
    fakeDb.pushSubscription.findMany.mockResolvedValue([sub('s1')]);
    await sendPushToUser('u1', buildPayload('admin-report', {}));
    expect(mockSendNotification.mock.calls[0][2]).toEqual(expect.objectContaining({ TTL: 7 * 24 * 3600 }));
  });

  it('supprime un abonnement mort (410 / 404), continue avec les autres', async () => {
    fakeDb.pushSubscription.findMany.mockResolvedValue([sub('dead'), sub('gone'), sub('ok')]);
    mockSendNotification
      .mockRejectedValueOnce({ statusCode: 410 })
      .mockRejectedValueOnce({ statusCode: 404 })
      .mockResolvedValueOnce({ statusCode: 201 });
    await expect(sendPushToUser('u1', buildPayload('match', {}))).resolves.toBeUndefined();
    expect(fakeDb.pushSubscription.delete).toHaveBeenCalledTimes(2);
    expect(fakeDb.pushSubscription.delete).toHaveBeenCalledWith({ where: { id: 'dead' } });
    expect(fakeDb.pushSubscription.delete).toHaveBeenCalledWith({ where: { id: 'gone' } });
    expect(fakeDb.pushSubscription.update).toHaveBeenCalledTimes(1);
    expect(fakeDb.pushSubscription.update).toHaveBeenCalledWith(expect.objectContaining({ where: { id: 'ok' } }));
  });

  it('une autre erreur est journalisée sans PII, sans throw, sans suppression', async () => {
    fakeDb.pushSubscription.findMany.mockResolvedValue([sub('s1')]);
    mockSendNotification.mockRejectedValueOnce(Object.assign(new Error('boom https://push.example/s1'), { statusCode: 500 }));
    await expect(sendPushToUser('u1', buildPayload('message', { conversationId: 'c1' }))).resolves.toBeUndefined();
    expect(fakeDb.pushSubscription.delete).not.toHaveBeenCalled();
    const logged = JSON.stringify((console.error as unknown as { mock: { calls: unknown[] } }).mock.calls);
    expect(logged).toContain('push.send.failed');
    expect(logged).toContain('500');
    expect(logged).not.toContain('u1');
    expect(logged).not.toContain('push.example');
  });

  it('même la base qui tombe ne fait pas échouer l’appelant', async () => {
    fakeDb.pushSubscription.findMany.mockRejectedValue(new Error('db down'));
    await expect(sendPushToUser('u1', buildPayload('match', {}))).resolves.toBeUndefined();
  });

  it('sans VAPID_PRIVATE_KEY : no-op journalisé, aucune lecture en base', async () => {
    delete process.env.VAPID_PRIVATE_KEY;
    await sendPushToUser('u1', buildPayload('match', {}));
    expect(fakeDb.pushSubscription.findMany).not.toHaveBeenCalled();
    expect(mockSendNotification).not.toHaveBeenCalled();
    expect(console.info).toHaveBeenCalledWith(expect.stringContaining('push.disabled'), expect.anything());
  });

  it('VAPID mal configurée (setVapidDetails lève) : journalisé, no-op, ne lève pas', async () => {
    mockSetVapidDetails.mockImplementationOnce(() => { throw new Error('Vapid subject is not a valid URL'); });
    fakeDb.pushSubscription.findMany.mockResolvedValue([sub('s1')]);
    await expect(sendPushToUser('u1', buildPayload('match', {}))).resolves.toBeUndefined();
    expect(mockSendNotification).not.toHaveBeenCalled();
    expect(console.error).toHaveBeenCalledWith('push.send.failed', expect.objectContaining({ status: 'vapid_config' }));
  });

  it('sans abonnement : rien envoyé, rien journalisé en erreur', async () => {
    await sendPushToUser('u1', buildPayload('match', {}));
    expect(mockSendNotification).not.toHaveBeenCalled();
    expect(console.error).not.toHaveBeenCalled();
  });
});

describe('sendPushToAdmins (#393)', () => {
  it("cible uniquement les abonnements des comptes ADMIN", async () => {
    fakeDb.pushSubscription.findMany.mockResolvedValue([sub('a1', 'admin-1'), sub('a2', 'admin-2')]);
    await sendPushToAdmins(buildPayload('admin-report', {}));
    // Insensible à la casse, comme auth.ts / admin.ts : un rôle « admin » stocké
    // en minuscules est admin partout ailleurs, il doit l'être ici aussi.
    expect(fakeDb.pushSubscription.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { user: { role: { equals: 'ADMIN', mode: 'insensitive' } } } }),
    );
    expect(mockSendNotification).toHaveBeenCalledTimes(2);
  });

  it('aucun admin abonné → no-op', async () => {
    await sendPushToAdmins(buildPayload('admin-feedback', {}));
    expect(mockSendNotification).not.toHaveBeenCalled();
  });
});
