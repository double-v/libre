'use client';

import { useState } from 'react';

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
      await onSend(JSON.stringify({ type: 'share-contact', data: 'Contact info shared' }));
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
      className="text-sm font-medium text-indigo-600 underline decoration-indigo-600 hover:text-indigo-700 disabled:text-gray-400 disabled:no-underline dark:text-indigo-400 dark:decoration-indigo-400 dark:hover:text-indigo-300 dark:disabled:text-gray-500"
    >
      {shared ? 'Contacts partages' : sending ? 'Envoi...' : 'On echange nos reseaux ?'}
    </button>
  );
}