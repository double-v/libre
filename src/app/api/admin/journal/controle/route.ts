import { NextResponse } from 'next/server';
import { requireAdmin, isAdminSession } from '@/lib/admin';
import { controler } from '@/lib/journal/garde-fous';
import { lireJson, validerContenu } from '@/lib/journal/serveur';

/**
 * Contrôle éditorial d'un texte, sans rien écrire (spec 007, US3). L'écran
 * s'en sert pour afficher les alertes ; le verdict qui compte est celui que
 * `publier` recalcule.
 */
export async function POST(request: Request) {
  const adminResult = await requireAdmin();
  if (!isAdminSession(adminResult)) return adminResult;
  const contenu = validerContenu(await lireJson(request));
  if (contenu instanceof NextResponse) return contenu;
  return NextResponse.json({ alertes: controler(contenu.titre, contenu.corps) }, { status: 200 });
}
