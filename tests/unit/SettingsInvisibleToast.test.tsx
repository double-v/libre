import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { TOAST_EVENT, type ToastPayload } from '@/lib/toast';

vi.mock('next/navigation', () => ({ useRouter: () => ({ push: vi.fn() }) }));
vi.mock('next-auth/react', () => ({ signOut: vi.fn() }));

import SettingsPage from '@/app/(main)/settings/page';

function jsonResponse(body: unknown, ok = true, status = 200): Response {
  return { ok, status, json: async () => body } as Response;
}

describe('SettingsPage — toast de confirmation mode invisible (#139)', () => {
  let events: ToastPayload[];
  const onToast = (e: Event) => events.push((e as CustomEvent<ToastPayload>).detail);

  beforeEach(() => {
    events = [];
    window.addEventListener(TOAST_EVENT, onToast);
    global.fetch = vi.fn((_url: string | URL | Request, init?: RequestInit) => {
      const method = init?.method ?? 'GET';
      if (method === 'GET') {
        return Promise.resolve(
          jsonResponse({ profile: { userId: 'u1', invisibleMode: false }, isVerified: true }),
        );
      }
      return Promise.resolve(jsonResponse({ profile: { userId: 'u1', invisibleMode: true } }));
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    }) as any;
  });

  afterEach(() => {
    window.removeEventListener(TOAST_EVENT, onToast);
    vi.restoreAllMocks();
  });

  it('émet un toast rassurant quand on active le mode invisible', async () => {
    render(<SettingsPage />);
    const toggle = await screen.findByRole('switch');
    expect(toggle).toHaveAttribute('aria-checked', 'false');

    fireEvent.click(toggle);

    await waitFor(() => expect(events).toHaveLength(1));
    expect(events[0].message).toBe('Tu es maintenant invisible.');
  });
});
