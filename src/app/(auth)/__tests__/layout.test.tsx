/**
 * Tests — migration de (auth) sur le shell unifié (#281, épic #273).
 *
 * Décisions (opérateur, 2026-07-13) :
 *  - auth reçoit la **navbar unifiée du site** (variante guest) comme partout ;
 *  - **aucun sélecteur de thème** sur login/register (auth = contexte invité,
 *    thème = défaut du site, comme la landing) — le ThemeMenu est retiré ;
 *  - le formulaire (children) reste dans une carte centrée.
 */
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import AuthLayout from '../layout';

describe('AuthLayout — shell migration (#281)', () => {
  it('utilise la navbar unifiée du site (variante guest)', () => {
    render(
      <AuthLayout>
        <p>Formulaire</p>
      </AuthLayout>,
    );
    expect(
      screen.getByRole('navigation', { name: 'Navigation principale' }),
    ).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Se connecter' })).toHaveAttribute(
      'href',
      '/login',
    );
    expect(screen.getByRole('link', { name: 'Créer un compte' })).toHaveAttribute(
      'href',
      '/register',
    );
  });

  it("n'expose aucun sélecteur de thème (comme la landing)", () => {
    render(
      <AuthLayout>
        <p>Formulaire</p>
      </AuthLayout>,
    );
    // Le ThemeMenu (bouton « Thème et apparence ») a été retiré ; la variante
    // guest de la navbar n'expose aucun bouton.
    expect(screen.queryByRole('button')).toBeNull();
  });

  it('rend le formulaire (children)', () => {
    render(
      <AuthLayout>
        <p data-testid="form">Formulaire</p>
      </AuthLayout>,
    );
    expect(screen.getByTestId('form')).toBeInTheDocument();
  });
});
