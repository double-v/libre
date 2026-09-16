import { signOut } from 'next-auth/react';
import { clearBadge } from '@/lib/app-badge';

/**
 * Déconnexion centralisée (#389/#390, étendue en #392 au désabonnement push).
 *
 * Ce qui doit se faire AVANT la fin de session — retirer le badge d'icône,
 * demain révoquer l'abonnement push (qui exige la session pour le DELETE) —
 * vit ici, une fois, plutôt que dans chaque bouton « Se déconnecter ». Chaque
 * préalable est best-effort : rien ne doit empêcher quelqu'un de se déconnecter.
 * L'appelant garde la main sur la redirection (`redirect: false`).
 */
export async function logout(): Promise<void> {
  try {
    await clearBadge();
  } catch {
    // best-effort
  }
  await signOut({ redirect: false });
}
