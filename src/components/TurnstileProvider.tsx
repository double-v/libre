'use client';

import { Turnstile } from '@marsidev/react-turnstile';
import { useLayoutEffect, useState } from 'react';

export interface TurnstileProviderProps {
  siteKey: string;
  onSuccess: (token: string) => void;
  onExpire?: () => void;
  onError?: () => void;
}

/**
 * TurnstileProvider — wrapper interne autour du widget Cloudflare Turnstile.
 *
 * Pourquoi : permettre de mocker Turnstile dans les tests E2E Playwright
 * sans dépendre du service externe Cloudflare (rate-limited en CI runners).
 *
 * En production (window.__TURNSTILE_MOCK__ absent) : rend le widget
 * Cloudflare normalement. Aucun changement de comportement utilisateur.
 *
 * En test (window.__TURNSTILE_MOCK__ true, défini par page.addInitScript
 * côté Playwright) : émet un faux token immédiatement. Aucun appel
 * réseau vers Cloudflare, aucune dépendance au rate limit.
 *
 * Note sécurité : un faux token NE PEUT PAS être validé côté serveur.
 * Mais /lib/turnstile.ts skip la vérification si TURNSTILE_SECRET_KEY
 * n'est pas configuré. Donc en CI (où le secret n'est pas exposé), la
 * combinaison mock client + skip serveur fonctionne sans tricher.
 *
 * ⚠️ Race condition fix : on utilise `useLayoutEffect` (sync avant paint)
 * plutôt que `useEffect` (async après paint) pour émettre le token mock.
 * Sinon, entre le mount et le useEffect, le bouton submit est disabled
 * (pas de token), et un test E2E qui clique trop vite échoue avec
 * "button is disabled". C'est la root cause des runs rouges #14/#19.
 */
function detectMock(): boolean {
  if (typeof window === 'undefined') return false;
  return Boolean(
    (window as unknown as { __TURNSTILE_MOCK__?: boolean }).__TURNSTILE_MOCK__,
  );
}

export default function TurnstileProvider({
  siteKey,
  onSuccess,
  onExpire,
  onError,
}: TurnstileProviderProps) {
  // Use a lazy initializer to read window once at mount. This avoids the
  // setState-in-useEffect lint rule and is semantically correct: the
  // mock flag is a property of the test environment, not external state.
  const [mockActive] = useState<boolean>(detectMock);

  // Mock path: emit a fake token synchronously after the DOM is committed
  // but before the browser paints, so by the time the user (or the E2E
  // test) sees the form, the parent state already has the token and the
  // submit button is enabled.
  //
  // useLayoutEffect runs synchronously after React commits the DOM and
  // before the browser paints. This eliminates the disabled-button race
  // window that useEffect (async, post-paint) would create.
  //
  // We intentionally omit onSuccess from the deps (re-emitting on every
  // callback identity change would be wrong -- this is a one-shot signal,
  // like the real widget). The exhaustive-deps lint rule is wrong here.
  useLayoutEffect(() => {
    if (!mockActive) return;
    onSuccess('mock-turnstile-token');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mockActive]);

  if (mockActive) {
    // Render nothing visible. data-testid lets tests assert the mock is active.
    return <div data-testid="turnstile-mock" aria-hidden="true" />;
  }

  return (
    <Turnstile siteKey={siteKey} onSuccess={onSuccess} onExpire={onExpire} onError={onError} />
  );
}
