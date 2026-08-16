/**
 * @vitest-environment node
 *
 * Environnement node explicite : sous jsdom, le `Uint8Array` produit par
 * `TextEncoder` vient d'un autre realm et jose rejette la clé de signature
 * (« payload must be an instance of Uint8Array »). La route, elle, tourne
 * bien en runtime node.
 *
 * Garde sur l'unicité des jetons de réinitialisation (#334).
 *
 * Le jeton était un JWT purement déterministe : même `userId`, même `email`,
 * et un `iat` à la seconde près. Deux demandes dans la même seconde
 * produisaient donc le même jeton, donc le même `tokenHash` — et la création
 * en base tombait sur la contrainte d'unicité (500 côté utilisateur).
 */
import { describe, it, expect } from 'vitest';
import { decodeJwt } from 'jose';
import { createResetToken, verifyResetToken } from '../reset-token';

describe('createResetToken', () => {
  it('produit deux jetons distincts pour deux demandes dans la même seconde', async () => {
    const [a, b] = await Promise.all([
      createResetToken('user-1', 'personne@example.com'),
      createResetToken('user-1', 'personne@example.com'),
    ]);

    expect(a).not.toBe(b);
  });

  it('porte un identifiant unique par jeton', async () => {
    const jeton = await createResetToken('user-1', 'personne@example.com');

    expect(decodeJwt(jeton).jti).toEqual(expect.any(String));
  });

  it('reste vérifiable et conserve son usage', async () => {
    const jeton = await createResetToken('user-1', 'personne@example.com');

    await expect(verifyResetToken(jeton)).resolves.toEqual({
      userId: 'user-1',
      email: 'personne@example.com',
    });
  });
});
