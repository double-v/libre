// @vitest-environment node
//
// Environnement node explicite : `crypto-escrow` refuse de s'importer là où
// `window` existe (c'est sa garde anti-client). Sous jsdom, le seul import
// échouerait — ce qui est précisément le comportement attendu en production.
/**
 * Escrow de clé — enveloppe serveur (#198, spec 002 US1).
 *
 * Ces tests portent la garantie centrale du lot : ce qui sort de `wrapPrivateKey`
 * ne s'ouvre qu'avec la bonne clé maître, pour le bon compte, et toute altération
 * est détectée. Un échec silencieux ici rendrait des conversations illisibles
 * sans que personne s'en aperçoive — exactement le défaut qu'on corrige.
 */
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { generateKeyPair as genPaire } from 'node:crypto';
import { promisify } from 'node:util';
import {
  wrapPrivateKey,
  unwrapPrivateKey,
  escrowDisponible,
  publiqueCorrespondALaPrivee,
} from '../crypto-escrow';

const CLE_A = Buffer.alloc(32, 1).toString('base64');
const CLE_B = Buffer.alloc(32, 2).toString('base64');

const USER = '11111111-1111-1111-1111-111111111111';
const AUTRE_USER = '22222222-2222-2222-2222-222222222222';

/** Une clé privée plausible : du base64 de PKCS8, comme en produit le client. */
const PRIVEE = Buffer.alloc(138, 7).toString('base64');

let envInitial: string | undefined;

beforeEach(() => {
  envInitial = process.env.CHAT_ESCROW_KEY;
  process.env.CHAT_ESCROW_KEY = CLE_A;
});

afterEach(() => {
  if (envInitial === undefined) delete process.env.CHAT_ESCROW_KEY;
  else process.env.CHAT_ESCROW_KEY = envInitial;
});

describe('enveloppe de la clé privée', () => {
  it('rend la clé identique après un aller-retour', () => {
    expect(unwrapPrivateKey(wrapPrivateKey(PRIVEE, USER), USER)).toBe(PRIVEE);
  });

  it('produit une enveloppe versionnée — sans version, aucune rotation de clé maître ne serait possible', () => {
    expect(wrapPrivateKey(PRIVEE, USER).startsWith('v1:')).toBe(true);
  });

  it('ne laisse jamais la clé en clair dans l’enveloppe', () => {
    expect(wrapPrivateKey(PRIVEE, USER)).not.toContain(PRIVEE);
  });

  it('produit une enveloppe différente à chaque appel (IV aléatoire)', () => {
    expect(wrapPrivateKey(PRIVEE, USER)).not.toBe(wrapPrivateKey(PRIVEE, USER));
  });
});

describe('refus d’ouverture', () => {
  it('refuse un chiffré altéré', () => {
    const [v, iv, ct, tag] = wrapPrivateKey(PRIVEE, USER).split(':');
    const octets = Buffer.from(ct, 'base64');
    octets[0] ^= 0xff;
    const falsifie = [v, iv, octets.toString('base64'), tag].join(':');
    expect(() => unwrapPrivateKey(falsifie, USER)).toThrow();
  });

  it('refuse un tag d’authentification altéré', () => {
    const [v, iv, ct] = wrapPrivateKey(PRIVEE, USER).split(':');
    const faux = [v, iv, ct, Buffer.alloc(16, 9).toString('base64')].join(':');
    expect(() => unwrapPrivateKey(faux, USER)).toThrow();
  });

  it('refuse une enveloppe ouverte avec une autre clé maître', () => {
    const blob = wrapPrivateKey(PRIVEE, USER);
    process.env.CHAT_ESCROW_KEY = CLE_B;
    expect(() => unwrapPrivateKey(blob, USER)).toThrow();
  });

  it('refuse une enveloppe transplantée sur un autre compte', () => {
    // L'identifiant du compte sert de données associées : un blob copié d'une
    // ligne à l'autre ne s'ouvre pas.
    const blob = wrapPrivateKey(PRIVEE, USER);
    expect(() => unwrapPrivateKey(blob, AUTRE_USER)).toThrow();
  });

  it('refuse une version d’enveloppe inconnue, en le disant', () => {
    const blob = wrapPrivateKey(PRIVEE, USER).replace(/^v1:/, 'v9:');
    expect(() => unwrapPrivateKey(blob, USER)).toThrow(/version/i);
  });

  it('refuse un format qui n’est pas une enveloppe', () => {
    expect(() => unwrapPrivateKey('pas-une-enveloppe', USER)).toThrow();
  });
});

describe('configuration de la clé maître', () => {
  it('signale l’absence de clé maître au lieu d’échouer par un undefined', () => {
    delete process.env.CHAT_ESCROW_KEY;
    expect(escrowDisponible()).toBe(false);
    expect(() => wrapPrivateKey(PRIVEE, USER)).toThrow(/CHAT_ESCROW_KEY/);
  });

  it('refuse une clé maître qui ne fait pas 32 octets', () => {
    process.env.CHAT_ESCROW_KEY = Buffer.alloc(16, 3).toString('base64');
    expect(escrowDisponible()).toBe(false);
    expect(() => wrapPrivateKey(PRIVEE, USER)).toThrow(/32/);
  });
});

describe('appariement clé publique / clé privée', () => {
  /** Génère une vraie paire ECDH P-256 au format du client (base64 SPKI / PKCS8). */
  async function paire() {
    const { publicKey, privateKey } = await promisify(genPaire)('ec', {
      namedCurve: 'P-256',
      publicKeyEncoding: { type: 'spki', format: 'der' },
      privateKeyEncoding: { type: 'pkcs8', format: 'der' },
    });
    return {
      publique: (publicKey as unknown as Buffer).toString('base64'),
      privee: (privateKey as unknown as Buffer).toString('base64'),
    };
  }

  it('accepte une paire cohérente', async () => {
    const { publique, privee } = await paire();
    expect(publiqueCorrespondALaPrivee(publique, privee)).toBe(true);
  });

  it('refuse une privée qui appartient à une autre paire — sans ce contrôle, le coffre s’empoisonne de façon irréversible', async () => {
    const a = await paire();
    const b = await paire();
    expect(publiqueCorrespondALaPrivee(a.publique, b.privee)).toBe(false);
  });

  it('refuse une entrée qui n’est pas une clé', () => {
    expect(publiqueCorrespondALaPrivee('nawak', 'nawak')).toBe(false);
  });
});
