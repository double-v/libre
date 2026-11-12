// @vitest-environment node
/**
 * Parcours membre du badge vérifié au code écrit à la main (spec 012, US1/US2).
 *
 * La base factice tient un vrai état en mémoire et applique les mêmes
 * conditions que les requêtes (code, membre, expiration, `select`) : une
 * route qui oublierait une condition serait prise, au lieu d'être servie par
 * complaisance. Les mêmes règles sont prouvées sur PostgreSQL dans
 * tests/integration/verification-code.test.ts. Les effets observés sont les
 * réponses, les lignes en base et les objets téléversés, jamais des appels.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

const ME = '11111111-1111-4111-8111-111111111111';
const AUTRE = '22222222-2222-4222-8222-222222222222';

// ---------------------------------------------------------------- session
const session = { user: { id: ME } as { id: string } | undefined };
vi.mock('next-auth', () => ({ __esModule: true, getServerSession: vi.fn(async () => (session.user ? session : null)) }));
vi.mock('@/lib/auth', () => ({ __esModule: true, authOptions: {} }));

// ------------------------------------------------- plafonds : vrai compteur
const compteurs = new Map<string, number>();
vi.mock('@/lib/rate-limit', async () => {
  const { limits } = await vi.importActual<typeof import('@/lib/rate-limit-upstash')>('@/lib/rate-limit-upstash');
  return {
    __esModule: true,
    limits,
    rateLimit: vi.fn(async (cle: string, limite: number) => {
      const n = (compteurs.get(cle) ?? 0) + 1;
      compteurs.set(cle, n);
      return { success: n <= limite };
    }),
  };
});

// ------------------------------------------------------------ stockage R2
const objets = new Map<string, Buffer>();
/** Toutes les écritures dans R2, même effacées ensuite : un refus doit tomber avant. */
const ecritures = { n: 0 };
const televerser = vi.fn(async (f: File, userId: string, o: { dossier?: string }) => {
  const key = `${userId}/${o.dossier}/${objets.size + 1}-${Math.random().toString(36).slice(2)}.jpg`;
  const propre = Buffer.from(await f.arrayBuffer());
  objets.set(key, propre);
  ecritures.n += 1;
  return { key, avaitMetadonnees: f.name.includes('exif'), propre };
});
vi.mock('@/lib/r2', () => ({
  __esModule: true,
  isR2Configured: () => true,
  televerserPhoto: televerser,
  deletePhoto: vi.fn(async (k: string) => { objets.delete(k); }),
}));

// ------------------------------------------- lecture du code, après réponse
const lire = vi.fn<(image: Buffer) => Promise<string>>(async () => '7358');
vi.mock('@/lib/verification/lecture-code', () => ({ __esModule: true, lireCode: (b: Buffer) => lire(b) }));
const apres: Array<() => Promise<void> | void> = [];
vi.mock('next/server', async () => ({
  ...(await vi.importActual<typeof import('next/server')>('next/server')),
  after: (f: () => Promise<void> | void) => { apres.push(f); },
}));

// ----------------------------------------------------------- base factice
type Compte = { id: string; emailVerified: Date | null; isBanned: boolean; isVerified: boolean };
type Code = { userId: string; code: string; tireAt: Date; expireAt: Date };
type Demande = {
  id: string; userId: string; selfieUrl: string; status: string; rejectReason: string | null;
  createdAt: Date; resolvedAt: Date | null; codeAttendu: string | null; codeLu: string | null;
  tentative: number; sansDonneesAppareil: boolean | null; vueAt: Date | null; challenge: string | null;
};
const comptes = new Map<string, Compte>();
const codes = new Map<string, Code>();
let demandes: Demande[] = [];

function projeter<T extends object>(o: T | null | undefined, select?: Record<string, boolean>) {
  if (!o) return null;
  return select ? Object.fromEntries(Object.entries(o).filter(([k]) => select[k])) : o;
}
type OuCode = { userId: string; code?: string; expireAt?: { gt: Date } };
const correspond = (c: Code, w: OuCode) =>
  c.userId === w.userId && (w.code === undefined || c.code === w.code) && (!w.expireAt || c.expireAt > w.expireAt.gt);

function nouvelleDemande(data: Partial<Demande>): Demande {
  return {
    id: `demande-${demandes.length + 1}`, rejectReason: null, createdAt: new Date(), resolvedAt: null,
    codeAttendu: null, codeLu: null, tentative: 1, sansDonneesAppareil: null, vueAt: null, challenge: null,
    selfieUrl: '', status: 'pending', userId: '', ...data,
  };
}

