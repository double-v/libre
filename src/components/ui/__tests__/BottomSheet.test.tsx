/** BottomSheet (spec 012, T039) : dialogue modal, focus piégé, Échap, retour du focus. */
import { describe, it, expect, afterEach } from 'vitest';
import { useState } from 'react';
import { render, screen, cleanup, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import BottomSheet from '../BottomSheet';

afterEach(cleanup);

function Banc() {
  const [ouverte, setOuverte] = useState(false);
  return (
    <>
      <button type="button" onClick={() => setOuverte(true)}>Ouvrir</button>
      <button type="button">Dehors</button>
      {ouverte && (
        <BottomSheet titre="Bannir Julien ?" onClose={() => setOuverte(false)}>
          <button type="button">Premier</button>
          <button type="button">Dernier</button>
        </BottomSheet>
      )}
    </>
  );
}

describe('BottomSheet', () => {
  it('dialogue modal nommé par son titre, focus sur le premier contrôle', async () => {
    const user = userEvent.setup();
    render(<Banc />);
    await user.click(screen.getByRole('button', { name: 'Ouvrir' }));
    const d = screen.getByRole('dialog', { name: 'Bannir Julien ?' });
    expect(d).toHaveAttribute('aria-modal', 'true');
    expect(screen.getByRole('button', { name: 'Premier' })).toHaveFocus();
  });

  it('Tab et Maj+Tab restent dans la feuille', async () => {
    const user = userEvent.setup();
    render(<Banc />);
    await user.click(screen.getByRole('button', { name: 'Ouvrir' }));
    await user.tab();
    expect(screen.getByRole('button', { name: 'Dernier' })).toHaveFocus();
    await user.tab();
    expect(screen.getByRole('button', { name: 'Premier' })).toHaveFocus();
    await user.tab({ shift: true });
    expect(screen.getByRole('button', { name: 'Dernier' })).toHaveFocus();
  });

  it('Échap ferme et rend le focus au déclencheur', async () => {
    const user = userEvent.setup();
    render(<Banc />);
    await user.click(screen.getByRole('button', { name: 'Ouvrir' }));
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(screen.getByRole('button', { name: 'Ouvrir' })).toHaveFocus();
  });

  it('un clic sur le voile ferme, un clic dans la feuille non', async () => {
    const user = userEvent.setup();
    render(<Banc />);
    await user.click(screen.getByRole('button', { name: 'Ouvrir' }));
    await user.click(screen.getByRole('button', { name: 'Premier' }));
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    fireEvent.mouseDown(screen.getByRole('dialog').parentElement!);
    expect(screen.queryByRole('dialog')).toBeNull();
  });
});
