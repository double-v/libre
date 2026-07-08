/**
 * Toast — feedback fugace pour confirmer une action (signalement pris en compte,
 * check-in validé, sauvegarde…). Volontairement discret : c'est une confirmation
 * humaine, pas une mécanique d'engagement (cf. PRODUCT.md, principe 4 « subtilité
 * des récompenses » — pas de compteur, pas de son, pas d'appât).
 *
 * Pattern event-bus, comme `libre:instant-match` : `toast(...)` émet un
 * CustomEvent que <ToastHost /> (monté une fois dans le layout) écoute et rend.
 * Découplé → n'importe quel composant peut l'appeler sans prop-drilling.
 */
export type ToastTone = 'success' | 'info' | 'error';

export interface ToastOptions {
  tone?: ToastTone;
  /** Emoji décoratif optionnel (aria-hidden). Absent par défaut pour rester sobre. */
  icon?: string;
  /** Durée d'affichage en ms avant auto-dismiss. */
  duration?: number;
}

export interface ToastPayload {
  id: string;
  message: string;
  tone: ToastTone;
  icon?: string;
  duration: number;
}

export const TOAST_EVENT = 'libre:toast';
export const DEFAULT_TOAST_DURATION = 3500;

/**
 * Émet un toast. No-op côté serveur (SSR-safe).
 */
export function toast(message: string, options: ToastOptions = {}): void {
  if (typeof window === 'undefined') return;
  const payload: ToastPayload = {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    message,
    tone: options.tone ?? 'success',
    icon: options.icon,
    duration: options.duration ?? DEFAULT_TOAST_DURATION,
  };
  window.dispatchEvent(new CustomEvent<ToastPayload>(TOAST_EVENT, { detail: payload }));
}
