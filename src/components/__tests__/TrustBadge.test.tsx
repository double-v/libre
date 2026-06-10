/**
 * Tests composant — TrustBadge.
 *
 * Vérifie :
 * 1. Les 4 bandes rendent avec les bons aria-label FR
 * 2. newcomer ne déclenche pas de ring (classe vide)
 * 3. member/trusted/anchor déclenchent un ring (classe `ring-*`)
 * 4. trusted rend l'icône check, anchor rend l'icône cœur
 * 5. showLabel affiche le label FR correspondant
 */
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { TrustBadge, TRUST_BANDS_ORDERED } from '../TrustBadge';

describe('<TrustBadge />', () => {
  it.each(TRUST_BANDS_ORDERED)('rend le band "%s" avec le bon aria-label', (band) => {
    const labels: Record<string, string> = {
      newcomer: 'Niveau de confiance : Nouveau',
      member: 'Niveau de confiance : Membre',
      trusted: 'Niveau de confiance : Fiable',
      anchor: 'Niveau de confiance : Ancre',
    };
    render(
      <TrustBadge band={band}>
        <div data-testid="child">A</div>
      </TrustBadge>,
    );
    const el = screen.getByRole('img', { name: labels[band] });
    expect(el).toBeInTheDocument();
    expect(screen.getByTestId('child')).toBeInTheDocument();
  });

  it('newcomer : aucune classe ring-* sur le wrapper interne', () => {
    const { container } = render(
      <TrustBadge band="newcomer">
        <div>X</div>
      </TrustBadge>,
    );
    // Le wrapper interne est le 1er div après le role="img" wrapper
    const inner = container.querySelector('[role="img"] > div') as HTMLElement;
    expect(inner.className).not.toMatch(/\bring-/);
  });

  it('member : ring-1 ring-coral/50', () => {
    const { container } = render(
      <TrustBadge band="member">
        <div>X</div>
      </TrustBadge>,
    );
    const inner = container.querySelector('[role="img"] > div') as HTMLElement;
    expect(inner.className).toMatch(/\bring-1\b/);
    expect(inner.className).toMatch(/\bring-coral\/50\b/);
  });

  it('trusted : ring-2 ring-coral + icône check', () => {
    const { container } = render(
      <TrustBadge band="trusted">
        <div>X</div>
      </TrustBadge>,
    );
    const inner = container.querySelector('[role="img"] > div') as HTMLElement;
    expect(inner.className).toMatch(/\bring-2\b/);
    expect(inner.className).toMatch(/\bring-coral\b/);
    // L'icône check est un span avec text "✓"
    expect(container.textContent).toContain('✓');
  });

  it('anchor : ring-[3px] + animate-pulse + icône cœur (svg)', () => {
    const { container } = render(
      <TrustBadge band="anchor">
        <div>X</div>
      </TrustBadge>,
    );
    const inner = container.querySelector('[role="img"] > div') as HTMLElement;
    expect(inner.className).toMatch(/ring-\[3px\]/);
    expect(inner.className).toMatch(/\banimate-pulse\b/);
    // L'icône cœur est un SVG
    expect(container.querySelector('svg')).toBeInTheDocument();
  });

  it('showLabel=false (défaut) : pas de label texte rendu', () => {
    render(
      <TrustBadge band="member">
        <div>X</div>
      </TrustBadge>,
    );
    expect(screen.queryByText('Membre')).not.toBeInTheDocument();
  });

  it('showLabel=true : affiche le label FR du band', () => {
    const labels: Record<string, string> = {
      newcomer: 'Nouveau',
      member: 'Membre',
      trusted: 'Fiable',
      anchor: 'Ancre',
    };
    const { rerender } = render(
      <TrustBadge band="member" showLabel>
        <div>X</div>
      </TrustBadge>,
    );
    expect(screen.getByText('Membre')).toBeInTheDocument();

    rerender(
      <TrustBadge band="anchor" showLabel>
        <div>X</div>
      </TrustBadge>,
    );
    expect(screen.getByText('Ancre')).toBeInTheDocument();
  });

  it('applique la bonne dimension en fonction de size', () => {
    const { container } = render(
      <TrustBadge band="member" size="lg">
        <div>X</div>
      </TrustBadge>,
    );
    const inner = container.querySelector('[role="img"] > div') as HTMLElement;
    expect(inner.style.width).toBe('80px');
    expect(inner.style.height).toBe('80px');
  });

  it('respecte prefers-reduced-motion : aucune logique JS ajoutée (globals.css neutralise)', () => {
    // Note : ce test documente l'intention. Le globals.css force animation-duration: 80ms
    // pour * TOUT * dans le mode reduced-motion. Notre `animate-pulse` est donc neutralisé
    // automatiquement. On vérifie juste qu'on n'a PAS mis une logique conditionnelle JS.
    const { container } = render(
      <TrustBadge band="anchor">
        <div>X</div>
      </TrustBadge>,
    );
    const inner = container.querySelector('[role="img"] > div') as HTMLElement;
    // L'animation est déclarée — c'est le CSS qui la neutralise
    expect(inner.className).toMatch(/\banimate-pulse\b/);
  });
});
