/**
 * Tests — page FAQ publique « Cercle de Confiance » (issue #63).
 *
 * Le ticket supposait une page /faq existante à compléter ; elle n'existe pas
 * (seul /faq/session-expiree existe). On crée donc la page générale et on
 * verrouille : les 5 Q/R du Cercle, le lien vers /trust/how-it-works (route
 * réelle — le ticket citait /settings/trust/how-it-works, inexistant), et le
 * renvoi vers la FAQ « session expirée » existante (non régressée).
 */
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import FaqPage from '../page';

describe('<FaqPage />', () => {
  it('affiche les 5 questions du Cercle de Confiance', () => {
    render(<FaqPage />);
    const questions = [
      /C.est quoi le Cercle de Confiance/i,
      /Mes contacts savent-ils qu.ils sont dans mon cercle/i,
      /si j.active un check-in et que je ne reviens pas/i,
      /gardez ma position/i,
      /contacts qui ne sont pas sur Libre/i,
    ];
    for (const q of questions) {
      expect(screen.getByText(q)).toBeInTheDocument();
    }
  });

  it('la réponse Q1 pointe vers la page « Comment ça marche » du Cercle', () => {
    render(<FaqPage />);
    const link = screen.getByRole('link', { name: /Comment (ça|ca) marche/i });
    expect(link).toHaveAttribute('href', '/trust/how-it-works');
  });

  it('répond sur l’alerte silencieuse et la position (non conservée en continu)', () => {
    render(<FaqPage />);
    expect(screen.getByText(/alerte silencieuse/i)).toBeInTheDocument();
    expect(screen.getByText(/jamais en continu/i)).toBeInTheDocument();
  });

  it('annonce l’ouverture aux contacts hors Libre en V2 (opt-in)', () => {
    render(<FaqPage />);
    expect(screen.getByText(/V2/)).toBeInTheDocument();
    expect(screen.getByText(/opt-in explicite/i)).toBeInTheDocument();
  });

  it('préserve l’accès à la FAQ « session expirée » existante', () => {
    render(<FaqPage />);
    const link = screen.getByRole('link', { name: /session expirée/i });
    expect(link).toHaveAttribute('href', '/faq/session-expiree');
  });

  // #476 : la question est arrivée par le formulaire de retour, qui ne permet
  // pas encore de répondre. Elle doit être joignable par ancre et dire les
  // vraies causes, sans chiffre (même charte que LAUNCH_COPY).
  describe('« Je ne vois aucun profil »', () => {
    it('est joignable par l’ancre #aucun-profil', () => {
      const { container } = render(<FaqPage />);
      const section = container.querySelector('#aucun-profil');
      expect(section).not.toBeNull();
      expect(section).toHaveTextContent(/Je ne vois aucun profil, pourquoi/);
    });

    it('nomme les causes réelles : filtres, position, profils déjà aimés, ouverture récente', () => {
      const { container } = render(<FaqPage />);
      const texte = container.querySelector('#aucun-profil')!.textContent!;
      expect(texte).toMatch(/filtres/i);
      expect(texte).toMatch(/position/i);
      expect(texte).toMatch(/aimée/i);
      expect(texte).toMatch(/vient d.ouvrir/i);
    });

    it('envoie vers le profil pour saisir sa ville', () => {
      const { container } = render(<FaqPage />);
      const lien = container.querySelector('#aucun-profil a[href="/profile"]');
      expect(lien).not.toBeNull();
    });

    it('ne donne aucun chiffre', () => {
      const { container } = render(<FaqPage />);
      expect(container.querySelector('#aucun-profil')!.textContent).not.toMatch(/\d/);
    });
  });
});