const fakeDb = {
  user: {
    findUnique: async ({ where, select }: { where: { id: string }; select?: Record<string, boolean> }) =>
      projeter(comptes.get(where.id), select),
  },
  verificationCode: {
    upsert: async ({ where, create, update }: { where: { userId: string }; create: Code; update: Omit<Code, 'userId'> }) => {
      const ligne = codes.has(where.userId) ? { ...codes.get(where.userId)!, ...update } : { ...create };
      codes.set(where.userId, ligne);
      return ligne;
    },
    findFirst: async ({ where, select }: { where: OuCode; select?: Record<string, boolean> }) =>
      projeter([...codes.values()].find((c) => correspond(c, where)), select),
    deleteMany: async ({ where }: { where: OuCode }) => {
      const cibles = [...codes.values()].filter((c) => correspond(c, where));
      for (const c of cibles) codes.delete(c.userId);
      return { count: cibles.length };
    },
  },
  verificationRequest: {
    findMany: async ({ where, select, take }: { where: { userId: string }; select?: Record<string, boolean>; take?: number }) =>
      demandes
        .filter((d) => d.userId === where.userId)
        .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
        .slice(0, take)
        .map((d) => projeter(d, select)),
    create: async ({ data }: { data: Partial<Demande> }) => {
      const d = nouvelleDemande(data);
      demandes.push(d);
      return { id: d.id };
    },
    update: async ({ where, data }: { where: { id: string }; data: Partial<Demande> }) => {
      const d = demandes.find((x) => x.id === where.id);
      if (!d) throw new Error('introuvable');
      Object.assign(d, data);
      return d;
    },
    updateMany: async ({ where, data }: { where: { userId: string; status: { in: string[] }; vueAt: null }; data: Partial<Demande> }) => {
      const cibles = demandes.filter((d) => d.userId === where.userId && where.status.in.includes(d.status) && d.vueAt === null);
      cibles.forEach((d) => Object.assign(d, data));
      return { count: cibles.length };
    },
  },
};
vi.mock('@/lib/db', () => ({ __esModule: true, getDb: () => fakeDb }));

const routeStatut = () => import('../route');
const routeCode = () => import('../code/route');
const routeVu = () => import('../vu/route');

// ---------------------------------------------------------------- outils
const H = 3600 * 1000;
function refus(userId: string, il_y_a: number, motif = 'code') {
  const t = new Date(Date.now() - il_y_a);
  demandes.push(nouvelleDemande({
    id: `r-${demandes.length + 1}`, userId, selfieUrl: 'x', status: 'rejected', rejectReason: motif,
    createdAt: new Date(t.getTime() - 1000), resolvedAt: t, codeAttendu: '2222',
  }));
  return t;
}
function requete(url: string, init: RequestInit & { ip?: string } = {}) {
  const headers = new Headers(init.headers);
  headers.set('x-forwarded-for', init.ip ?? '203.0.113.7');
  return new Request(url, { ...init, headers });
}
async function tirer(ip?: string) {
  const res = await (await routeCode()).POST(requete('http://x/api/moderation/verify/code', { method: 'POST', ip }));
  return { status: res.status, corps: await res.json() };
}
function selfie(nom = 'selfie.jpg', octets = 2048) {
  return new File([new Uint8Array(octets).fill(0xab)], nom, { type: 'image/jpeg' });
}
async function envoyer(champs: Record<string, string | File>, ip?: string) {
  const fd = new FormData();
  for (const [k, v] of Object.entries(champs)) fd.append(k, v);
  // On sérialise l'enveloppe multipart pour poser la vraie longueur, comme
  // le fait un navigateur.
  const enveloppe = new Response(fd);
  const type = enveloppe.headers.get('content-type')!;
  const corps = new Uint8Array(await enveloppe.arrayBuffer());
  const res = await (await routeStatut()).POST(requete('http://x/api/moderation/verify', {
    method: 'POST', body: corps, ip, headers: { 'content-type': type, 'content-length': String(corps.byteLength) },
  }));
  return { status: res.status, corps: await res.json() };
}
async function statut() {
  return (await (await routeStatut()).GET()).json();
}
async function viderApres() {
  while (apres.length) await apres.shift()!();
}

beforeEach(() => {
  vi.clearAllMocks();
  session.user = { id: ME };
  compteurs.clear();
  objets.clear();
  ecritures.n = 0;
  codes.clear();
  demandes = [];
  apres.length = 0;
  comptes.clear();
  comptes.set(ME, { id: ME, emailVerified: new Date(), isBanned: false, isVerified: false });
  comptes.set(AUTRE, { id: AUTRE, emailVerified: new Date(), isBanned: false, isVerified: false });
  lire.mockResolvedValue('7358');
});

