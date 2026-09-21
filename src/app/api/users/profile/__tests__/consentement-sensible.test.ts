/**
 * Garde — orientation, identité de genre et pratiques ne se persistent jamais
 * sans consentement explicite (#425, art. 9 RGPD).
 *
 * Ces champs, et les préférences de recherche qui les révèlent (genres et
 * orientations cherchés), sont des données de vie sexuelle. « Exécution du
 * contrat » ne suffit pas : il faut un consentement distinct, tracé, et
 * retirable. La route refuse d'écrire une valeur non vide sans lui ; vider un
 * champ reste possible sans (c'est le sens même du retrait).
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { randomUUID } from 'crypto';

const mockGetServerSession = vi.fn();
vi.mock('next-auth', () => ({
  __esModule: true,
  default: vi.fn(),
  getServerSession: mockGetServerSession,
}));

const fakeDb = {
  user: { findUnique: vi.fn() },
  profile: { upsert: vi.fn(), findUnique: vi.fn() },
  consent: { findFirst: vi.fn(), create: vi.fn() },
};
vi.mock('@/lib/db', () => ({ __esModule: true, getDb: () => fakeDb }));
vi.mock('@/lib/photo-veil', () => ({ __esModule: true, photoSensitivityMap: vi.fn(async () => ({})) }));

const { PUT } = await import('../route');

const ME_ID = randomUUID();
const put = (body: unknown) =>
  PUT(new Request('http://localhost/api/users/profile', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  }));

beforeEach(() => {
  vi.clearAllMocks();
  mockGetServerSession.mockResolvedValue({ user: { id: ME_ID } });
  fakeDb.profile.upsert.mockImplementation(async ({ update }: { update: Record<string, unknown> }) => ({ userId: ME_ID, ...update }));
  fakeDb.consent.findFirst.mockResolvedValue(null);
});

describe('PUT /api/users/profile — consentement art. 9', () => {
  it.each([
    ['genderIdentity', 'femme'],
    ['orientation', ['lesbienne']],
    ['practices', ['tendresse']],
    ['searchGenders', ['femme']],
    ['searchOrientations', ['lesbienne']],
  ])('refuse %s sans consentement, sans rien écrire', async (champ, valeur) => {
    const res = await put({ [champ]: valeur });
    expect(res.status).toBe(403);
    expect((await res.json()).error).toBe('consent_required');
    expect(fakeDb.profile.upsert).not.toHaveBeenCalled();
  });

  it('écrit quand un consentement actif existe', async () => {
    fakeDb.consent.findFirst.mockResolvedValue({ id: 'c1', given: true, withdrawnAt: null });
    const res = await put({ orientation: ['bi'] });
    expect(res.status).toBe(200);
    expect(fakeDb.profile.upsert.mock.calls[0][0].update.orientation).toEqual(['bi']);
  });

  it('enregistre le consentement donné dans la même requête, puis écrit', async () => {
    const res = await put({ orientation: ['bi'], sensitiveConsent: true });
    expect(res.status).toBe(200);
    expect(fakeDb.consent.create).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ userId: ME_ID, type: 'sensitive_data', given: true }),
    }));
    expect(fakeDb.profile.upsert).toHaveBeenCalled();
  });

  it('ne crée pas de doublon quand le consentement est déjà actif', async () => {
    fakeDb.consent.findFirst.mockResolvedValue({ id: 'c1', given: true, withdrawnAt: null });
    await put({ orientation: ['bi'], sensitiveConsent: true });
    expect(fakeDb.consent.create).not.toHaveBeenCalled();
  });

  it('laisse vider les champs sans consentement (retrait)', async () => {
    const res = await put({ orientation: [], practices: [], genderIdentity: '', searchGenders: [] });
    expect(res.status).toBe(200);
  });

  it('n’exige rien pour un champ non sensible', async () => {
    const res = await put({ bio: 'Bonjour', relationshipType: ['amitié'] });
    expect(res.status).toBe(200);
    expect(fakeDb.consent.findFirst).not.toHaveBeenCalled();
  });
});
