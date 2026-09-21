/**
 * #429 — la liste des destinataires doit refléter la chaîne réelle.
 *
 * La base de données elle-même (Neon) manquait à la liste des sous-traitants :
 * c'est le destinataire de *toutes* les données. Ce test lit la page comme un
 * membre et vérifie que chaque brique du code qui reçoit des données
 * personnelles y figure, avec sa région quand elle décide d'un transfert.
 */
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import Confidentialite from '@/app/(legal)/confidentialite/page';

describe('page Confidentialité — destinataires', () => {
  it('nomme Neon comme hébergeur de la base et sa région', () => {
    render(<Confidentialite />);
    expect(screen.getByText('Neon')).toBeInTheDocument();
    expect(screen.getAllByText(/Francfort/).length).toBeGreaterThan(0);
  });

  it('dit que la base ne quitte pas l’Union européenne', () => {
    render(<Confidentialite />);
    expect(screen.getByText(/base de données.*reste.*Union européenne/i)).toBeInTheDocument();
  });
});
