/**
 * #417 — ActionMenu, le « ⋯ » du DS.
 *
 * Un seul déclencheur de 44 px, un menu qui se ferme sur Échap, clic dehors et
 * choix d'un élément, focus rendu au déclencheur. Les éléments restent ce que
 * l'appelant en fait (bouton, lien) : le menu ne porte que la mécanique.
 */
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ActionMenu from '../ActionMenu';

function Sujet({ onA = vi.fn() }: { onA?: () => void }) {
  return (
    <div>
      <button type="button">Ailleurs</button>
      <ActionMenu label="Plus d’actions">
        {(fermer) => (
          <>
            <button type="button" role="menuitem" onClick={() => { onA(); fermer(); }}>Action A</button>
            <button type="button" role="menuitem">Action B</button>
          </>
        )}
      </ActionMenu>
    </div>
  );
}

describe('ActionMenu', () => {
  it('est fermé au départ, avec un déclencheur nommé et aria-haspopup', () => {
    render(<Sujet />);
    const declencheur = screen.getByRole('button', { name: 'Plus d’actions' });
    expect(declencheur).toHaveAttribute('aria-haspopup', 'menu');
    expect(declencheur).toHaveAttribute('aria-expanded', 'false');
    expect(screen.queryByRole('menu')).not.toBeInTheDocument();
  });

  it('s’ouvre au clic, liste les éléments, et focus le premier', async () => {
    const user = userEvent.setup();
    render(<Sujet />);
    await user.click(screen.getByRole('button', { name: 'Plus d’actions' }));
    expect(screen.getByRole('menu')).toBeInTheDocument();
    expect(screen.getAllByRole('menuitem')).toHaveLength(2);
    expect(screen.getByRole('menuitem', { name: 'Action A' })).toHaveFocus();
  });

  it('se ferme sur Échap et rend le focus au déclencheur', async () => {
    const user = userEvent.setup();
    render(<Sujet />);
    const declencheur = screen.getByRole('button', { name: 'Plus d’actions' });
    await user.click(declencheur);
    await user.keyboard('{Escape}');
    expect(screen.queryByRole('menu')).not.toBeInTheDocument();
    expect(declencheur).toHaveFocus();
  });

  it('se ferme au clic dehors', async () => {
    const user = userEvent.setup();
    render(<Sujet />);
    await user.click(screen.getByRole('button', { name: 'Plus d’actions' }));
    await user.click(screen.getByRole('button', { name: 'Ailleurs' }));
    expect(screen.queryByRole('menu')).not.toBeInTheDocument();
  });

  it('un élément qui appelle `fermer` déclenche son action puis referme', async () => {
    const onA = vi.fn();
    const user = userEvent.setup();
    render(<Sujet onA={onA} />);
    await user.click(screen.getByRole('button', { name: 'Plus d’actions' }));
    await user.click(screen.getByRole('menuitem', { name: 'Action A' }));
    expect(onA).toHaveBeenCalledOnce();
    expect(screen.queryByRole('menu')).not.toBeInTheDocument();
  });
});
