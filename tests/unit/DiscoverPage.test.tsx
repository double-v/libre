import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, expect, it, beforeEach, vi } from 'vitest';
import DiscoverPage from '@/app/(main)/discover/page';

// Stubs légers : on isole la logique de fetch du feed de DiscoverPage des
// effets propres des composants enfants (géoloc, fetch de CrossingsView, …).
vi.mock('@/components/ProfileCard', () => ({ default: () => <div data-testid="profile-card" /> }));
vi.mock('@/components/ProfileModal', () => ({ default: () => null }));
vi.mock('@/components/DiscoverFilters', () => ({ default: () => <div /> }));
vi.mock('@/components/EmptyStateCards', () => ({
  default: () => <div data-testid="empty-state" />,
}));
vi.mock('@/components/CrossingsView', () => ({ default: () => <div data-testid="crossings" /> }));
vi.mock('@/components/ui/Button', () => ({
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  default: ({ children, ...props }: any) => <button {...props}>{children}</button>,
}));

function jsonResponse(body: unknown): Response {
  return { ok: true, status: 200, json: async () => body } as Response;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const discoverCalls = (): any[][] =>
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (global.fetch as any).mock.calls.filter((c: any[]) => String(c[0]).startsWith('/api/discover'));

beforeEach(() => {
  global.fetch = vi.fn((url: string | URL | Request) => {
    const u = String(url);
    if (u.startsWith('/api/discover')) {
      return Promise.resolve(jsonResponse({ users: [], nextCursor: null, reason: null }));
    }
    if (u.startsWith('/api/users/profile')) {
      return Promise.resolve(jsonResponse({ profile: { maxDistanceKm: 50 } }));
    }
    return Promise.resolve(jsonResponse({}));
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  }) as any;
});

describe('DiscoverPage — feed fetch (régression #179)', () => {
  it('fetche le feed une seule fois au montage, pas de double-fetch en cascade', async () => {
    render(<DiscoverPage />);
    // L'empty-state ne s'affiche qu'une fois le fetch de montage résolu.
    await screen.findByTestId('empty-state');
    expect(discoverCalls()).toHaveLength(1);
    expect(String(discoverCalls()[0][0])).toContain('tab=all');
  });

  it('refetche avec tab=nearby au passage sur « À proximité »', async () => {
    render(<DiscoverPage />);
    await waitFor(() => expect(discoverCalls()).toHaveLength(1));

    fireEvent.click(screen.getByRole('tab', { name: 'À proximité' }));

    await waitFor(() =>
      expect(discoverCalls().some((c) => String(c[0]).includes('tab=nearby'))).toBe(true),
    );
  });
});
