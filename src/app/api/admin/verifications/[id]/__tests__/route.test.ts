// @vitest-environment node
/**
 * PATCH /api/admin/verifications/[id] (#436, spec 012) — trancher une demande de badge.
 *
 * Base factice à état : on lit ce qui est écrit (statut, badge, journal,
 * notifications envoyées), pas les appels. Deux modérateurs qui décident en
 * même temps ne doivent écrire qu'une décision (second modérateur, R11).
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

const mockGetServerSession = vi.fn();
vi.mock('next-auth', () => ({ __esModule: true, default: vi.fn(), getServerSession: mockGetServerSession }));

type Demande = { id: string; userId: string; status: string; rejectReason: string | null; reviewedBy: string | null; resolvedAt: Date | null };
let demandes: Demande[];
let membre: { isVerified: boolean; retraitAt: Date | null; verifInviteeAt: Date | null };
let journal: Array<{ action: string; reason: string | null; targetUserId: string }>;
const signaux: unknown[] = [];
const pushs: Array<{ userId: string; payload: Record<string, unknown> }> = [];
const apres: Array<() => unknown> = [];

/**
 * Barrière de course : quand elle est armée à N, chaque lecture de la demande
 * attend que N lectures aient eu lieu. Les deux décisions voient donc toutes
 * les deux « en attente » avant que l'une n'écrive, quel que soit l'ordre où
 * leurs corps de requête ont été lus.
 */
let barriere = { attendues: 0, arrivees: 0, liberer: () => {}, ouverte: Promise.resolve() };
function armerBarriere(n: number) {
  let liberer = () => {};
  const ouverte = new Promise<void>((r) => { liberer = r; });
  barriere = { attendues: n, arrivees: 0, liberer, ouverte };
}
const fakeDb = {
  user: {
    findUnique: async ({ where, select }: { where: { id: string }; select?: Record<string, boolean> }) => {
      if (where.id === 'admin') return { role: 'ADMIN', isBanned: false };
      return select?.verifInviteeAt ? { verifInviteeAt: membre.verifInviteeAt } : membre;
    },
    update: async ({ data }: { data: Partial<typeof membre> }) => Object.assign(membre, data),
  },
  verificationRequest: {
    findUnique: async ({ where }: { where: { id: string } }) => {
      const d = demandes.find((x) => x.id === where.id);
      const lu = d ? { ...d } : null;
      if (barriere.attendues) {
        barriere.arrivees += 1;
        if (barriere.arrivees >= barriere.attendues) barriere.liberer();
        await barriere.ouverte;
      }
      return lu;
    },
    updateMany: async ({ where, data }: { where: { id: string; status: string }; data: Partial<Demande> }) => {
      const cibles = demandes.filter((d) => d.id === where.id && d.status === where.status);
      cibles.forEach((d) => Object.assign(d, data));
      return { count: cibles.length };
    },
  },
  moderationLog: { create: async ({ data }: { data: (typeof journal)[number] }) => { journal.push(data); } },
};
vi.mock('@/lib/db', () => ({ __esModule: true, getDb: () => fakeDb }));
vi.mock('@/lib/fraude/signaux', () => ({ enregistrerSignal: async (s: unknown) => { signaux.push(s); } }));
vi.mock('@/lib/push/server', async () => {
  const vrai = await vi.importActual<typeof import('@/lib/push/server')>('@/lib/push/server');
  return { ...vrai, sendPushToUser: async (userId: string, payload: Record<string, unknown>) => { pushs.push({ userId, payload }); } };
});
vi.mock('next/server', async () => ({
  ...(await vi.importActual<typeof import('next/server')>('next/server')),
  after: (f: () => unknown) => { apres.push(f); },
}));

const { PATCH } = await import('../route');

const trancher = (body: unknown) =>
  PATCH(new NextRequest('http://localhost/api/admin/verifications/v1', { method: 'PATCH', body: JSON.stringify(body) }), {
    params: Promise.resolve({ id: '00000000-0000-4000-8000-0000000000a1' }),
  });
async function viderApres() { while (apres.length) await apres.shift()!(); }

