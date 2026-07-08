import { render, screen, fireEvent, act } from '@testing-library/react';
import { describe, it, expect, afterEach, vi } from 'vitest';
import ToastHost from '@/components/ui/Toast';
import { toast, TOAST_EVENT, type ToastPayload } from '@/lib/toast';

describe('toast() (lib)', () => {
  it('émet un CustomEvent libre:toast avec les valeurs par défaut', () => {
    const spy = vi.fn();
    window.addEventListener(TOAST_EVENT, spy);
    toast('Coucou');
    expect(spy).toHaveBeenCalledTimes(1);
    const detail = (spy.mock.calls[0][0] as CustomEvent<ToastPayload>).detail;
    expect(detail.message).toBe('Coucou');
    expect(detail.tone).toBe('success');
    expect(detail.duration).toBeGreaterThan(0);
    expect(detail.id).toBeTruthy();
    window.removeEventListener(TOAST_EVENT, spy);
  });

  it('respecte le tone et l\'icône passés', () => {
    const spy = vi.fn();
    window.addEventListener(TOAST_EVENT, spy);
    toast('Oups', { tone: 'error', icon: '⚠' });
    const detail = (spy.mock.calls[0][0] as CustomEvent<ToastPayload>).detail;
    expect(detail.tone).toBe('error');
    expect(detail.icon).toBe('⚠');
    window.removeEventListener(TOAST_EVENT, spy);
  });
});

describe('ToastHost', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it('garde la région live montée mais vide tant qu\'aucun toast n\'est émis', () => {
    render(<ToastHost />);
    const region = screen.getByRole('status');
    expect(region).toBeEmptyDOMElement();
  });

  it('affiche le message et un conteneur aria-live poli', () => {
    render(<ToastHost />);
    act(() => {
      toast('Merci, c\'est signalé.');
    });
    const region = screen.getByRole('status');
    expect(region).toHaveAttribute('aria-live', 'polite');
    expect(screen.getByText('Merci, c\'est signalé.')).toBeInTheDocument();
  });

  it('se ferme via le bouton Fermer (cible 44px, aria-label)', () => {
    render(<ToastHost />);
    act(() => {
      toast('À fermer');
    });
    const close = screen.getByLabelText('Fermer');
    expect(close.className).toMatch(/h-11 w-11/);
    fireEvent.click(close);
    expect(screen.queryByText('À fermer')).toBeNull();
  });

  it('auto-dismiss après la durée indiquée', () => {
    vi.useFakeTimers();
    render(<ToastHost />);
    act(() => {
      toast('Éphémère', { duration: 1000 });
    });
    expect(screen.getByText('Éphémère')).toBeInTheDocument();
    act(() => {
      vi.advanceTimersByTime(1000);
    });
    expect(screen.queryByText('Éphémère')).toBeNull();
  });

  it('ne garde que les 3 toasts les plus récents', () => {
    render(<ToastHost />);
    act(() => {
      toast('un');
      toast('deux');
      toast('trois');
      toast('quatre');
    });
    expect(screen.queryByText('un')).toBeNull();
    expect(screen.getByText('deux')).toBeInTheDocument();
    expect(screen.getByText('trois')).toBeInTheDocument();
    expect(screen.getByText('quatre')).toBeInTheDocument();
  });
});
