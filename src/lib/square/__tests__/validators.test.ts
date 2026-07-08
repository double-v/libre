/**
 * Tests — squareMessageSchema (issue #157 / bug #104)
 *
 * Bug d'origine : envoyer un GIF affichait « Message invalide ». Cause : le
 * client (SquareInputArea) envoie un message GIF avec `content: ''` (le GIF se
 * suffit à lui-même), mais le schéma exigeait `content` non-vide (`min(1)`) pour
 * TOUS les types → le POST échouait en 400 avant même d'atteindre la logique GIF.
 */
import { describe, it, expect } from 'vitest';
import { squareMessageSchema } from '../validators';

const GIF_URL = 'https://media2.giphy.com/media/abc/giphy.mp4';

describe('squareMessageSchema — GIF à contenu vide (#157/#104)', () => {
  it('accepte un GIF avec content vide + gifUrl GIPHY', () => {
    const parsed = squareMessageSchema.safeParse({
      content: '',
      type: 'gif',
      gifUrl: GIF_URL,
    });
    expect(parsed.success).toBe(true);
  });

  it('refuse un GIF sans gifUrl', () => {
    const parsed = squareMessageSchema.safeParse({ content: '', type: 'gif' });
    expect(parsed.success).toBe(false);
  });

  it('refuse un gifUrl hors GIPHY (anti-SSRF)', () => {
    const parsed = squareMessageSchema.safeParse({
      content: '',
      type: 'gif',
      gifUrl: 'https://evil.example.com/x.gif',
    });
    expect(parsed.success).toBe(false);
  });
});

describe('squareMessageSchema — types non-GIF (régression)', () => {
  it('refuse toujours un message texte au content vide', () => {
    const parsed = squareMessageSchema.safeParse({ content: '', type: 'text' });
    expect(parsed.success).toBe(false);
  });

  it('accepte un message texte normal', () => {
    const parsed = squareMessageSchema.safeParse({ content: 'coucou', type: 'text' });
    expect(parsed.success).toBe(true);
  });

  it('refuse un type non-GIF qui porte un gifUrl', () => {
    const parsed = squareMessageSchema.safeParse({
      content: 'coucou',
      type: 'text',
      gifUrl: GIF_URL,
    });
    expect(parsed.success).toBe(false);
  });
});
