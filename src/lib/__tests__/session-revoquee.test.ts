// @vitest-environment node
/**
 * Un compte banni ou supprimé perd sa session aussitôt, y compris sur les
 * routes `/api/*` que le proxy ne contrôle pas : le jeton reste valide
 * 30 jours, c'est la relecture du compte qui le désarme.
 *
 * On appelle le vrai `getServerSession`, celui des routes, avec un vrai jeton
 * chiffré : l'effet observé est la session rendue (`null` = la route répond
 * 401) et le cookie que NextAuth renvoie. Seule la base est
 * simulée, et elle honore `select` : un champ oublié dans la requête manque
 * dans la réponse au lieu d'être fourni par complaisance.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getServerSession } from 'next-auth';
import { encode } from 'next-auth/jwt';

type Compte = { id: string; email: string; normalizedEmail: string; role: string; isBanned: boolean };
let comptes: Compte[] = [];
let basePanne = false;

function projeter(c: Compte, select?: Record<string, boolean>) {
  return select ? Object.fromEntries(Object.entries(c).filter(([k]) => select[k])) : c;
}

vi.mock('@/lib/db', () => ({
  __esModule: true,
  getDb: () => ({
    user: {
      findUnique: async ({ where, select }: { where: { id?: string }; select?: Record<string, boolean> }) => {
        if (basePanne) throw new Error('connexion refusée');
        const c = comptes.find((x) => x.id === where.id);
        return c ? projeter(c, select) : null;
      },
      count: async ({ where }: { where: { isBanned: boolean; OR: Array<{ id?: string; normalizedEmail?: string }> } }) => {
        if (basePanne) throw new Error('connexion refusée');
        return comptes.filter((c) => c.isBanned === where.isBanned
          && where.OR.some((o) => (o.id !== undefined && o.id === c.id)
            || (o.normalizedEmail !== undefined && o.normalizedEmail === c.normalizedEmail))).length;
      },
    },
  }),
}));

const SECRET = 'secret-de-test-uniquement-0123456789';
process.env.NEXTAUTH_SECRET = SECRET;
process.env.NEXTAUTH_URL = 'http://localhost:3000';
const { authOptions } = await import('../auth');

const ACTIF: Compte = { id: 'c-actif', email: 'actif@exemple.test', normalizedEmail: 'actif@exemple.test', role: 'user', isBanned: false };

async function lireSession(idJeton: string, roleJeton = 'USER') {
  const jeton = await encode({ token: { id: idJeton, role: roleJeton, sub: idJeton }, secret: SECRET });
  const entetes: string[] = [];
  const res = {
    getHeader: () => entetes,
    setHeader: (_nom: string, valeur: string | string[]) => { entetes.splice(0, entetes.length, ...([] as string[]).concat(valeur)); },
  };
  const req = { headers: {}, cookies: { 'next-auth.session-token': jeton } };
  const session = (await getServerSession(req as never, res as never, {
    ...authOptions,
    logger: { error: () => {}, warn: () => {}, debug: () => {} },
  })) as { user: { id: string; role: string } } | null;
  const cookieVide = entetes.some((e) => /^next-auth\.session-token=;/.test(e));
  return { session, cookieVide };
}

beforeEach(() => {
  comptes = [{ ...ACTIF }];
  basePanne = false;
});

describe('session relue en base à chaque lecture', () => {
  it('compte actif : session rendue, rôle pris dans la base et non dans le jeton', async () => {
    const { session, cookieVide } = await lireSession('c-actif', 'ADMIN');
    expect(session?.user.id).toBe('c-actif');
    expect(session?.user.role).toBe('USER');
    expect(cookieVide).toBe(false);
  });

  it('compte banni depuis, jeton encore valide : aucune session, cookie vidé', async () => {
    comptes[0].isBanned = true;
    const { session, cookieVide } = await lireSession('c-actif');
    expect(session).toBeNull();
    expect(cookieVide).toBe(true);
  });

  it('compte supprimé, jeton encore valide : aucune session, cookie vidé', async () => {
    comptes = [];
    const { session, cookieVide } = await lireSession('c-actif');
    expect(session).toBeNull();
    expect(cookieVide).toBe(true);
  });

  it('base injoignable : la session reste (pas de déconnexion générale au moindre hoquet)', async () => {
    basePanne = true;
    const err = vi.spyOn(console, 'error').mockImplementation(() => {});
    const { session, cookieVide } = await lireSession('c-actif');
    expect(session?.user.id).toBe('c-actif');
    expect(cookieVide).toBe(false);
    // Motif seul dans le journal, jamais l'identifiant du compte.
    expect(JSON.stringify(err.mock.calls)).not.toContain('c-actif');
    err.mockRestore();
  });
});

describe('connexion refusée à un compte banni, quel que soit le fournisseur', () => {
  const signIn = (user: { id: string; email?: string | null }) =>
    authOptions.callbacks!.signIn!({ user: user as never, account: null });

  it('compte actif : connexion acceptée', async () => {
    expect(await signIn({ id: 'c-actif', email: 'actif@exemple.test' })).toBe(true);
  });

  it('compte banni retrouvé par son identifiant : refusé', async () => {
    comptes[0].isBanned = true;
    expect(await signIn({ id: 'c-actif', email: null })).toBe(false);
  });

  it('profil OAuth neuf dont l’e-mail (casse et points différents) est celui d’un banni : refusé', async () => {
    comptes = [{ id: 'c-banni', email: 'banni@gmail.com', normalizedEmail: 'banni@gmail.com', role: 'user', isBanned: true }];
    expect(await signIn({ id: 'id-du-fournisseur', email: 'B.anni@Gmail.com' })).toBe(false);
  });

  it('base injoignable à la connexion : on ne connecte pas', async () => {
    basePanne = true;
    await expect(signIn({ id: 'c-actif', email: 'actif@exemple.test' })).rejects.toThrow();
  });
});