// =========================================================================
describe('POST /verify/code — tirage', () => {
  it('rend quatre chiffres 2–9 et une expiration à 30 min, et les garde en base pour ce membre', async () => {
    const avant = Date.now();
    const { status, corps } = await tirer();
    expect(status).toBe(200);
    expect(corps.code).toMatch(/^[2-9]{4}$/);
    const expire = new Date(corps.expireAt).getTime();
    expect(expire - avant).toBeGreaterThanOrEqual(30 * 60 * 1000);
    expect(expire - Date.now()).toBeLessThanOrEqual(30 * 60 * 1000);
    expect(codes.get(ME)?.code).toBe(corps.code);
  });

  it('409 si une demande est en file', async () => {
    demandes.push(nouvelleDemande({ userId: ME, status: 'pending' }));
    expect((await tirer()).status).toBe(409);
    expect(codes.size).toBe(0);
  });

  it('409 si le profil est déjà vérifié', async () => {
    comptes.get(ME)!.isVerified = true;
    expect((await tirer()).status).toBe(409);
  });

  it('après deux refus : nouveau code tout de suite', async () => {
    refus(ME, 2 * H); refus(ME, H);
    expect((await tirer()).status).toBe(200);
  });

  it('après trois refus : 429 avec la date de reprise, et aucun code tiré', async () => {
    refus(ME, 3 * H); refus(ME, 2 * H);
    const dernier = refus(ME, H);
    const { status, corps } = await tirer();
    expect(status).toBe(429);
    expect(new Date(corps.reessaiAt).getTime()).toBe(dernier.getTime() + 24 * H);
    expect(codes.size).toBe(0);
  });
});

// =========================================================================
describe('POST /verify — envoi du selfie', () => {
  it('bon code : 201, demande en file avec le code attendu, code effacé, selfie hors du profil', async () => {
    const { corps: { code } } = await tirer();
    const r = await envoyer({ selfie: selfie(), code });
    expect(r).toEqual({ status: 201, corps: { statut: 'en_cours' } });
    expect(codes.has(ME)).toBe(false);
    expect(demandes).toHaveLength(1);
    expect(demandes[0]).toMatchObject({ userId: ME, status: 'pending', codeAttendu: code, tentative: 1, codeLu: null });
    expect(decodeURIComponent(demandes[0].selfieUrl)).toContain(`${ME}/verif/`);
    expect([...objets.keys()]).toEqual([expect.stringMatching(new RegExp(`^${ME}/verif/`))]);
  });

  it('rang de la demande : 3 après deux refus', async () => {
    refus(ME, 2 * H); refus(ME, H);
    const { corps: { code } } = await tirer();
    await envoyer({ selfie: selfie(), code });
    expect(demandes.find((d) => d.status === 'pending')?.tentative).toBe(3);
  });

  it('la lecture part après la réponse, sur l’image stockée, écrit le code lu et ne décide rien', async () => {
    const { corps: { code } } = await tirer();
    lire.mockResolvedValue(code); // lecture parfaite : elle ne valide pas pour autant
    await envoyer({ selfie: selfie(), code });
    expect(demandes[0].codeLu).toBeNull(); // rien de lu au moment de la réponse
    await viderApres();
    expect(demandes[0].codeLu).toBe(code);
    expect(demandes[0].status).toBe('pending');
    expect(comptes.get(ME)!.isVerified).toBe(false);
    expect(lire.mock.calls[0][0]).toEqual(objets.get([...objets.keys()][0]));
  });

  it('lecture impossible : code lu vide, demande toujours en file', async () => {
    lire.mockResolvedValue('');
    const { corps: { code } } = await tirer();
    await envoyer({ selfie: selfie(), code });
    await viderApres();
    expect(demandes[0]).toMatchObject({ codeLu: '', status: 'pending' });
  });

  it('code remplacé par un tirage suivant : 410, rien de stocké, rien en file', async () => {
    const { corps: { code: ancien } } = await tirer();
    let nouveau = ancien;
    while (nouveau === ancien) nouveau = (await tirer()).corps.code;
    const r = await envoyer({ selfie: selfie(), code: ancien });
    expect(r).toEqual({ status: 410, corps: { error: 'Ce code a expiré ou a été remplacé.', nouveauCode: true } });
    expect(ecritures.n).toBe(0);
    expect(demandes).toHaveLength(0);
    expect(codes.get(ME)?.code).toBe(nouveau);
  });

  it('code expiré : 410, rien de stocké', async () => {
    const { corps: { code } } = await tirer();
    codes.get(ME)!.expireAt = new Date(Date.now() - 1);
    expect((await envoyer({ selfie: selfie(), code })).status).toBe(410);
    expect(ecritures.n).toBe(0);
  });

  it('code tiré par un autre membre : 410 pour moi, et son code reste valable', async () => {
    session.user = { id: AUTRE };
    const { corps: { code } } = await tirer();
    session.user = { id: ME };
    expect((await envoyer({ selfie: selfie(), code })).status).toBe(410);
    expect(ecritures.n).toBe(0);
    expect(codes.get(AUTRE)?.code).toBe(code);
    expect(demandes).toHaveLength(0);
  });

  it('le même code envoyé deux fois en même temps : un seul en file, l’autre image effacée', async () => {
    const { corps: { code } } = await tirer();
    const [a, b] = await Promise.all([envoyer({ selfie: selfie(), code }), envoyer({ selfie: selfie(), code })]);
    expect([a.status, b.status].sort()).toEqual([201, 410]);
    expect(demandes.filter((d) => d.status === 'pending')).toHaveLength(1);
    expect(objets.size).toBe(1);
  });

  it.each([[undefined], ['1234'], ['73 58'], ['7358 ']])('code absent ou hors forme (%j) : 410, rien de stocké', async (code) => {
    await tirer();
    const champs: Record<string, string | File> = { selfie: selfie() };
    if (code !== undefined) champs.code = code;
    expect((await envoyer(champs)).status).toBe(410);
    expect(ecritures.n).toBe(0);
  });

  it('image refusée (format, pixels) : message remonté tel quel, code non consommé', async () => {
    const { corps: { code } } = await tirer();
    televerser.mockRejectedValueOnce(new Error('L\'image est trop grande. Prends la photo avec l\'appareil de ton téléphone, en mode normal.'));
    const r = await envoyer({ selfie: selfie(), code });
    expect(r.status).toBe(400);
    expect(r.corps.error).toMatch(/trop grande/);
    expect(codes.get(ME)?.code).toBe(code);
  });
});

