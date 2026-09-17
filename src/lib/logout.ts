import { signOut } from 'next-auth/react';
import { clearBadge } from '@/lib/app-badge';
import { disablePush } from '@/lib/push/client';

/**
 * Déconnexion centralisée (#389/#390, étendue en #392 au désabonnement push).
 *
 * Ce qui doit se faire AVANT la fin de session — retirer le badge d'icône,
 * demain révoquer l'abonnement push (qui exige la session pour le DELETE) —
 * vit ici, une fois, plutôt que dans chaque bouton « Se déconnecter ». Chaque
 * préalable est best-effort : rien ne doit empêcher quelqu'un de se déconnecter.
 * L'appelant garde la main sur la redirection (`redirect: false`) — et elle
 * doit avoir lieu même si `signOut` échoue (réseau) : les secrets locaux sont
 * déjà purgés, rester sur la page serait pire que d'arriver sur /login.
 */
export async function logout(): Promise<void> {
  try {
    await clearBadge();
  } catch {
    // best-effort
  }
  // #392 (R13) : l'abonnement push est celui de l'appareil, pas du compte —
  // un autre compte sur ce navigateur ne doit pas recevoir les notifications
  // du précédent. Le DELETE serveur exige la session : d'où AVANT signOut.
  try {
    await disablePush();
  } catch {
    // best-effort
  }
  try {
    await signOut({ redirect: false });
  } catch (err) {
    console.error('[logout] signOut a échoué, on redirige quand même :', err);
  }
}
