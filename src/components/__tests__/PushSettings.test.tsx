/**
 * Tests — PushSettings (#392, spec 003 R12, T061).
 *
 * Quatre états, quatre textes (contracts/events.md, FR-024/FR-026), et une
 * règle de conduite : rien n'est demandé au montage (FR-015) — la permission
 * ne se sollicite que sur le clic. Le switch reprend le motif « Mode
 * invisible » (`role="switch"`, `aria-checked`) ; il est désactivé tant que
 * l'état n'est pas connu ou que l'appareil ne peut pas s'abonner.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';

const mockGetPushState = vi.fn();
const mockEnablePush = vi.fn();
const mockDisablePush = vi.fn();
vi.mock('@/lib/push/client', () => ({
  __esModule: true,
  getPushState: () => mockGetPushState(),
  enablePush: () => mockEnablePush(),
  disablePush: () => mockDisablePush(),
}));

const { default: PushSettings } = await import('../PushSettings');

beforeEach(() => {
  vi.clearAllMocks();
  mockGetPushState.mockResolvedValue('off');
  mockEnablePush.mockResolvedValue('on');
  mockDisablePush.mockResolvedValue('off');
  (window as unknown as { Notification: unknown }).Notification = { permission: 'default', requestPermission: vi.fn() };
});

const sw = () => screen.getByRole('switch', { name: /Me prévenir hors de l’app/ });

describe('<PushSettings />', () => {
  it('ne demande rien au montage : lit l’état, switch éteint par défaut', async () => {
    render(<PushSettings />);
    await waitFor(() => expect(sw()).toBeEnabled());
    expect(sw()).toHaveAttribute('aria-checked', 'false');
    expect(mockGetPushState).toHaveBeenCalledTimes(1);
    expect(mockEnablePush).not.toHaveBeenCalled();
    expect((window as unknown as { Notification: { requestPermission: ReturnType<typeof vi.fn> } }).Notification.requestPermission).not.toHaveBeenCalled();
  });

  it('non supporté : texte dédié, switch désactivé', async () => {
    mockGetPushState.mockResolvedValue('unsupported');
    render(<PushSettings />);
    expect(await screen.findByText('Ton navigateur ne permet pas les notifications.')).toBeInTheDocument();
    expect(sw()).toBeDisabled();
  });

  it('iOS non installée : explique le geste, switch désactivé', async () => {
    mockGetPushState.mockResolvedValue('ios-not-installed');
    render(<PushSettings />);
    expect(await screen.findByText(/ajoute d’abord Libre à ton écran d’accueil/)).toBeInTheDocument();
    expect(sw()).toBeDisabled();
  });

  it('refusé : dit où débloquer, switch désactivé', async () => {
    mockGetPushState.mockResolvedValue('denied');
    render(<PushSettings />);
    expect(await screen.findByText('Les notifications sont bloquées dans les réglages de ton appareil pour Libre.')).toBeInTheDocument();
    expect(sw()).toBeDisabled();
  });

  it('actif : confirme ce qui préviendra, switch allumé', async () => {
    mockGetPushState.mockResolvedValue('on');
    render(<PushSettings />);
    expect(await screen.findByText('Tu seras prévenu·e ici en cas de nouveau message ou de nouveau match.')).toBeInTheDocument();
    expect(sw()).toHaveAttribute('aria-checked', 'true');
  });

  it('clic éteint → enablePush, puis reflète l’état renvoyé', async () => {
    render(<PushSettings />);
    await waitFor(() => expect(sw()).toBeEnabled());
    fireEvent.click(sw());
    await waitFor(() => expect(mockEnablePush).toHaveBeenCalledTimes(1));
    await waitFor(() => expect(sw()).toHaveAttribute('aria-checked', 'true'));
    expect(mockDisablePush).not.toHaveBeenCalled();
  });

  it('clic allumé → disablePush', async () => {
    mockGetPushState.mockResolvedValue('on');
    render(<PushSettings />);
    await waitFor(() => expect(sw()).toHaveAttribute('aria-checked', 'true'));
    fireEvent.click(sw());
    await waitFor(() => expect(mockDisablePush).toHaveBeenCalledTimes(1));
    await waitFor(() => expect(sw()).toHaveAttribute('aria-checked', 'false'));
  });

  it('un refus au clic passe en « refusé » sans casser', async () => {
    mockEnablePush.mockResolvedValue('denied');
    render(<PushSettings />);
    await waitFor(() => expect(sw()).toBeEnabled());
    fireEvent.click(sw());
    expect(await screen.findByText(/bloquées dans les réglages/)).toBeInTheDocument();
    expect(sw()).toBeDisabled();
  });
});
