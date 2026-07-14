/**
 * Tests composant — ThemeToggle (bascule Mode du SiteNav de l'app connectée).
 *
 * Vérifie :
 * 1. Défaut sans préférence stockée = Auto (système), action annoncée = passer en Clair
 * 2. Le clic cycle Clair → Sombre → Auto et persiste `mode` (localStorage + `.dark`)
 * 3. N'expose que le Mode (aucune notion de thème/skin dans le bouton)
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import ThemeToggle from '../ThemeToggle';

function ariaLabel() {
  return screen.getByRole('button').getAttribute('aria-label') ?? '';
}

describe('<ThemeToggle />', () => {
  beforeEach(() => {
    window.localStorage.clear();
    document.documentElement.classList.remove('dark');
    document.documentElement.removeAttribute('data-theme');
  });

  it('defaults to Auto and announces the next click target', () => {
    render(<ThemeToggle />);
    expect(ariaLabel()).toMatch(/Apparence : Auto \(système\)/);
    expect(ariaLabel()).toMatch(/passer en Clair/);
  });

  it('cycles Clair → Sombre → Auto and persists the mode', () => {
    render(<ThemeToggle />);
    const btn = screen.getByRole('button');

    fireEvent.click(btn); // Auto → Clair
    expect(ariaLabel()).toMatch(/Apparence : Clair/);
    expect(window.localStorage.getItem('libre-theme')).toBe('light');

    fireEvent.click(btn); // Clair → Sombre
    expect(ariaLabel()).toMatch(/Apparence : Sombre/);
    expect(window.localStorage.getItem('libre-theme')).toBe('dark');
    expect(document.documentElement.classList.contains('dark')).toBe(true);

    fireEvent.click(btn); // Sombre → Auto
    expect(ariaLabel()).toMatch(/Apparence : Auto \(système\)/);
    expect(window.localStorage.getItem('libre-theme')).toBe('auto');
  });

  it('never exposes a theme/skin choice — Mode axis only', () => {
    render(<ThemeToggle />);
    // Un seul contrôle, aucune grille de thèmes ni libellé de skin.
    expect(screen.getAllByRole('button')).toHaveLength(1);
    expect(ariaLabel()).not.toMatch(/thème|skin|libre|cartoon|arcade|retro/i);
  });
});
