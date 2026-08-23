/**
 * #337 — la page Confidentialité doit décrire la posture réelle.
 *
 * Le pendant positif de `promesse-chiffrement.test.ts` : celui-là vérifie
 * qu'aucune fausse promesse ne traîne, celui-ci qu'on dit bien la vérité. Retirer
 * la phrase gênante sans la remplacer laisserait un silence — et un silence sur
 * ce point est encore un mensonge par omission.
 */
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import Confidentialite from '@/app/(legal)/confidentialite/page';

describe('page Confidentialité — posture de chiffrement', () => {
  it('dit que le service peut techniquement déchiffrer les messages', () => {
    render(<Confidentialite />);
    expect(
      screen.getByText(/techniquement, nous pouvons donc lire vos messages/i),
    ).toBeInTheDocument();
  });

  it('explique pourquoi ce choix a été fait, au lieu de le subir', () => {
    render(<Confidentialite />);
    expect(screen.getByText(/effaçait définitivement toutes vos conversations/i)).toBeInTheDocument();
  });

  it('mentionne le cache de messages en clair sur l’appareil', () => {
    render(<Confidentialite />);
    expect(screen.getByText(/gardés en clair dans le stockage local/i)).toBeInTheDocument();
  });

  it('annonce la durée de conservation des messages', () => {
    render(<Confidentialite />);
    expect(screen.getByText(/aussi longtemps que la conversation/i)).toBeInTheDocument();
  });
});
