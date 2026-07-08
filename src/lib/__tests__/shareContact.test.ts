/**
 * Tests — détection des messages « partage de réseaux » (issue #207).
 *
 * Un message share-contact est un JSON `{"type":"share-contact",...}` envoyé
 * EN CLAIR dans le chat (pas chiffré). Le bug : le chat l'affichait tel quel,
 * en JSON brut. On doit le reconnaître de façon fiable pour le rendre en badge.
 */
import { describe, it, expect } from 'vitest';
import {
  SHARE_CONTACT_TYPE,
  buildShareContactMessage,
  isShareContactMessage,
} from '../shareContact';

describe('shareContact', () => {
  it('buildShareContactMessage produit un JSON de type share-contact', () => {
    const raw = buildShareContactMessage();
    const parsed = JSON.parse(raw);
    expect(parsed.type).toBe(SHARE_CONTACT_TYPE);
  });

  it('isShareContactMessage reconnaît un message construit', () => {
    expect(isShareContactMessage(buildShareContactMessage())).toBe(true);
  });

  it('reconnaît le payload exact remonté dans le bug', () => {
    expect(
      isShareContactMessage('{"type":"share-contact","data":"Contact info shared"}'),
    ).toBe(true);
  });

  it('ignore un message texte normal', () => {
    expect(isShareContactMessage('Salut, ça va ?')).toBe(false);
  });

  it('ignore un texte qui commence par { mais n’est pas du JSON', () => {
    expect(isShareContactMessage('{pas du json')).toBe(false);
  });

  it('ignore du chiffré base64 (cas nominal des messages)', () => {
    expect(isShareContactMessage('SGVsbG8gd29ybGQgY2lwaGVydGV4dA==')).toBe(false);
  });

  it('ignore un JSON valide d’un autre type', () => {
    expect(isShareContactMessage('{"type":"autre-chose"}')).toBe(false);
  });

  it('ignore une chaîne vide', () => {
    expect(isShareContactMessage('')).toBe(false);
  });
});
