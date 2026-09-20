import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin, isAdminSession } from '@/lib/admin';
import { getDb } from '@/lib/db';
import { diagnostiquerCle } from '@/lib/cle-diagnostic';

/**
 * État de la clé de messagerie d'un compte, pour le support (#341).
 *
 * Route dédiée plutôt qu'un champ de la fiche : la consultation est un acte
 * de modération, journalisé comme tel — et elle ne se fait pas en passant.
 * On n'expose que des dates, des booléens et un compte : jamais la clé
 * publique, jamais l'enveloppe. Rien ici n'ouvre un message.
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const adminResult = await requireAdmin();
  if (!isAdminSession(adminResult)) return adminResult;
  const { id } = await params;

  const db = getDb();
  const [cle, historique] = await Promise.all([
    db.userKey.findUnique({
      where: { userId: id },
      select: { keyCreatedAt: true, escrowedAt: true, encryptedPrivateKey: true },
    }),
    db.userKeyHistory.aggregate({
      where: { userId: id },
      _count: { _all: true },
      _max: { replacedAt: true },
    }),
  ]);

  await db.moderationLog.create({
    data: { adminId: adminResult.userId, targetUserId: id, action: 'VIEW_KEY_STATE' },
  });

  const coffreGarni = Boolean(cle?.encryptedPrivateKey);
  return NextResponse.json({
    diagnostic: diagnostiquerCle({ clePresente: cle !== null, coffreGarni }),
    keyCreatedAt: cle?.keyCreatedAt ?? null,
    coffreGarni,
    escrowedAt: cle?.escrowedAt ?? null,
    reinitialisations: historique._count._all,
    derniereReinitialisation: historique._max.replacedAt ?? null,
  });
}
