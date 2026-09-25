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

// Revue de la PR #466 : les canaux de sortie des faux profils (spec 006).
describe('contientUnContact — messageries et réseaux, dans tous les modes', () => {
  it.each([
    'écris-moi sur t.me/marie_92',
    'wa.me/33612345678',
    'mon insta : instagram.com/marie',
    'snapchat.com/add/marie',
    'retrouve-moi sur telegram.me/marie',
    'marie.me/contact',
  ])('repère « %s » en mode texte', (s) => expect(contientUnContact(s, 'texte')).toBe(true));

  it.each(['t.me/marie', 'wa.me/336'])('repère « %s » en mode pseudo', (s) => expect(contientUnContact(s, 'pseudo')).toBe(true));
});

// Revue de la PR #466 : un nombre français n'est pas un numéro de téléphone.
describe('contientUnContact — nombres honnêtes dans un texte', () => {
  it.each([
    'J’ai roulé 100 000 km à vélo.',
    'Né le 12.05.1990, à la mer.',
    'Un million, soit 1 000 000, c’est beaucoup.',
    'Rendez-vous le 03-04-2025.',
  ])('laisse passer « %s »', (s) => expect(contientUnContact(s, 'texte')).toBe(false));

  it.each(['appelle le 06 12 34 56 78', 'au 0612345678', 'sur le +33 6 12 34 56 78', 'au 06.12.34.56.78'])(
    'repère un vrai numéro : « %s »',
    (s) => expect(contientUnContact(s, 'texte')).toBe(true),
  );
});