// =========================================================================
describe('GET /verify — statut lu par le membre', () => {
  it('refus : motif, conseil et rang suivant ; repère allumé jusqu’au marquage « vu »', async () => {
    refus(ME, H, 'visage');
    expect(await statut()).toEqual({
      statut: 'refusee',
      motif: {
        cle: 'visage',
        texte: 'Ton visage n’est pas assez visible.',
        conseil: 'Mets-toi face à la lumière, sans lunettes de soleil, le visage en entier dans le cadre.',
      },
      tentative: 2,
      nonVu: true,
    });
    const vu = await (await routeVu()).POST();
    expect(vu.status).toBe(204);
    expect((await statut()).nonVu).toBe(false);
  });

  it('marquer « vu » ne touche pas les demandes d’un autre membre', async () => {
    refus(AUTRE, H);
    await (await routeVu()).POST();
    expect(demandes[0].vueAt).toBeNull();
  });

  it('après trois refus : la date de reprise est donnée', async () => {
    refus(ME, 3 * H); refus(ME, 2 * H);
    const dernier = refus(ME, H);
    expect(new Date((await statut()).reessaiAt).getTime()).toBe(dernier.getTime() + 24 * H);
  });

  it('ancienne clé de motif (geste) : lue avec son texte d’époque', async () => {
    refus(ME, H, 'geste_invisible');
    expect((await statut()).motif.texte).toBe('Le geste demandé ne se voit pas sur la photo.');
  });

  it('clé de motif inconnue : refus sans motif, jamais un texte inventé', async () => {
    refus(ME, H, 'nimporte_quoi');
    expect((await statut()).motif).toBeNull();
  });
});

