/**
 * Tests composant — SiteShell (échelle de largeurs centralisée, #277 / épic #273).
 *
 * Vérifie :
 * 1. Colonne centrée pleine largeur avec gouttières par défaut (mx-auto w-full px-*)
 * 2. L'échelle nommée mappe la bonne largeur : bleed → max-w-bleed (1400px),
 *    wide → max-w-wide (1180px), content → max-w-content (~1080px),
 *    reading → max-w-reading (~720px), app → max-w-lg (512px)
 * 3. Défaut = content (pages contenu respirent large — densité douce)
 * 4. Balise sémantique via `as` ; className additionnel fusionné ; rest props passés
 */
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import SiteShell from '../SiteShell';

describe('<SiteShell />', () => {
  it('renders a centered full-width column with default gutters', () => {
    render(<SiteShell data-testid="shell">contenu</SiteShell>);
    const el = screen.getByTestId('shell');
    expect(el).toHaveTextContent('contenu');
    expect(el).toHaveClass('mx-auto', 'w-full', 'px-4', 'sm:px-6');
  });

  it('defaults to the content width (~1080px)', () => {
    render(<SiteShell data-testid="shell">x</SiteShell>);
    expect(screen.getByTestId('shell')).toHaveClass('max-w-content');
  });

  it('maps each named width to its centralized utility', () => {
    const { rerender } = render(
      <SiteShell width="content" data-testid="shell">x</SiteShell>,
    );
    expect(screen.getByTestId('shell')).toHaveClass('max-w-content');

    rerender(<SiteShell width="reading" data-testid="shell">x</SiteShell>);
    expect(screen.getByTestId('shell')).toHaveClass('max-w-reading');

    rerender(<SiteShell width="app" data-testid="shell">x</SiteShell>);
    expect(screen.getByTestId('shell')).toHaveClass('max-w-lg');

    // Échelons ajoutés par #282 pour donner à #347 le vocabulaire complet.
    rerender(<SiteShell width="wide" data-testid="shell">x</SiteShell>);
    expect(screen.getByTestId('shell')).toHaveClass('max-w-wide');

    rerender(<SiteShell width="bleed" data-testid="shell">x</SiteShell>);
    expect(screen.getByTestId('shell')).toHaveClass('max-w-bleed');
  });

  it('garde ses gouttières sur wide, mais pas sur bleed (bandeau plein cadre)', () => {
    // `bleed` est le bandeau ambiant : lui imposer des gouttières le rendrait
    // plus étroit que la home, qui n'en met pas (cf. .lobby-band).
    const { rerender } = render(
      <SiteShell width="wide" data-testid="shell">x</SiteShell>,
    );
    expect(screen.getByTestId('shell')).toHaveClass('px-4', 'sm:px-6');

    rerender(<SiteShell width="bleed" data-testid="shell">x</SiteShell>);
    const el = screen.getByTestId('shell');
    expect(el).toHaveClass('mx-auto', 'w-full', 'max-w-bleed');
    expect(el.className).not.toContain('px-');
  });

  it('never mixes two width utilities at once', () => {
    render(<SiteShell width="app" data-testid="shell">x</SiteShell>);
    const cls = screen.getByTestId('shell').className;
    expect(cls).toContain('max-w-lg');
    expect(cls).not.toContain('max-w-content');
    expect(cls).not.toContain('max-w-reading');
    expect(cls).not.toContain('max-w-wide');
    expect(cls).not.toContain('max-w-bleed');
  });

  it('renders the requested semantic element (default div)', () => {
    const { rerender } = render(<SiteShell data-testid="shell">x</SiteShell>);
    expect(screen.getByTestId('shell').tagName).toBe('DIV');

    rerender(<SiteShell as="main" data-testid="shell">x</SiteShell>);
    expect(screen.getByTestId('shell').tagName).toBe('MAIN');
  });

  it('merges an additional className and forwards rest props', () => {
    render(
      <SiteShell className="py-12" aria-label="Contenu" data-testid="shell">
        x
      </SiteShell>,
    );
    const el = screen.getByTestId('shell');
    expect(el).toHaveClass('py-12', 'max-w-content');
    expect(el).toHaveAttribute('aria-label', 'Contenu');
  });
});
