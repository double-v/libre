import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import RegisterPage from './page';

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn() }),
}));

vi.mock('next-auth/react', () => ({
  useSession: () => ({ status: 'unauthenticated' }),
}));

describe('RegisterPage', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('renders registration form', () => {
    render(<RegisterPage />);
    expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/mot de passe/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /créer/i })).toBeInTheDocument();
  });

  it('shows validation error on empty submit', async () => {
    const user = userEvent.setup();
    render(<RegisterPage />);

    const submitButton = screen.getByRole('button', { name: /créer/i });
    await user.click(submitButton);

    // HTML5 validation prevents submission — inputs are required
    const emailInput = screen.getByLabelText(/email/i);
    expect(emailInput).toBeRequired();
  });

  it('has link to login page', () => {
    render(<RegisterPage />);
    const loginLink = screen.getByRole('link', { name: /se connecter/i });
    expect(loginLink).toHaveAttribute('href', '/login');
  });

  it('displays the tagline', () => {
    render(<RegisterPage />);
    expect(screen.getByText(/gratuit\. sans limites\./i)).toBeInTheDocument();
  });

  // Regression: #23 — the client never sent consentGiven in the POST body.
  // The server then defaulted to false and returned 400 "Vous devez accepter
  // les CGU...". The page set an error and never redirected to /login, so
  // E2E tests timed out waiting for /login. This test pins the contract.
  it('sends consentGiven: true in /api/auth/register body when consent is checked', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 201,
      json: async () => ({ user: { id: 'u1', email: 'x@y.z', displayName: 'x' } }),
    });
    vi.stubGlobal('fetch', fetchMock);

    const user = userEvent.setup();
    render(<RegisterPage />);

    await user.type(screen.getByLabelText(/pseudo/i), 'Tester');
    await user.type(screen.getByLabelText(/email/i), 'tester@example.com');
    await user.type(screen.getByLabelText(/mot de passe/i), 'Passw0rd');
    await user.click(screen.getByLabelText(/j'accepte/i));
    await user.click(screen.getByRole('button', { name: /créer/i }));

    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));
    const [, init] = fetchMock.mock.calls[0];
    const body = JSON.parse(init.body);
    expect(body.consentGiven).toBe(true);
  });
});