// =========================================================================
describe('hostile', () => {
  it('FR-S01 : compte non confirmé → 403, aucun code tiré', async () => {
    comptes.get(ME)!.emailVerified = null;
    expect((await tirer()).status).toBe(403);
    expect(codes.size).toBe(0);
  });

  it('FR-S01 : compte banni → 403 au tirage et à l’envoi', async () => {
    const { corps: { code } } = await tirer();
    comptes.get(ME)!.isBanned = true;
    expect((await tirer()).status).toBe(403);
    expect((await envoyer({ selfie: selfie(), code })).status).toBe(403);
    expect(demandes).toHaveLength(0);
    expect(objets.size).toBe(0);
  });

  it('compte supprimé, session encore lue → 403', async () => {
    comptes.delete(ME);
    expect((await tirer()).status).toBe(403);
  });

  it('sans session → 401 partout, rien n’est écrit', async () => {
    session.user = undefined;
    expect((await tirer()).status).toBe(401);
    expect((await envoyer({ selfie: selfie(), code: '2345' })).status).toBe(401);
    expect((await (await routeStatut()).GET()).status).toBe(401);
    expect((await (await routeVu()).POST()).status).toBe(401);
    expect(codes.size + demandes.length + objets.size).toBe(0);
  });

  it('FR-S02 : rafale de tirages d’un compte → 429 au-delà de 10 par heure', async () => {
    const issues: number[] = [];
    for (let i = 0; i < 12; i++) issues.push((await tirer()).status);
    expect(issues.slice(0, 10).every((s) => s === 200)).toBe(true);
    expect(issues.slice(10)).toEqual([429, 429]);
  });

  it('FR-S02 : rafale depuis une même adresse IP avec des comptes différents → 429', async () => {
    const issues: number[] = [];
    for (let i = 0; i < 31; i++) {
      const id = `00000000-0000-4000-8000-${String(i).padStart(12, '0')}`;
      comptes.set(id, { id, emailVerified: new Date(), isBanned: false, isVerified: false });
      session.user = { id };
      issues.push((await tirer('198.51.100.9')).status);
    }
    expect(issues.filter((s) => s === 200)).toHaveLength(30);
    expect(issues[30]).toBe(429);
  });

  it('FR-S02 : rafale d’envois → 429 au-delà de 6 par heure', async () => {
    const issues: number[] = [];
    for (let i = 0; i < 7; i++) issues.push((await envoyer({ selfie: selfie(), code: '2345' })).status);
    expect(issues.slice(0, 6).every((s) => s !== 429)).toBe(true);
    expect(issues[6]).toBe(429);
  });

  it('FR-S03 : corps de plus de 5 Mo → 413, refusé avant lecture, code intact', async () => {
    const { corps: { code } } = await tirer();
    const r = await envoyer({ selfie: selfie('gros.jpg', 5 * 1024 * 1024 + 70 * 1024), code });
    expect(r.status).toBe(413);
    expect(objets.size).toBe(0);
    expect(codes.get(ME)?.code).toBe(code);
  });

  it('FR-S03 : longueur annoncée absente → 413', async () => {
    const fd = new FormData();
    fd.append('code', '2345');
    const res = await (await routeStatut()).POST(requete('http://x/api/moderation/verify', { method: 'POST', body: fd }));
    expect(res.status).toBe(413);
  });

  it('FR-S04 : le booléen « sans données d’appareil » suit le fichier reçu', async () => {
    let { corps: { code } } = await tirer();
    await envoyer({ selfie: selfie('photo-exif.jpg'), code });
    expect(demandes[0].sansDonneesAppareil).toBe(false);
    Object.assign(demandes[0], { status: 'rejected', resolvedAt: new Date() });
    ({ corps: { code } } = await tirer());
    await envoyer({ selfie: selfie('capture.jpg'), code });
    expect(demandes[1].sansDonneesAppareil).toBe(true);
  });

  it('FR-S05 : le code lu n’apparaît dans aucune réponse au membre', async () => {
    lire.mockResolvedValue('9876');
    const { corps: { code } } = await tirer();
    const envoi = await envoyer({ selfie: selfie(), code });
    await viderApres();
    expect(demandes[0].codeLu).toBe('9876');
    const enFile = await statut();
    Object.assign(demandes[0], { status: 'rejected', rejectReason: 'code', resolvedAt: new Date() });
    const refuse = await statut();
    for (const corps of [envoi.corps, enFile, refuse]) {
      const json = JSON.stringify(corps);
      expect(json).not.toContain('9876');
      expect(json).not.toMatch(/codeLu|code_lu|codeAttendu/);
    }
  });

  it('FR-S06 : un identifiant de membre glissé dans la requête est ignoré', async () => {
    const res = await (await routeCode()).POST(requete(`http://x/api/moderation/verify/code?userId=${AUTRE}`, {
      method: 'POST', body: JSON.stringify({ userId: AUTRE }), headers: { 'content-type': 'application/json' },
    }));
    expect(res.status).toBe(200);
    expect(codes.has(ME)).toBe(true);
    expect(codes.has(AUTRE)).toBe(false);

    const { code } = await res.json();
    await envoyer({ selfie: selfie(), code, userId: AUTRE });
    expect(demandes.map((d) => d.userId)).toEqual([ME]);
    expect([...objets.keys()].every((k) => k.startsWith(`${ME}/`))).toBe(true);
  });
});
