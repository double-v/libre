/**
 * Tests — détection d'un moyen de contact (#459, spec 009).
 *
 * Partagée par le pseudo et les réponses aux questions (et #443 plus tard).
 * Deux modes : un pseudo est court et sans phrase, toute extension de domaine
 * y est suspecte ; dans une phrase, `de`, `me`, `es`, `so`… sont d'abord des
 * mots, collés au point quand on oublie l'espace.
 */
import { describe, it, expect } from 'vitest';
import { contientUnContact } from '../contact';

describe('contientUnContact — pseudo', () => {
  it.each(['camille@gmail.com', '@cam', 'camille.fr', 'snap camille.me', 'www.cam', 'https://x', 'cam 06 12 34 56 78'])(
    'repère %s',
    (s) => expect(contientUnContact(s, 'pseudo')).toBe(true),
  );
  it.each(['Camille', 'marie.l', 'sam_92'])('laisse passer %s', (s) => expect(contientUnContact(s, 'pseudo')).toBe(false));
});

describe('contientUnContact — texte', () => {
  it.each([
    'écris-moi sur insta @cam.lyon',
    'mon mail : cam@gmail.com',
    'va voir camille.fr',
    'https://t.me/cam',
    'www.monsite',
    'appelle le 06 12 34 56 78',
  ])('repère « %s »', (s) => expect(contientUnContact(s, 'texte')).toBe(true));

  it.each([
    'J’adore la mer.De temps en temps la montagne.',
    'Le cinéma.Me poser devant un film, voilà.',
    'Trois chats et 2 chiens, depuis 2019.',
    'Le café, c’est sacré.',
  ])('laisse passer « %s »', (s) => expect(contientUnContact(s, 'texte')).toBe(false));
});
