'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { subscribeUserChannel } from '@/lib/pusher-client';
import { clearBadge, setBadge } from '@/lib/app-badge';

/**
 * useUnread — présence de messages non lus, partagée par toute l'app connectée (#389).
 *
 * La base est la source de vérité (`GET /api/chat/unread`, dérivé de `readAt`) ;
 * le temps réel ne fait que déclencher un rechargement. Trois signaux de resync :
 * - `new-message` sur le canal utilisateur (émis par `POST messages` vers le
 *   destinataire, `{ conversationId }` seul) ;
 * - le retour au premier plan (un onglet en veille rate des événements) ;
 * - `libre:unread-changed`, émis par la page de conversation après son
 *   marquage lu — même motif d'événement DOM que `open-feedback` et
 *   `libre:instant-match`, pour ne pas coupler la page au hook.
 *
 * On expose des identifiants et un booléen, jamais un compte : la charte
 * interdit tout nombre de non-lus côté membre (spec 003, FR-006).
 *
 * Le badge d'icône de l'app installée (#390) suit le même booléen : posé
 * quand des non-lus apparaissent, retiré quand tout est lu. Il vit ici et non
 * dans un composant parce qu'il doit refléter l'état même sur un écran qui ne
 * montre aucune pastille (Découvrir, La Place). À la déconnexion, c'est
 * `logout()` qui le retire, avant la fin de session.
 *
 * Hors provider (landing, admin, tests), le hook rend un état vide : `SiteNav`
 * y est monté aussi et ne doit ni fetcher ni s'abonner.
 */

/** Événement DOM à émettre quand des messages viennent d'être marqués lus. */
export const UNREAD_CHANGED_EVENT = 'libre:unread-changed';

interface UnreadState {
  conversationIds: readonly string[];
  hasUnread: boolean;
  isUnread: (conversationId: string) => boolean;
  refresh: () => void;
}

const EMPTY: UnreadState = {
  conversationIds: [],
  hasUnread: false,
  isUnread: () => false,
  refresh: () => {},
};

const UnreadContext = createContext<UnreadState | null>(null);

export function UnreadProvider({ userId, children }: { userId?: string; children: ReactNode }) {
  // `null` tant que la base n'a pas répondu : on ne sait rien, on ne touche
  // pas au badge — un `[]` initial le retirerait à chaque montage.
  const [ids, setIds] = useState<readonly string[] | null>(null);
  const inFlight = useRef(false);

  const refresh = useCallback(() => {
    if (!userId || inFlight.current) return;
    inFlight.current = true;
    fetch('/api/chat/unread', { cache: 'no-store' })
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (d && Array.isArray(d.conversationIds)) setIds(d.conversationIds);
      })
      .catch(() => {
        // Réseau : on garde l'état précédent, la prochaine resync corrigera.
      })
      .finally(() => {
        inFlight.current = false;
      });
  }, [userId]);

  // Chargement initial + resync sur retour au premier plan et marquage lu.
  useEffect(() => {
    if (!userId) return;
    refresh();
    const onVisible = () => {
      if (document.visibilityState === 'visible') refresh();
    };
    document.addEventListener('visibilitychange', onVisible);
    window.addEventListener(UNREAD_CHANGED_EVENT, refresh);
    return () => {
      document.removeEventListener('visibilitychange', onVisible);
      window.removeEventListener(UNREAD_CHANGED_EVENT, refresh);
    };
  }, [userId, refresh]);

  // Temps réel : un message pour moi → recharger (pas de mutation locale, la
  // base tranche — un message d'une personne bloquée, par exemple, n'y sera pas).
  useEffect(() => {
    if (!userId) return;
    const handle = subscribeUserChannel(userId);
    if (!handle) return;
    const onNewMessage = () => refresh();
    handle.channel.bind('new-message', onNewMessage);
    return () => {
      handle.channel.unbind('new-message', onNewMessage);
      handle.release();
    };
  }, [userId, refresh]);

  // Badge d'icône : dépend de la présence seule, pas de la liste — deux
  // resyncs qui confirment le même état ne rappellent pas l'API Badging.
  const loaded = ids !== null;
  const hasUnread = loaded && ids.length > 0;
  useEffect(() => {
    if (!userId || !loaded) return;
    void (hasUnread ? setBadge() : clearBadge());
  }, [userId, loaded, hasUnread]);

  const value = useMemo<UnreadState>(() => {
    // Sans session (déconnexion dans le même arbre), l'état est vide quoi
    // qu'ait chargé la session précédente — dérivé, pas remis à zéro par effet.
    const current = userId && ids ? ids : [];
    const set = new Set(current);
    return {
      conversationIds: current,
      hasUnread: current.length > 0,
      isUnread: (id) => set.has(id),
      refresh,
    };
  }, [userId, ids, refresh]);

  return <UnreadContext.Provider value={value}>{children}</UnreadContext.Provider>;
}

export function useUnread(): UnreadState {
  return useContext(UnreadContext) ?? EMPTY;
}
