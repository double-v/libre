/**
 * Tests composant — le bandeau de La Place (#358).
 *
 * Le reset quotidien se voyait **après coup** : on revenait, tout avait
 * disparu. Le compte à rebours existait, en 12px, quatrième ligne d'un bloc de
 * quatre. Ce que ces tests verrouillent, c'est le renversement demandé par le
 * canvas `LaPlace.dc.html` : le reset devient le sujet du haut de page.
 *
 * 1. Le thème du jour est un **titre**, pas un paragraphe.
 * 2. Le rebours est lisible d'un coup d'œil, et son heure est celle que le
 *    serveur applique — c'est le critère de #13 remonté jusqu'aux pixels.
 * 3. Le panneau passe par les tokens sémantiques (#282), jamais par une classe
 *    `.lobby-*` : l'ambiance de la home reste confinée à la home.
 * 4. La ligne de présence ne promet rien que le code ne sache compter.
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import SquareThemeBanner, { type ThemeInfo } from '../SquareThemeBanner';

const THEME: ThemeInfo = {
  themeId: 'pseudonymes',
  label: "Pseudonymes d'autrefois",
  description: 'Vieux prénoms français, conversation libre.',
  inputType: 'text',
  placeholder: 'Dis quelque chose…',
  maxLength: 280,
  allowFreeText: true,
  options: null,
  pseudonymNames: null,
};

/** 21h40 UTC — il reste 4 h 20 avant la borne de 2h UTC. */
const SOIR = new Date('2026-08-24T21:40:00Z');

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(SOIR);
});

afterEach(() => {
  vi.useRealTimers();
});

describe('SquareThemeBanner — le reset en rituel affiché', () => {
  it('donne au thème du jour le rang de titre', () => {
    render(<SquareThemeBanner theme={THEME} pseudonym="Perrine" />);
    // Le canvas le passe de 14px de paragraphe à 40px de titre : ce n'est pas
    // qu'une taille, c'est la structure du document qui change.
    expect(screen.getByRole('heading', { name: THEME.label })).toBeTruthy();
  });

  it('annonce le rebours en grand, avec ce qui va se passer', () => {
    render(<SquareThemeBanner theme={THEME} pseudonym="Perrine" />);
    expect(screen.getByText('4 h 20')).toBeTruthy();
    expect(screen.getByText(/avant que tout s'efface/i)).toBeTruthy();
  });

  it('compte vers la borne du serveur, pas vers une heure locale devinée', () => {
    // À 01h00 UTC, la borne de 2h UTC est à une heure — et surtout pas à 2h,
    // ce qu'aurait dit un rebours calculé sur l'heure locale d'un fuseau +1.
    vi.setSystemTime(new Date('2026-08-24T01:00:00Z'));
    render(<SquareThemeBanner theme={THEME} pseudonym="Perrine" />);
    expect(screen.getByText('1 h 00')).toBeTruthy();
  });

  it('reste affiché juste après un reset, au lieu de laisser un trou', () => {
    // L'ancien bandeau masquait le rebours au-delà de 23 h restantes. Le
    // canvas en fait un encart fixe : le masquer y creuse un vide.
    vi.setSystemTime(new Date('2026-08-24T02:10:00Z'));
    render(<SquareThemeBanner theme={THEME} pseudonym="Perrine" />);
    expect(screen.getByText('23 h 50')).toBeTruthy();
  });

  it('rend le pseudonyme du jour lisible', () => {
    render(<SquareThemeBanner theme={THEME} pseudonym="Perrine" />);
    expect(screen.getByText('Perrine')).toBeTruthy();
  });

  it('ne compte que des voix réellement entendues', () => {
    // Le canvas dessine « 7 personnes sur la Place ». Aucune API ne mesure une
    // présence : afficher ce chiffre serait une promesse que rien n'adosse.
    // On annonce ce qu'on sait compter — les voix depuis la réouverture.
    const { rerender } = render(
      <SquareThemeBanner theme={THEME} pseudonym="Perrine" voices={7} />,
    );
    expect(screen.getByText(/7 voix depuis la réouverture/i)).toBeTruthy();

    rerender(<SquareThemeBanner theme={THEME} pseudonym="Perrine" voices={1} />);
    expect(screen.getByText(/1 voix depuis la réouverture/i)).toBeTruthy();
  });

  it('dit le vide sans le reprocher — c’est le cas nominal au lancement', () => {
    render(<SquareThemeBanner theme={THEME} pseudonym="Perrine" voices={0} />);
    expect(screen.getByText(/personne n'a encore parlé/i)).toBeTruthy();
  });

  it('habille le bandeau du panneau vitré theme-aware, jamais de l’ambiance home', () => {
    const { container } = render(<SquareThemeBanner theme={THEME} pseudonym="Perrine" />);
    expect(container.querySelector('.panel-glass')).toBeTruthy();
    expect(container.querySelector('[class*="lobby-"]')).toBeNull();
  });

  it('tient debout tant que le thème n’est pas chargé', () => {
    const { container } = render(<SquareThemeBanner theme={null} pseudonym="Perrine" />);
    // Le rebours ne dépend pas du thème : il reste affiché pendant le
    // chargement, sinon le haut de page saute au moment où la réponse arrive.
    expect(screen.getByText('4 h 20')).toBeTruthy();
    expect(container.querySelector('.panel-glass')).toBeTruthy();
  });
});
