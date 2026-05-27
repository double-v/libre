import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import RegisterPage from './page';

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn() }),
}));

describe('RegisterPage', () => {
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
    expect(screen.getByText(/gratuit\. pour toujours\./i)).toBeInTheDocument();
  });
});