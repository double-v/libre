/**
 * Purge les secrets de messagerie du navigateur.
 *
 * Appelée à la déconnexion pour garantir que la clé privée et le cache clair
 * des messages ne subsistent pas sur l'appareil quitté (#368).
 */
export function clearChatSecrets(): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.removeItem('libre_private_key');
    localStorage.removeItem('libre_public_key');
    localStorage.removeItem('libre_device_key');

    // Supprime tous les caches de conversation en clair (libre_chat_cache_<uuid>).
    for (let i = localStorage.length - 1; i >= 0; i--) {
      const key = localStorage.key(i);
      if (key?.startsWith('libre_chat_cache_')) {
        localStorage.removeItem(key);
      }
    }
  } catch {
    // localStorage inaccessible (navigation privée bloquée, etc.) : on ignore.
  }
}