beforeEach(() => {
  mockGetServerSession.mockResolvedValue({ user: { id: 'admin', role: 'ADMIN' } });
  demandes = [{ id: '00000000-0000-4000-8000-0000000000a1', userId: 'u1', status: 'pending', rejectReason: null, reviewedBy: null, resolvedAt: null }];
  membre = { isVerified: false, retraitAt: new Date(), verifInviteeAt: null };
  journal = [];
  signaux.length = 0;
  pushs.length = 0;
  apres.length = 0;
  barriere.attendues = 0;
});

describe('PATCH /api/admin/verifications/[id]', () => {
  it('valider : demande approuvée, badge posé, retrait levé, décision journalisée', async () => {
    expect((await trancher({ action: 'APPROVE_VERIFICATION' })).status).toBe(200);
    expect(demandes[0]).toMatchObject({ status: 'approved', rejectReason: null, reviewedBy: 'admin' });
    expect(demandes[0].resolvedAt).toBeInstanceOf(Date);
    expect(membre).toEqual({ isVerified: true, retraitAt: null, verifInviteeAt: null });
    expect(journal).toEqual([{ adminId: 'admin', targetUserId: 'u1', action: 'APPROVE_VERIFICATION', reason: null }]);
  });

  it('refuser : motif de la liste de la spec 012 obligatoire et écrit tel quel', async () => {
    expect((await trancher({ action: 'REJECT_VERIFICATION' })).status).toBe(400);
    expect((await trancher({ action: 'REJECT_VERIFICATION', motif: 'inventé' })).status).toBe(400);
    // Les clés d'avant la spec 012 se lisent encore mais ne se choisissent plus.
    expect((await trancher({ action: 'REJECT_VERIFICATION', motif: 'geste_invisible' })).status).toBe(400);
    expect(demandes[0].status).toBe('pending');
    expect((await trancher({ action: 'REJECT_VERIFICATION', motif: 'code' })).status).toBe(200);
    expect(demandes[0]).toMatchObject({ status: 'rejected', rejectReason: 'code' });
    expect(membre.isVerified).toBe(false);
    expect(journal).toEqual([{ adminId: 'admin', targetUserId: 'u1', action: 'REJECT_VERIFICATION', reason: 'code' }]);
  });

  it('FR-010 : le membre est notifié après la réponse, sans motif ni décision', async () => {
    await trancher({ action: 'REJECT_VERIFICATION', motif: 'visage' });
    expect(pushs).toHaveLength(0); // rien avant la réponse
    await viderApres();
    expect(pushs).toEqual([{ userId: 'u1', payload: expect.objectContaining({ kind: 'verification', url: '/verify' }) }]);
    const texte = JSON.stringify(pushs[0].payload).toLowerCase();
    for (const mot of ['visage', 'refus', 'valid', 'motif', 'code']) expect(texte).not.toContain(mot);
  });

  it('deux modérateurs en même temps : une seule décision écrite, le second reçoit 409', async () => {
    armerBarriere(2);
    const [a, b] = await Promise.all([
      trancher({ action: 'APPROVE_VERIFICATION' }),
      trancher({ action: 'REJECT_VERIFICATION', motif: 'personne' }),
    ]);
    expect([a.status, b.status].sort()).toEqual([200, 409]);
    expect(journal).toHaveLength(1);
    expect(demandes[0].status).toBe(journal[0].action === 'APPROVE_VERIFICATION' ? 'approved' : 'rejected');
    await viderApres();
    expect(pushs).toHaveLength(1);
  });

  it('refus après une invitation automatique : signal fort (spec 010)', async () => {
    membre.verifInviteeAt = new Date();
    await trancher({ action: 'REJECT_VERIFICATION', motif: 'code' });
    expect(signaux).toEqual([{ userId: 'u1', type: 'verification_refusee', force: 'fort', cle: '00000000-0000-4000-8000-0000000000a1' }]);
  });

  it('refus sans invitation : aucun signal', async () => {
    await trancher({ action: 'REJECT_VERIFICATION', motif: 'code' });
    expect(signaux).toEqual([]);
  });

  it('409 sur une demande déjà tranchée, rien de réécrit ni notifié', async () => {
    demandes[0].status = 'approved';
    expect((await trancher({ action: 'REJECT_VERIFICATION', motif: 'code' })).status).toBe(409);
    expect(demandes[0].status).toBe('approved');
    await viderApres();
    expect(journal).toEqual([]);
    expect(pushs).toEqual([]);
  });
});
