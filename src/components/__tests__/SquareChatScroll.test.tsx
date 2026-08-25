/**
 * Tests — l'arrivée sur La Place (#358).
 *
 * Mesuré au navigateur avant correction : à l'ouverture, la page s'auto-scrolle
 * de 145px et glisse le bandeau du jour sous la nav collante. Le rituel qu'on
 * vient de mettre en haut de page n'était donc pas « lisible d'un coup d'œil » —
 * le premier critère du ticket.
 *
 * La cause : la sentinelle d'auto-scroll était posée **après** le composeur,
 * donc hors du conteneur scrollable. `scrollIntoView` remontait alors jusqu'au
 * document et scrollait la page entière au lieu du fil.
 */
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import SquareMessageList from '../SquareMessageList';
import type { SquareMessage } from '@/lib/square/store';

const message = (id: string, pseudonym: string): SquareMessage => ({
  id,
  pseudonym,
  content: `message ${id}`,
  type: 'text',
  isAdmin: false,
  isSystem: false,
  timestamp: Date.parse('2026-08-24T21:00:00Z'),
});

/** jsdom ne fait pas de layout : on pose une hauteur de contenu crédible. */
function poserHauteur(fil: HTMLElement, hauteur: number) {
  Object.defineProperty(fil, 'scrollHeight', { value: hauteur, configurable: true });
}

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe('auto-scroll du fil', () => {
  it('scrolle le fil, jamais la page', () => {
    const scrollDeLaPage = vi.fn();
    vi.stubGlobal('scrollTo', scrollDeLaPage);

    const { rerender } = render(
      <SquareMessageList messages={[message('a', 'Amédée')]} reactions={{}} autoScroll />,
    );
    const fil = screen.getByRole('log');
    poserHauteur(fil, 900);

    rerender(
      <SquareMessageList
        messages={[message('a', 'Amédée'), message('b', 'Clothilde')]}
        reactions={{}}
        autoScroll
      />,
    );

    expect(fil.scrollTop).toBe(900);
    // Le haut de page appartient au bandeau du jour : il ne bouge pas tout seul.
    expect(scrollDeLaPage).not.toHaveBeenCalled();
  });

  it('reste immobile quand le fil ne se suit pas', () => {
    const { rerender } = render(
      <SquareMessageList messages={[message('a', 'Amédée')]} reactions={{}} />,
    );
    const fil = screen.getByRole('log');
    poserHauteur(fil, 900);

    rerender(
      <SquareMessageList
        messages={[message('a', 'Amédée'), message('b', 'Clothilde')]}
        reactions={{}}
      />,
    );

    expect(fil.scrollTop).toBe(0);
  });

  it('ne glisse pas en douceur quand le mouvement est refusé', () => {
    // `prefers-reduced-motion: reduce` → saut sec. Le confort de lecture prime
    // sur l'effet, cf. CLAUDE.md § Invariants.
    vi.stubGlobal('matchMedia', (query: string) => ({
      matches: query.includes('prefers-reduced-motion'),
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    }));

    const { rerender } = render(
      <SquareMessageList messages={[message('a', 'Amédée')]} reactions={{}} autoScroll />,
    );
    const fil = screen.getByRole('log');
    const scrollTo = vi.fn();
    fil.scrollTo = scrollTo as unknown as typeof fil.scrollTo;
    poserHauteur(fil, 900);

    rerender(
      <SquareMessageList
        messages={[message('a', 'Amédée'), message('b', 'Clothilde')]}
        reactions={{}}
        autoScroll
      />,
    );

    expect(scrollTo).toHaveBeenCalledWith({ top: 900, behavior: 'auto' });
  });

  it('glisse en douceur par défaut', () => {
    vi.stubGlobal('matchMedia', (query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    }));

    const { rerender } = render(
      <SquareMessageList messages={[message('a', 'Amédée')]} reactions={{}} autoScroll />,
    );
    const fil = screen.getByRole('log');
    const scrollTo = vi.fn();
    fil.scrollTo = scrollTo as unknown as typeof fil.scrollTo;
    poserHauteur(fil, 900);

    rerender(
      <SquareMessageList
        messages={[message('a', 'Amédée'), message('b', 'Clothilde')]}
        reactions={{}}
        autoScroll
      />,
    );

    expect(scrollTo).toHaveBeenCalledWith({ top: 900, behavior: 'smooth' });
  });
});
