import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { getDb } from '@/lib/db';
import { authOptions } from '@/lib/auth';
import { rateLimit, limits } from '@/lib/rate-limit';
import {
  escrowDisponible,
  wrapPrivateKey,
  publiqueCorrespondALaPrivee,
  publiqueP256Valide,
} from '@/lib/crypto-escrow';

/**
 * Réinitialisation volontaire de la clé de messagerie (#340).
 *
 * `POST /api/users/keys` refuse d'écraser une clé connue, et c'est le bon
 * défaut : l'écrasement silencieux a détruit des historiques. Mais une personne
 * dont la clé a disparu avec son appareil (compte d'avant le coffre, jamais
 * rattrapé par #336) n'a aujourd'hui aucune porte : elle reçoit des messages
 * qu'elle ne lira jamais, et ce qu'elle écrit part en clair.
 *
 * Ce chemin est donc explicite et distinct — l'interface le présente avec ses
 * conséquences. Deux règles le rendent moins violent que l'écrasement d'origine :
 * la nouvelle privée est scellée dans le même geste (jamais de clé publique
 * orpheline), et l'ancienne publique est archivée pour que le pair relise ce
 * qu'il avait chiffré pour elle. Ce qui est perdu l'était déjà.
 */
export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const rl = await rateLimit(`api:${session.user.id}`, limits.api.limit, limits.api.windowMs);
    if (!rl.success) {
      return NextResponse.json({ error: 'rate_limited' }, { status: 429 });
    }

    const body = await request.json();
    const { publicKey, privateKey } = body;

    if (typeof publicKey !== 'string' || !publicKey || typeof privateKey !== 'string' || !privateKey) {
      // Sans privée à sceller, remplacer la publique recréerait exactement le
      // défaut d'origine : une clé qui ne survit pas à l'onglet.
      return NextResponse.json(
        { error: 'Validation failed', details: { privateKey: ['Required'] } },
        { status: 400 },
      );
    }

    if (!(await publiqueP256Valide(publicKey))) {
      return NextResponse.json(
        { error: 'Invalid public key: must be a valid SPKI ECDH P-256 key' },
        { status: 400 },
      );
    }

    if (!publiqueCorrespondALaPrivee(publicKey, privateKey)) {
      return NextResponse.json({ error: 'cle_non_appariee' }, { status: 400 });
    }

    if (!escrowDisponible()) {
      return NextResponse.json({ error: 'escrow_indisponible' }, { status: 503 });
    }

    const userId = session.user.id;
    const encryptedPrivateKey = wrapPrivateKey(privateKey, userId);
    const maintenant = new Date();

    await getDb().$transaction(async (tx) => {
      const ancienne = await tx.userKey.findUnique({
        where: { userId },
        select: { publicKey: true, keyCreatedAt: true },
      });
      if (ancienne && ancienne.publicKey !== publicKey) {
        await tx.userKeyHistory.create({
          data: {
            userId,
            publicKey: ancienne.publicKey,
            createdAt: ancienne.keyCreatedAt,
            replacedAt: maintenant,
          },
        });
      }
      const cle = { publicKey, keyCreatedAt: maintenant, encryptedPrivateKey, escrowedAt: maintenant };
      await tx.userKey.upsert({
        where: { userId },
        update: cle,
        create: { userId, ...cle },
      });
    });

    // Trace agrégée, sans identifiant : savoir combien de comptes passent par
    // là dit si la migration douce a laissé du monde au bord du chemin.
    console.info('escrow.reinitialisation', 'effectuee');

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    console.error('User key reset error:', error);
    return NextResponse.json(
      { error: 'Une erreur est survenue, veuillez réessayer' },
      { status: 500 },
    );
  }
}
