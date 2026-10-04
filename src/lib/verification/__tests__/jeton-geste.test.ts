// @vitest-environment node
/**
 * #436 — le jeton qui lie un geste tiré à un membre.
 *
 * Sans état : le serveur signe (membre, geste, tirage) et relit la signature à
 * l'envoi du selfie. Il ne doit pas pouvoir servir de jeton de vérification
 * d'e-mail, qui partage le même secret de base.
 */
import { describe, it, expect, beforeAll } from 'vitest';

beforeAll(() => {
  process.env.NEXTAUTH_SECRET = 'secret-de-test-assez-long-pour-hs256';
});

const U1 = '11111111-1111-4111-8111-111111111111';
const U2 = '22222222-2222-4222-8222-222222222222';

describe('jeton de geste', () => {
  it('se relit pour le même membre, avec son geste et son tirage', async () => {
    const { signerJetonGeste, lireJetonGeste } = await import('../jeton-geste');
    const jeton = await signerJetonGeste({ userId: U1, geste: 'pouce', tirage: 2 });
    expect(await lireJetonGeste(jeton, U1)).toEqual({ geste: 'pouce', tirage: 2 });
  });

  /**
   * Altère la signature au milieu, là où chaque caractère base64url porte 6 bits
   * utiles (#485). Remplacer la fin par « xx » échouait environ une fois sur
   * 1024 : le dernier caractère d'une signature HS256 ne porte que 4 bits, les
   * 2 autres sont du bourrage ignoré au décodage, donc une fin déjà en « xw »,
   * « xx », « xy » ou « xz » laissait la signature intacte.
   */
  function alterer(jeton: string): string {
    const [entete, contenu, signature] = jeton.split('.');
    const i = Math.floor(signature.length / 2);
    const autre = signature[i] === 'A' ? 'B' : 'A';
    return [entete, contenu, signature.slice(0, i) + autre + signature.slice(i + 1)].join('.');
  }

  it('refuse le jeton d’un autre membre, un jeton altéré ou un geste inconnu', async () => {
    const { signerJetonGeste, lireJetonGeste } = await import('../jeton-geste');
    const jeton = await signerJetonGeste({ userId: U1, geste: 'pouce', tirage: 1 });
    expect(await lireJetonGeste(jeton, U2)).toBeNull();
    expect(await lireJetonGeste(alterer(jeton), U1)).toBeNull();
    const faux = await signerJetonGeste({ userId: U1, geste: 'inconnu', tirage: 1 });
    expect(await lireJetonGeste(faux, U1)).toBeNull();
  });

  it('refuse un jeton expiré', async () => {
    const { signerJetonGeste, lireJetonGeste } = await import('../jeton-geste');
    const jeton = await signerJetonGeste({ userId: U1, geste: 'pouce', tirage: 1 }, new Date(Date.now() - 31 * 60 * 1000));
    expect(await lireJetonGeste(jeton, U1)).toBeNull();
  });

  it('n’est pas interchangeable avec le jeton de vérification d’e-mail', async () => {
    const { signerJetonGeste, lireJetonGeste } = await import('../jeton-geste');
    const { createVerificationToken, verifyVerificationToken } = await import('@/lib/verify-token');
    const email = await createVerificationToken(U1, 'a@x.fr');
    expect(await lireJetonGeste(email, U1)).toBeNull();
    const geste = await signerJetonGeste({ userId: U1, geste: 'pouce', tirage: 1 });
    expect(await verifyVerificationToken(geste)).toBeNull();
  });
});
