'use client';

import { useState } from 'react';
import { buildShareContactMessage } from '@/lib/shareContact';

interface ShareContactButtonProps {
  conversationId: string;
  onSend: (content: string) => Promise<void>;
  /**
   * `menu` : rendu comme élément d'un `ActionMenu` (#417) — même libellé,
   * `role="menuitem"`, pleine largeur, cible 44 px. `lien` par défaut.
   */
  presentation?: 'lien' | 'menu';
  /** Appelé après le clic, pour qu'un menu se referme. */
  onDone?: () => void;
}

const MENU_ITEM =
  'flex min-h-[44px] w-full items-center rounded-control px-3 text-left text-sm font-medium text-content hover:bg-fill-subtle focus-visible:outline-none focus-visible:shadow-focus disabled:text-muted disabled:hover:bg-transparent';

export default function ShareContactButton({
  conversationId,
  onSend,
  presentation = 'lien',
  onDone,
}: ShareContactButtonProps) {
  const [shared, setShared] = useState(false);
  const [sending, setSending] = useState(false);

  const handleShare = async () => {
    if (shared || sending) return;
    setSending(true);
    try {
      await onSend(buildShareContactMessage());
      setShared(true);
    } catch {
      // Silently fail - the user can retry
    } finally {
      setSending(false);
      onDone?.();
    }
  };

  const libelle = shared ? 'Contacts partagés' : sending ? 'Envoi…' : 'On échange nos réseaux ?';

  if (presentation === 'menu') {
    return (
      <button type="button" role="menuitem" onClick={handleShare} disabled={shared || sending} className={MENU_ITEM}>
        {libelle}
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={handleShare}
      disabled={shared || sending}
      aria-label={shared ? 'Contacts partagés' : sending ? 'Envoi en cours' : 'Échanger nos réseaux'}
      className="text-sm font-medium text-coral underline decoration-coral hover:text-terracotta disabled:text-muted disabled:no-underline dark:text-coral-light dark:decoration-coral-light dark:hover:text-coral dark:disabled:text-muted"
    >
      {libelle}
    </button>
  );
}