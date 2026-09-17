'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { subscribeUserChannel } from '@/lib/pusher-client';

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

export function UnreadProvider({ userId, children }: { userId: string; children: ReactNode }) {
  const [ids, setIds] = useState<readonly string[]>([]);
  const inFlight = useRef(false);

  const refresh = useCallback(() => {
    if (inFlight.current) return;
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
  }, []);

  // Chargement initial + resync sur retour au premier plan et marquage lu.
  useEffect(() => {
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
  }, [refresh]);

  // Temps réel : un message pour moi → recharger (pas de mutation locale, la
  // base tranche — un message d'une personne bloquée, par exemple, n'y sera pas).
  useEffect(() => {
    const handle = subscribeUserChannel(userId);
    if (!handle) return;
    const onNewMessage = () => refresh();
    handle.channel.bind('new-message', onNewMessage);
    return () => {
      handle.channel.unbind('new-message', onNewMessage);
      handle.release();
    };
  }, [userId, refresh]);

  const value = useMemo<UnreadState>(() => {
    const set = new Set(ids);
    return {
      conversationIds: ids,
      hasUnread: ids.length > 0,
      isUnread: (id) => set.has(id),
      refresh,
    };
  }, [ids, refresh]);

  return <UnreadContext.Provider value={value}>{children}</UnreadContext.Provider>;
}

export function useUnread(): UnreadState {
  return useContext(UnreadContext) ?? EMPTY;
}
