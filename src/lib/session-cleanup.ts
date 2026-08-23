/**
 * Ce qu'on efface de l'appareil en quittant la session (#198).
 *
 * L'escrow met la clé privée à l'abri côté serveur et la garde en mémoire de
 * session côté client. Mais la page de conversation range aussi les messages
 * **déchiffrés** dans le `localStorage` (`libre_chat_cache_<id>`) pour éviter de
 * tout re-déchiffrer à chaque ouverture. Retirer la serrure en laissant la porte
 * ouverte n'aurait aucun sens : sur un appareil partagé, ce cache rend les
 * conversations lisibles à qui ouvre le navigateur après la déconnexion.
 *
 * Les clés d'identité héritées (`libre_private_key` & co) ne sont PAS effacées
 * ici : sur un compte antérieur à l'escrow, ce sont peut-être les seules copies
 * existantes. Elles sont retirées par `useEncryptedChat`, au moment précis où le
 * serveur prouve qu'il en détient une — c'est-à-dire quand leur perte devient
 * sans conséquence.
 */

const PREFIXE_CACHE_CLAIR = 'libre_chat_cache_';

/** Efface les messages en clair mis en cache sur cet appareil. */
export function purgerSecretsLocaux(): void {
  try {
    const aRetirer: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const cle = localStorage.key(i);
      if (cle?.startsWith(PREFIXE_CACHE_CLAIR)) aRetirer.push(cle);
    }
    aRetirer.forEach((cle) => localStorage.removeItem(cle));
  } catch {
    // Stockage indisponible (mode privé strict, quota) : rien à purger.
  }
}
