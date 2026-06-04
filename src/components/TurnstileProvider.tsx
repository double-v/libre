'use client';

import { Turnstile } from '@marsidev/react-turnstile';
import { useEffect, useState } from 'react';

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

  // Mock path: emit a fake token once the component is mounted, so the
  // parent's onSuccess handler is fully wired up. We intentionally omit
  // onSuccess from the deps (re-emitting on every callback identity change
  // would be wrong -- this is a one-shot signal, like the real widget).
  useEffect(() => {
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
