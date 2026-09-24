/**
 * AdminPhotoSearch (spec 006 · US1, #442) — le menu « Rechercher cette image ».
 *
 * Variante A du prototype T008 : un bouton, trois moteurs. Chaque lien passe
 * par la route journalisée — jamais d'URL de moteur ni d'URL R2 dans la page,
 * sinon la trace SEARCH_PHOTO serait contournable.
 */
import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import AdminPhotoSearch from '../AdminPhotoSearch';

const CLE = 'u1/photo a.jpg';

describe('<AdminPhotoSearch />', () => {
  it('propose Lens, Yandex et TinEye, chacun via la route journalisée, dans un nouvel onglet', () => {
    render(<AdminPhotoSearch cle={CLE} />);
    fireEvent.click(screen.getByText('Rechercher cette image'));

    // Nom accessible : la flèche ↗ est décorative (aria-hidden).
    const liens = ['Google Lens', 'Yandex', 'TinEye'].map((name) => screen.getByRole('link', { name }));
    expect(screen.getAllByRole('link')).toHaveLength(3);
    for (const [a, moteur] of liens.map((a, i) => [a, ['lens', 'yandex', 'tineye'][i]] as const)) {
      const url = new URL(a.getAttribute('href')!, 'http://x');
      expect(url.pathname).toBe('/api/admin/photos/recherche');
      expect(url.searchParams.get('cle')).toBe(CLE);
      expect(url.searchParams.get('moteur')).toBe(moteur);
      expect(a).toHaveAttribute('target', '_blank');
      expect(a.getAttribute('rel')).toContain('noopener');
      expect(a.getAttribute('rel')).toContain('noreferrer');
    }
  });

  it('cibles d’au moins 44 px et focus coral', () => {
    const { container } = render(<AdminPhotoSearch cle={CLE} />);
    const summary = container.querySelector('summary')!;
    expect(summary.className).toMatch(/min-h-11/);
    expect(summary.className).toMatch(/focus-visible:ring-coral/);
    for (const a of container.querySelectorAll('a')) expect(a.className).toMatch(/min-h-11/);
  });
});
