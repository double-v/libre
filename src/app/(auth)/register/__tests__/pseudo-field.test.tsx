/**
 * Tests — champ pseudo de l'inscription (#459).
 *
 * `autoComplete="username"` faisait proposer l'adresse e-mail par le
 * navigateur : origine probable des pseudos en forme d'e-mail.
 */
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';

vi.mock('next/navigation', () => ({ useRouter: () => ({ push: vi.fn(), replace: vi.fn() }) }));
vi.mock('next-auth/react', () => ({ useSession: () => ({ status: 'unauthenticated', data: null }) }));
vi.mock('@/components/TurnstileProvider', () => ({ __esModule: true, default: () => null }));

import RegisterPage from '../page';

describe('inscription — champ pseudo', () => {
  it('ne se présente pas comme un identifiant de connexion', () => {
    render(<RegisterPage />);
    const input = screen.getByLabelText(/^Pseudo/);
    expect(input).toHaveAttribute('autocomplete', 'nickname');
    expect(input).toHaveAttribute('maxlength', '30');
  });

  it('ne promet pas que seuls les matches voient le pseudo', () => {
    render(<RegisterPage />);
    expect(screen.queryByText(/matches ne verront/)).toBeNull();
    expect(screen.getByText(/tout le monde verra/)).toBeInTheDocument();
  });
});
