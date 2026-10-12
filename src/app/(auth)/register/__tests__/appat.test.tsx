/**
 * Tests — l'appât du formulaire d'inscription (#515).
 *
 * Le champ doit être là pour un robot (dans le DOM), pas pour une personne :
 * hors de l'arbre d'accessibilité, jamais au chemin de tabulation, sans
 * autocomplétion. Le membre honnête envoie un temps plausible et un
 * champ-appât vide, toujours.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';

vi.mock('next/navigation', () => ({ useRouter: () => ({ push: vi.fn(), replace: vi.fn() }) }));
vi.mock('next-auth/react', () => ({ useSession: () => ({ status: 'unauthenticated', data: null }) }));
vi.mock('@/components/TurnstileProvider', () => ({ __esModule: true, default: () => null }));

import RegisterPage from '../page';

const fetchMock = vi.fn().mockResolvedValue({ ok: true, json: async () => ({}) });
beforeEach(() => {
  vi.stubGlobal('fetch', fetchMock);
});
afterEach(() => {
  vi.unstubAllGlobals();
  vi.clearAllMocks();
});

describe('inscription — appât anti-robot (#515)', () => {
  it('est dans le DOM, mais hors de l’arbre d’accessibilité et du clavier', () => {
    render(<RegisterPage />);
    const appatInput = document.querySelector<HTMLInputElement>('input[name="fax"]');
    expect(appatInput).not.toBeNull();
    expect(appatInput!.closest('div')).toHaveAttribute('aria-hidden', 'true');
    expect(appatInput).toHaveAttribute('tabindex', '-1');
    expect(appatInput).toHaveAttribute('autocomplete', 'off');
    expect(appatInput!.type).toBe('text');
  });

  it('un membre honnête l’envoie vide, avec un temps plausible', async () => {
    render(<RegisterPage />);
    const form = screen.getByRole('form', { name: /Formulaire d.inscription/ });
    fireEvent.submit(form);
    await vi.waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));
    const body = JSON.parse(fetchMock.mock.calls[0][1]?.body as string);
    // Champ-appât vide : c'est la signature d'une personne réelle.
    expect(body.fax).toBeUndefined();
    expect(typeof body.tms).toBe('number');
  });
});