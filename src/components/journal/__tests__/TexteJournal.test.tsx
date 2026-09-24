/**
 * TexteJournal (spec 007, R2) — le corps d'une publication rendu en React,
 * sur la page publique comme dans l'aperçu admin (FR-010).
 */
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { readFileSync } from 'fs';
import { join } from 'path';
import TexteJournal from '../TexteJournal';

describe('<TexteJournal />', () => {
  it('paragraphes, listes, gras, italique', () => {
    const { container } = render(<TexteJournal corps={'Premier **fort** et *doux*.\n\n- un\n- deux\n\n1. a\n2. b'} />);
    expect(container.querySelectorAll('p')).toHaveLength(1);
    expect(container.querySelector('strong')).toHaveTextContent('fort');
    expect(container.querySelector('em')).toHaveTextContent('doux');
    expect(container.querySelectorAll('ul > li')).toHaveLength(2);
    expect(container.querySelectorAll('ol > li')).toHaveLength(2);
  });

  it('le balisage saisi s’affiche comme du texte, jamais interprété', () => {
    const { container } = render(<TexteJournal corps={'<script>alert(1)</script><img src=x onerror=alert(1)>'} />);
    expect(container.querySelector('script, img')).toBeNull();
    expect(container).toHaveTextContent('<script>alert(1)</script>');
  });

  it('lien interne sans cible ; lien externe dans un nouvel onglet, sans référent ni suivi', () => {
    render(<TexteJournal corps={'[manifeste](/manifesto) et [aide](https://www.service-public.fr/x)'} />);
    const interne = screen.getByRole('link', { name: 'manifeste' });
    expect(interne).toHaveAttribute('href', '/manifesto');
    expect(interne).not.toHaveAttribute('target');
    const externe = screen.getByRole('link', { name: /aide/ });
    expect(externe).toHaveAttribute('target', '_blank');
    expect(externe.getAttribute('rel')?.split(' ').sort()).toEqual(['nofollow', 'noopener', 'noreferrer']);
  });

  it('un lien au schéma refusé reste du texte', () => {
    render(<TexteJournal corps={'[clic](javascript:alert(1))'} />);
    expect(screen.queryByRole('link')).toBeNull();
  });

  it('aucun dangerouslySetInnerHTML dans les composants du journal', () => {
    for (const f of ['TexteJournal.tsx', 'CarteJournal.tsx']) {
      expect(readFileSync(join(__dirname, '..', f), 'utf8')).not.toMatch(/dangerouslySetInnerHTML/);
    }
    expect(readFileSync(join(process.cwd(), 'src/components/ui/Prose.tsx'), 'utf8')).not.toMatch(/dangerouslySetInnerHTML/);
  });
});
