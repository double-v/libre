import { describe, it, expect } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { useState } from 'react';
import { AnnonceProvider, PRIORITE, useAnnonce, type IdAnnonce } from '../AnnonceFile';

function Annonce({ id, actif }: { id: IdAnnonce; actif: boolean }) {
  const { visible, autreEnCours } = useAnnonce(id, actif);
  if (!actif) return null;
  return <p data-id={id}>{visible ? `${id} visible` : `${id} en attente`}{autreEnCours ? ' (autre)' : ''}</p>;
}

describe('file d’annonces (#507)', () => {
  it('l’ordre est avenant, puis vérification, puis bêta', () => {
    expect(PRIORITE.avenant).toBeGreaterThan(PRIORITE.verification);
    expect(PRIORITE.verification).toBeGreaterThan(PRIORITE.beta);
  });

  it('seule l’annonce la plus prioritaire est visible', () => {
    render(
      <AnnonceProvider>
        <Annonce id="beta" actif />
        <Annonce id="avenant" actif />
        <Annonce id="verification" actif />
      </AnnonceProvider>,
    );
    expect(screen.getByText(/^avenant visible/)).toBeInTheDocument();
    expect(screen.getByText('verification en attente (autre)')).toBeInTheDocument();
    expect(screen.getByText('beta en attente (autre)')).toBeInTheDocument();
  });

  it('quand l’avenant est tranché, l’annonce suivante prend la place', () => {
    function Avenant() {
      const [actif, setActif] = useState(true);
      return (
        <>
          <Annonce id="avenant" actif={actif} />
          <button type="button" onClick={() => setActif(false)}>Trancher</button>
        </>
      );
    }
    render(
      <AnnonceProvider>
        <Avenant />
        <Annonce id="verification" actif />
      </AnnonceProvider>,
    );
    expect(screen.getByText('verification en attente (autre)')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Trancher' }));
    expect(screen.getByText('verification visible')).toBeInTheDocument();
  });

  it('seule, la bêta est visible et ne voit personne d’autre', () => {
    render(
      <AnnonceProvider>
        <Annonce id="beta" actif />
      </AnnonceProvider>,
    );
    expect(screen.getByText('beta visible')).toBeInTheDocument();
  });

  it('sans fournisseur, chaque annonce reste visible (pas de régression hors du shell)', () => {
    render(<Annonce id="verification" actif />);
    expect(screen.getByText('verification visible')).toBeInTheDocument();
  });
});
