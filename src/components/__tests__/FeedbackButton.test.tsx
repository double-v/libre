/**
 * Rappel de la FAQ dans le formulaire de retour (#476) : un retour ne permet
 * pas encore de répondre au membre, alors une question déjà traitée doit
 * trouver sa réponse avant d'être envoyée.
 */
import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import FeedbackButton from '../FeedbackButton';

describe('<FeedbackButton />', () => {
  it('rappelle que la FAQ existe, dès l’ouverture du formulaire', () => {
    render(<FeedbackButton />);
    fireEvent.click(screen.getByRole('button', { name: /Signaler un problème/i }));
    const lien = screen.getByRole('link', { name: /foire aux questions/i });
    expect(lien).toHaveAttribute('href', '/faq');
  });
});
