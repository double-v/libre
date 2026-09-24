// @vitest-environment node
/**
 * #418 — lecture serveur des interrupteurs : cache court, repli « tout actif »
 * sur panne, garde de route en 403 `feature_disabled`.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

const fakeDb = { siteConfig: { findUnique: vi.fn() } };
vi.mock('@/lib/db', () => ({ __esModule: true, getDb: () => fakeDb }));

const { getFeatures, gardeFeature, invaliderFeatures } = await import('@/lib/features-server');

beforeEach(() => {
  vi.clearAllMocks();
  invaliderFeatures();
});

describe('features-server (#418)', () => {
  it('lit la config et met en cache', async () => {
    fakeDb.siteConfig.findUnique.mockResolvedValue({ featuresDisabled: ['square'] });
    expect((await getFeatures()).square).toBe(false);
    expect((await getFeatures()).square).toBe(false);
    expect(fakeDb.siteConfig.findUnique).toHaveBeenCalledTimes(1);
  });

  it('invaliderFeatures force une relecture — l’écriture admin est visible aussitôt', async () => {
    fakeDb.siteConfig.findUnique.mockResolvedValue({ featuresDisabled: [] });
    await getFeatures();
    invaliderFeatures();
    fakeDb.siteConfig.findUnique.mockResolvedValue({ featuresDisabled: ['checkin'] });
    expect((await getFeatures()).checkin).toBe(false);
  });

  it('sur panne de lecture, retombe sur les défauts : ne coupe rien, n’allume rien', async () => {
    fakeDb.siteConfig.findUnique.mockRejectedValue(new Error('boom'));
    vi.spyOn(console, 'error').mockImplementation(() => {});
    expect(await getFeatures()).toEqual({ checkin: true, crossings: true, square: true, journal_comments: false });
  });

  it('lit aussi la liste des fonctionnalités activées (spec 007, R4)', async () => {
    fakeDb.siteConfig.findUnique.mockResolvedValue({ featuresDisabled: [], featuresEnabled: ['journal_comments'] });
    expect((await getFeatures()).journal_comments).toBe(true);
    expect(fakeDb.siteConfig.findUnique).toHaveBeenCalledWith(expect.objectContaining({ select: { featuresDisabled: true, featuresEnabled: true } }));
  });

  it('config absente (base neuve) : commentaires du journal coupés', async () => {
    fakeDb.siteConfig.findUnique.mockResolvedValue(null);
    expect(await gardeFeature('journal_comments')).not.toBeNull();
  });

  it('gardeFeature : null si active, 403 feature_disabled sinon', async () => {
    fakeDb.siteConfig.findUnique.mockResolvedValue({ featuresDisabled: ['crossings'] });
    expect(await gardeFeature('square')).toBeNull();
    const refus = await gardeFeature('crossings');
    expect(refus?.status).toBe(403);
    await expect(refus!.json()).resolves.toEqual({ error: 'feature_disabled', feature: 'crossings' });
  });
});
