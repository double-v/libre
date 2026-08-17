import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { getDb } from '@/lib/db';
import { authOptions } from '@/lib/auth';
import { rateLimit, limits } from '@/lib/rate-limit';
import { escrowDisponible, unwrapPrivateKey } from '@/lib/crypto-escrow';

// ---------------------------------------------------------------------------
// GET /api/users/keys/me — restitution de sa propre clé d'identité (#198).
//
// C'est la route qui rend la messagerie portable : le client ne garde plus rien
// sur le disque, il redemande sa clé à chaque session. Trois réponses possibles,
// et le client se comporte très différemment selon celle qu'il reçoit :
//
//   200 { publicKey, privateKey }      → tout va bien, clé en mémoire
//   200 { publicKey, privateKey: null } → coffre vide : migration douce (#336)
//   404                                 → aucune clé : le SEUL cas où le client
//                                         a le droit d'en générer une
//
// Confondre les deux derniers cas ferait régénérer une paire à un compte qui en
// a déjà une — c'est-à-dire détruire son historique. D'où les 500/503 explicites
// plutôt qu'un repli silencieux sur « pas de clé ».
// ---------------------------------------------------------------------------
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const rl = await rateLimit(`api:${session.user.id}`, limits.api.limit, limits.api.windowMs);
    if (!rl.success) {
      return NextResponse.json({ error: 'rate_limited' }, { status: 429 });
    }

    const cle = await getDb().userKey.findUnique({
      where: { userId: session.user.id },
      select: { publicKey: true, encryptedPrivateKey: true },
    });

    if (!cle) {
      return NextResponse.json({ error: 'no_key' }, { status: 404 });
    }

    if (!cle.encryptedPrivateKey) {
      return sansCache({ publicKey: cle.publicKey, privateKey: null });
    }

    if (!escrowDisponible()) {
      // Le coffre existe mais on n'a pas de quoi l'ouvrir : c'est une panne de
      // configuration, pas un compte sans clé. Le dire évite que le client
      // « débloque » la situation en régénérant une paire.
      return NextResponse.json({ error: 'escrow_indisponible' }, { status: 503 });
    }

    let privateKey: string;
    try {
      privateKey = unwrapPrivateKey(cle.encryptedPrivateKey, session.user.id);
    } catch (error) {
      console.error('Escrow illisible pour un compte:', error);
      return NextResponse.json({ error: 'escrow_illisible' }, { status: 500 });
    }

    return sansCache({ publicKey: cle.publicKey, privateKey });
  } catch (error) {
    console.error('User key retrieval error:', error);
    return NextResponse.json(
      { error: 'Une erreur est survenue, veuillez réessayer' },
      { status: 500 },
    );
  }
}

/** La clé privée ne doit se poser dans aucun cache, intermédiaire ou navigateur. */
function sansCache(payload: { publicKey: string; privateKey: string | null }) {
  return NextResponse.json(payload, {
    status: 200,
    headers: { 'Cache-Control': 'no-store, no-cache, must-revalidate, private' },
  });
}
