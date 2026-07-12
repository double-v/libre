'use client';

import { useState } from 'react';
import { buildShareContactMessage } from '@/lib/shareContact';

interface ShareContactButtonProps {
  conversationId: string;
  onSend: (content: string) => Promise<void>;
}

export default function ShareContactButton({ conversationId, onSend }: ShareContactButtonProps) {
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
    }
  };

  return (
    <button
      onClick={handleShare}
      disabled={shared || sending}
      aria-label={shared ? 'Contacts partages' : sending ? 'Envoi en cours' : 'Echanger nos reseaux'}
      className="text-sm font-medium text-coral underline decoration-coral hover:text-terracotta disabled:text-muted disabled:no-underline dark:text-coral-light dark:decoration-coral-light dark:hover:text-coral dark:disabled:text-muted"
    >
      {shared ? 'Contacts partages' : sending ? 'Envoi...' : 'On echange nos reseaux ?'}
    </button>
  );
}