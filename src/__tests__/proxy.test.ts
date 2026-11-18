/**
 * Tests — proxy (guard de session) + cache court du contrôle user (issue #146)
 *
 * Le proxy faisait un `user.findUnique` à CHAQUE navigation protégée. #146
 * ajoute un cache mémoire TTL 30 s : navigations répétées = 1 seul hit DB, et
 * ban / suppression / changement de rôle propagés en <= 30 s.
 *
 * On vérifie aussi qu'aucune régression sécurité n'est introduite (user absent
 * → redirect, non-admin sur /admin → redirect, ban → redirect).
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

const mockGetToken = vi.fn();
vi.mock('next-auth/jwt', () => ({ __esModule: true, getToken: mockGetToken }));

const findUnique = vi.fn();
const updateMany = vi.fn();
vi.mock('@/lib/db', () => ({ __esModule: true, getDb: () => ({ user: { findUnique, updateMany } }) }));
const mockGetFeatures = vi.fn(async () => ({ checkin: true, crossings: true, square: true }));
vi.mock('@/lib/features-server', () => ({ __esModule: true, getFeatures: () => mockGetFeatures() }));

// Aucune preview dans ces tests : on neutralise le module.
vi.mock('@/lib/site-theme-preview', () => ({
  __esModule: true,
  PREVIEW_COOKIE_NAME: 'preview_theme',
  buildPreviewCookieHeader: () => 'preview_theme=x',
  buildPreviewClearCookieHeader: () => 'preview_theme=; Max-Age=0',
  resolvePreviewTheme: () => null,
}));

const { proxy, _resetProxyUserCache } = await import('../proxy');

const USER = 'user-1';
function req(path = '/discover'): NextRequest {
  return new NextRequest(`http://localhost${path}`);
}

beforeEach(() => {
  vi.clearAllMocks();
  _resetProxyUserCache();
  mockGetToken.mockResolvedValue({ id: USER });
  findUnique.mockResolvedValue({ id: USER, isBanned: false, role: 'USER' });
  updateMany.mockReset();
  updateMany.mockResolvedValue({ count: 1 });
});

describe('proxy — cache court du contrôle user (#146)', () => {
  it('deux navigations protégées = un seul findUnique (cache hit)', async () => {
    await proxy(req());
    await proxy(req('/matches'));
    expect(findUnique).toHaveBeenCalledTimes(1);
  });

  it('après expiration du TTL (30 s), refait le findUnique', async () => {
    vi.useFakeTimers();
    try {
      await proxy(req());
      vi.advanceTimersByTime(31_000);
      await proxy(req());
      expect(findUnique).toHaveBeenCalledTimes(2);
    } finally {
      vi.useRealTimers();
    }
  });

  it('bannissement propagé en <= 30 s : autorisé pendant le TTL, bloqué après', async () => {
    vi.useFakeTimers();
    try {
      const r1 = await proxy(req());
      expect(r1.status).toBe(200); // NextResponse.next()

      // L'utilisateur est banni en base APRÈS la mise en cache.
      findUnique.mockResolvedValue({ id: USER, isBanned: true, role: 'USER' });

      // Toujours dans le TTL : valeur cachée (non banni) → encore autorisé.
      vi.advanceTimersByTime(10_000);
      const r2 = await proxy(req());
      expect(r2.status).toBe(200);

      // Au-delà du TTL : re-fetch → banni → redirect.
      vi.advanceTimersByTime(21_000);
      const r3 = await proxy(req());
      expect(r3.status).toBe(307);
      expect(r3.headers.get('location')).toContain('error=account_banned');
    } finally {
      vi.useRealTimers();
    }
  });
});

describe('proxy — pas de régression sécurité (#146)', () => {
  it('user banni → redirect account_banned', async () => {
    findUnique.mockResolvedValue({ id: USER, isBanned: true, role: 'USER' });
    const r = await proxy(req());
    expect(r.status).toBe(307);
    expect(r.headers.get('location')).toContain('error=account_banned');
  });

  it('user introuvable en base → redirect session_expiree', async () => {
    findUnique.mockResolvedValue(null);
    const r = await proxy(req());
    expect(r.headers.get('location')).toContain('error=session_expiree');
  });

  it('non-admin sur /admin → redirect vers /', async () => {
    findUnique.mockResolvedValue({ id: USER, isBanned: false, role: 'USER' });
    const r = await proxy(req('/admin'));
    expect(r.status).toBe(307);
    expect(new URL(r.headers.get('location') as string).pathname).toBe('/');
  });

  it('token absent → redirect session_expiree sans toucher la DB', async () => {
    mockGetToken.mockResolvedValue(null);
    const r = await proxy(req());
    expect(r.headers.get('location')).toContain('error=session_expiree');
    expect(findUnique).not.toHaveBeenCalled();
  });
});

describe('proxy — pages des fonctionnalités coupées (#418)', () => {
  it('renvoie /square vers /en-pause?f=square quand La Place est coupée', async () => {
    mockGetFeatures.mockResolvedValue({ checkin: true, crossings: true, square: false });
    const res = await proxy(req('/square'));
    expect(res.status).toBe(307);
    expect(new URL(res.headers.get('location')!).pathname + new URL(res.headers.get('location')!).search).toBe('/en-pause?f=square');
  });

  it('laisse passer /crossings quand tout est actif, et ne lit pas les interrupteurs ailleurs', async () => {
    expect((await proxy(req('/crossings'))).status).toBe(200);
    mockGetFeatures.mockClear();
    await proxy(req('/discover'));
    expect(mockGetFeatures).not.toHaveBeenCalled();
  });
});

describe('proxy — présence au jour près (#498)', () => {
  it('deux navigations le même jour = une seule écriture, qui lève le préavis', async () => {
    await proxy(req('/discover'));
    await proxy(req('/messages'));
    expect(updateMany).toHaveBeenCalledTimes(1);
    expect(updateMany.mock.calls[0][0].data).toMatchObject({ preavisInactiviteAt: null });
  });

  it('déjà vu aujourd’hui → aucune écriture', async () => {
    const jour = new Date(Date.UTC(new Date().getUTCFullYear(), new Date().getUTCMonth(), new Date().getUTCDate()));
    findUnique.mockResolvedValue({ id: USER, isBanned: false, role: 'USER', lastSeenAt: jour });
    await proxy(req('/discover'));
    expect(updateMany).not.toHaveBeenCalled();
  });

  it('panne à l’écriture → la navigation passe', async () => {
    updateMany.mockRejectedValue(new Error('boom'));
    const res = await proxy(req('/discover'));
    expect(res.headers.get('location')).toBeNull();
  });
});

describe('proxy — zone /admin fermée quand la base ne répond pas (#547)', () => {
  // Le jeton affirme ADMIN dans tous ces cas : seul le rôle en base doit compter.
  beforeEach(() => {
    mockGetToken.mockResolvedValue({ id: USER, role: 'ADMIN' });
  });

  it('admin réel en base → /admin passe', async () => {
    findUnique.mockResolvedValue({ id: USER, isBanned: false, role: 'ADMIN' });
    const r = await proxy(req('/admin'));
    expect(r.status).toBe(200);
    expect(r.headers.get('location')).toBeNull();
  });

  it('rétrogradé en base alors que le JWT dit encore ADMIN → redirect vers /', async () => {
    findUnique.mockResolvedValue({ id: USER, isBanned: false, role: 'USER' });
    const r = await proxy(req('/admin/users'));
    expect(r.status).toBe(307);
    expect(new URL(r.headers.get('location') as string).pathname).toBe('/');
  });

  it('rôle absent en base → redirect vers /', async () => {
    findUnique.mockResolvedValue({ id: USER, isBanned: false, role: null });
    const r = await proxy(req('/admin'));
    expect(new URL(r.headers.get('location') as string).pathname).toBe('/');
  });

  it('base qui lève une erreur sur /admin → redirect vers /, aucun repli sur le jeton', async () => {
    findUnique.mockRejectedValue(new Error('connexion refusée'));
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    try {
      const r = await proxy(req('/admin/reports'));
      expect(r.status).toBe(307);
      expect(new URL(r.headers.get('location') as string).pathname).toBe('/');
      // Panne visible, sans identifiant ni rôle du jeton.
      const lignes = spy.mock.calls.map((args) => args.map(String).join(' '));
      expect(lignes.some((l) => l.includes('base injoignable'))).toBe(true);
      for (const l of lignes) {
        expect(l).not.toContain(USER);
        expect(l).not.toContain('ADMIN');
      }
    } finally {
      spy.mockRestore();
    }
  });

  it('base qui lève une erreur hors /admin → la navigation passe, comme avant', async () => {
    findUnique.mockRejectedValue(new Error('connexion refusée'));
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    try {
      const r = await proxy(req('/discover'));
      expect(r.status).toBe(200);
      expect(r.headers.get('location')).toBeNull();
    } finally {
      spy.mockRestore();
    }
  });

  it('zone /admin sans cache : rétrogradé pendant le TTL → refusé tout de suite', async () => {
    findUnique.mockResolvedValue({ id: USER, isBanned: false, role: 'ADMIN' });
    const r1 = await proxy(req('/admin'));
    expect(r1.status).toBe(200);
    findUnique.mockResolvedValue({ id: USER, isBanned: false, role: 'USER' });
    const r2 = await proxy(req('/admin'));
    expect(r2.status).toBe(307);
    expect(new URL(r2.headers.get('location') as string).pathname).toBe('/');
  });

  it('zone /admin sans cache : panne juste après un passage admin → refusé', async () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    try {
      findUnique.mockResolvedValue({ id: USER, isBanned: false, role: 'ADMIN' });
      expect((await proxy(req('/discover'))).status).toBe(200); // met le rôle en cache
      findUnique.mockRejectedValue(new Error('connexion refusée'));
      const r = await proxy(req('/admin'));
      expect(r.status).toBe(307);
      expect(new URL(r.headers.get('location') as string).pathname).toBe('/');
    } finally {
      spy.mockRestore();
    }
  });

  it('une panne n’est pas mise en cache : la base revenue, l’admin réel repasse', async () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    try {
      findUnique.mockRejectedValueOnce(new Error('connexion refusée'));
      const r1 = await proxy(req('/admin'));
      expect(r1.status).toBe(307);
      findUnique.mockResolvedValue({ id: USER, isBanned: false, role: 'ADMIN' });
      const r2 = await proxy(req('/admin'));
      expect(r2.status).toBe(200);
    } finally {
      spy.mockRestore();
    }
  });
});

describe('écritures admin : contrôle d’origine (spec 012, FR-S08)', () => {
  const SITE = 'http://localhost';
  function ecriture(methode: string, origine?: string | null, chemin = '/api/admin/membres/x') {
    const headers = new Headers({ 'content-type': 'application/json' });
    if (origine) headers.set('origin', origine);
    return new NextRequest(`${SITE}${chemin}`, { method: methode, headers, ...(methode === 'GET' || methode === 'HEAD' ? {} : { body: '{}' }) });
  }

  it.each(['POST', 'PUT', 'PATCH', 'DELETE'])('%s depuis un site tiers : 403, avant toute route ni lecture de session', async (m) => {
    const res = await proxy(ecriture(m, 'https://piege.example'));
    expect(res.status).toBe(403);
    expect(mockGetToken).not.toHaveBeenCalled();
    expect(findUnique).not.toHaveBeenCalled();
  });

  it.each(['POST', 'DELETE'])('%s sans en-tête Origin : 403', async (m) => {
    expect((await proxy(ecriture(m, null))).status).toBe(403);
  });

  it.each([
    ['même hôte, autre port', 'http://localhost:4000'],
    ['préfixe trompeur', 'http://localhost.piege.example'],
    ['autre schéma', 'https://localhost'],
    ['valeur « null » (iframe isolée, fichier local)', 'null'],
  ])('origine proche mais différente (%s) : 403', async (_l, o) => {
    expect((await proxy(ecriture('POST', o))).status).toBe(403);
  });

  it('écriture depuis le site : laissée à la route (qui garde sa garde admin)', async () => {
    const res = await proxy(ecriture('POST', SITE));
    expect(res.status).toBe(200);
    expect(res.headers.get('x-middleware-next')).toBe('1');
  });

  it('lectures non contrôlées : un GET sans Origin passe', async () => {
    const res = await proxy(ecriture('GET', null));
    expect(res.headers.get('x-middleware-next')).toBe('1');
  });

  it('la racine /api/admin est couverte aussi', async () => {
    expect((await proxy(ecriture('POST', 'https://piege.example', '/api/admin'))).status).toBe(403);
  });

  it('le proxy est bien appelé sur les routes admin (matcher)', async () => {
    const { config } = await import('../proxy');
    const { unstable_doesMiddlewareMatch } = await import('next/experimental/testing/server');
    for (const url of ['/api/admin', '/api/admin/membres/x', '/api/admin/verifications/v1']) {
      expect(unstable_doesMiddlewareMatch({ config, url }), url).toBe(true);
    }
    // Les autres routes API restent hors du proxy.
    expect(unstable_doesMiddlewareMatch({ config, url: '/api/messages' })).toBe(false);
  });
});
