import { describe, expect, it, beforeEach } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ProfileSection from '@/components/ProfileSection';

const STORAGE_PREFIX = 'libre-profile-section-';

beforeEach(() => {
  localStorage.clear();
});

describe('ProfileSection — persistence + always-open when complete', () => {
  it('persists the collapsed state in localStorage under the sectionId', async () => {
    const user = userEvent.setup();
    render(
      <ProfileSection title="Bio" sectionId="bio">
        <p>Contenu bio</p>
      </ProfileSection>,
    );

    expect(screen.getByText('Contenu bio')).toBeVisible();
    await user.click(screen.getByRole('button', { name: /Bio/i }));
    expect(screen.queryByText('Contenu bio')).not.toBeInTheDocument();
    expect(localStorage.getItem(`${STORAGE_PREFIX}bio`)).toBe('0');
  });

  it('restores the collapsed state from localStorage on a fresh mount', async () => {
    localStorage.setItem(`${STORAGE_PREFIX}bio`, '0');
    render(
      <ProfileSection title="Bio" sectionId="bio">
        <p>Contenu bio</p>
      </ProfileSection>,
    );
    expect(screen.queryByText('Contenu bio')).not.toBeInTheDocument();
  });

  it('restores the open state from localStorage when explicitly closed then reopened', async () => {
    const user = userEvent.setup();
    const { unmount } = render(
      <ProfileSection title="Bio" sectionId="bio">
        <p>Contenu bio</p>
      </ProfileSection>,
    );
    // Close it
    await user.click(screen.getByRole('button', { name: /Bio/i }));
    expect(localStorage.getItem(`${STORAGE_PREFIX}bio`)).toBe('0');
    unmount();

    // Re-mount — should still be closed
    render(
      <ProfileSection title="Bio" sectionId="bio">
        <p>Contenu bio</p>
      </ProfileSection>,
    );
    expect(screen.queryByText('Contenu bio')).not.toBeInTheDocument();
  });

  it('uses defaultOpen when no localStorage entry exists (back-compat)', () => {
    render(
      <ProfileSection title="Pratiques" sectionId="pratiques" defaultOpen={false}>
        <p>Contenu</p>
      </ProfileSection>,
    );
    expect(screen.queryByText('Contenu')).not.toBeInTheDocument();
  });

  it('does NOT persist (and does NOT allow collapsing) when complete=true', async () => {
    const user = userEvent.setup();
    render(
      <ProfileSection title="Bio" sectionId="bio" complete>
        <p>Contenu bio</p>
      </ProfileSection>,
    );
    expect(screen.getByText('Contenu bio')).toBeVisible();
    await user.click(screen.getByRole('button', { name: /Bio/i }));
    // Still visible — complete sections are always open
    expect(screen.getByText('Contenu bio')).toBeVisible();
    // And nothing was written to localStorage
    expect(localStorage.getItem(`${STORAGE_PREFIX}bio`)).toBeNull();
  });

  it('ignores stored "0" if the section is complete (always-open wins)', () => {
    localStorage.setItem(`${STORAGE_PREFIX}bio`, '0');
    render(
      <ProfileSection title="Bio" sectionId="bio" complete>
        <p>Contenu bio</p>
      </ProfileSection>,
    );
    expect(screen.getByText('Contenu bio')).toBeVisible();
  });
});
