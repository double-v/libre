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

  it('refuse le jeton d’un autre membre, un jeton altéré ou un geste inconnu', async () => {
    const { signerJetonGeste, lireJetonGeste } = await import('../jeton-geste');
    const jeton = await signerJetonGeste({ userId: U1, geste: 'pouce', tirage: 1 });
    expect(await lireJetonGeste(jeton, U2)).toBeNull();
    expect(await lireJetonGeste(jeton.slice(0, -2) + 'xx', U1)).toBeNull();
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
