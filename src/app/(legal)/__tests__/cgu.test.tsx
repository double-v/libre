/**
 * Garde de non-régression sur les CGU — posture de chiffrement et accès service.
 *
 * La page Confidentialité porte le détail technique (§8.1). Les CGU doivent
 * redire la même chose en termes contractuels : chiffrement + capacité
 * technique d'accès encadrée. Aucune promesse de confidentialité absolue ne
 * doit traîner.
 */
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import CGUPage from '@/app/(legal)/cgu/page';

describe('page CGU — posture de messagerie', () => {
  it('mentionne que la clé privée est conservée chiffrée côté service', () => {
    render(<CGUPage />);
    expect(screen.getByText(/clé privée de messagerie/i)).toBeInTheDocument();
    expect(screen.getByText(/chiffrée côté service/i)).toBeInTheDocument();
  });

  it("dit que l'équipe peut techniquement déchiffrer, sans promettre l'inverse", () => {
    render(<CGUPage />);
    expect(screen.getByText(/capacité de déchiffrer vos messages/i)).toBeInTheDocument();
  });

  it("liste les cas d'accès limitatifs", () => {
    render(<CGUPage />);
    expect(screen.getByText(/signalement d'un contenu ou comportement grave/i)).toBeInTheDocument();
    expect(screen.getByText(/obligation légale ou réquisition judiciaire/i)).toBeInTheDocument();
    expect(screen.getByText(/modération ciblée et documentée/i)).toBeInTheDocument();
  });

  it('ne promet pas une confidentialité que le code ne tient pas', () => {
    render(<CGUPage />);
    const page = document.body.textContent ?? '';
    expect(page).not.toMatch(/seuls l'expéditeur et le destinataire peuvent les lire/i);
    expect(page).not.toMatch(/le serveur ne peut pas les lire/i);
    expect(page).not.toMatch(/ne peut pas lire vos messages/i);
  });
});
