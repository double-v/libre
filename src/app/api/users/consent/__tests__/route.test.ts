/**
 * /api/users/consent — retrait du consentement art. 9 (#425).
 *
 * Retirer, c'est effacer : les champs couverts repartent à vide dans la même
 * transaction que la clôture du consentement. Sinon on garderait des données
 * de vie sexuelle sans base légale, ne serait-ce qu'une seconde.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { randomUUID } from 'crypto';

const mockGetServerSession = vi.fn();
vi.mock('next-auth', () => ({ __esModule: true, default: vi.fn(), getServerSession: mockGetServerSession }));

const fakeDb = {
  consent: { findFirst: vi.fn(), create: vi.fn(), updateMany: vi.fn((args: unknown) => ({ op: 'consent', args })) },
  profile: { updateMany: vi.fn((args: unknown) => ({ op: 'profile', args })) },
  $transaction: vi.fn(async (ops: unknown[]) => ops),
};
vi.mock('@/lib/db', () => ({ __esModule: true, getDb: () => fakeDb }));

const { GET, POST, DELETE } = await import('../route');
const ME = randomUUID();

beforeEach(() => {
  vi.clearAllMocks();
  mockGetServerSession.mockResolvedValue({ user: { id: ME } });
  fakeDb.consent.findFirst.mockResolvedValue(null);
});

describe('/api/users/consent', () => {
  it('GET dit si le consentement est actif', async () => {
    expect(await (await GET()).json()).toEqual({ sensitiveData: false });
    fakeDb.consent.findFirst.mockResolvedValue({ id: 'c' });
    expect(await (await GET()).json()).toEqual({ sensitiveData: true });
  });

  it('POST enregistre le consentement avec sa trace (IP, user-agent)', async () => {
    const req = new Request('http://localhost/api/users/consent', {
      method: 'POST',
      headers: { 'x-forwarded-for': '203.0.113.9, 10.0.0.1', 'user-agent': 'UA-test' },
    });
    expect(await (await POST(req)).json()).toEqual({ sensitiveData: true });
    expect(fakeDb.consent.create).toHaveBeenCalledWith({
      data: { userId: ME, type: 'sensitive_data', version: '1', given: true, ipAddress: '203.0.113.9', userAgent: 'UA-test' },
    });
  });

  it('DELETE clôt le consentement et vide les champs couverts, en une transaction', async () => {
    expect(await (await DELETE()).json()).toEqual({ sensitiveData: false });
    const ops = fakeDb.$transaction.mock.calls[0][0] as Array<{ op: string; args: Record<string, unknown> }>;
    expect(ops.map((o) => o.op)).toEqual(['consent', 'profile']);
    expect(ops[0].args).toMatchObject({ where: { userId: ME, type: 'sensitive_data', given: true, withdrawnAt: null } });
    expect(ops[1].args).toEqual({
      where: { userId: ME },
      data: { genderIdentity: '', orientation: [], practices: [], searchGenders: [], searchOrientations: [] },
    });
  });

  it('refuse sans session', async () => {
    mockGetServerSession.mockResolvedValue(null);
    expect((await GET()).status).toBe(401);
    expect((await DELETE()).status).toBe(401);
  });
});
