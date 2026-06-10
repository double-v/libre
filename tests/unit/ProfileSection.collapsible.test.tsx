import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ProfileSection from '@/components/ProfileSection';

describe('ProfileSection — collapsible + completion check', () => {
  it('shows a check icon when complete=true', () => {
    render(
      <ProfileSection title="Bio" complete>
        Contenu
      </ProfileSection>
    );
    // The check should be announced to assistive tech
    expect(screen.getByLabelText(/Bio.*(rempli|complete)/i)).toBeInTheDocument();
  });

  it('hides the check icon when complete is false or omitted', () => {
    render(
      <ProfileSection title="Bio">
        Contenu
      </ProfileSection>
    );
    expect(screen.queryByLabelText(/Bio.*(rempli|complete)/i)).not.toBeInTheDocument();
  });

  it('renders the title in a button when collapsible (default)', () => {
    render(
      <ProfileSection title="Identité">
        <p>Contenu</p>
      </ProfileSection>
    );
    // The title should be clickable to toggle
    expect(screen.getByRole('button', { name: /Identité/i })).toBeInTheDocument();
  });

  it('does not collapse the section by default (open=true)', () => {
    render(
      <ProfileSection title="Identité">
        <p>Contenu visible</p>
      </ProfileSection>
    );
    expect(screen.getByText('Contenu visible')).toBeVisible();
  });

  it('collapses on click and re-expands on second click', async () => {
    const user = userEvent.setup();
    render(
      <ProfileSection title="Identité">
        <p>Contenu</p>
      </ProfileSection>
    );
    const trigger = screen.getByRole('button', { name: /Identité/i });
    expect(screen.getByText('Contenu')).toBeVisible();

    await user.click(trigger);
    expect(screen.queryByText('Contenu')).not.toBeInTheDocument();

    await user.click(trigger);
    expect(screen.getByText('Contenu')).toBeVisible();
  });

  it('starts collapsed when defaultOpen=false', () => {
    render(
      <ProfileSection title="Pratiques" defaultOpen={false}>
        <p>Contenu</p>
      </ProfileSection>
    );
    expect(screen.queryByText('Contenu')).not.toBeInTheDocument();
    // But the trigger is still there
    expect(screen.getByRole('button', { name: /Pratiques/i })).toBeInTheDocument();
  });

  it('uses aria-expanded reflecting the open state', async () => {
    const user = userEvent.setup();
    render(
      <ProfileSection title="Identité">
        <p>Contenu</p>
      </ProfileSection>
    );
    const trigger = screen.getByRole('button', { name: /Identité/i });
    expect(trigger).toHaveAttribute('aria-expanded', 'true');

    await user.click(trigger);
    expect(trigger).toHaveAttribute('aria-expanded', 'false');
  });

  it('stays open (cannot collapse) when onEdit is provided and editing=true', () => {
    render(
      <ProfileSection title="Bio" onEdit={() => {}} editing>
        <p>Contenu</p>
      </ProfileSection>
    );
    // While editing, the user MUST see the form
    expect(screen.getByText('Contenu')).toBeVisible();
  });
});
