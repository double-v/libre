import { getDb } from '@/lib/db';
import { masquerEmail } from '@/lib/masquer-email';
import { photoUrl } from '@/lib/photos';
import { niveauFiabilite, signauxRecents } from './fiabilite';
import { construireGrappes, SORTE_PAR_SIGNAL, type CompteIndice, type Grappe, type Lien } from './grappes';

/** Au-delà, la page n'est plus une file : on verra ce jour-là. */
const MAX_COMPTES = 500;
const SEPT_JOURS = 7 * 24 * 60 * 60 * 1000;

export type EtatVerification = 'aucune' | 'invite' | 'retrait' | 'verifie';

/**
 * Un compte tel que la page Indices le montre (spec 011, US2) : de quoi
 * comparer côte à côte, et de quoi ouvrir le dossier avec les décisions de
 * l'ancienne file (mêmes champs que `GET /api/admin/profils-a-verifier`).
 * E-mail masqué : la page sert à reconnaître, pas à contacter.
 */
export interface CompteGrappe extends CompteIndice {
  email: string;
  aPhoto: boolean;
  lastSeenAt: Date | null;
  etatVerification: EtatVerification;
  enRetrait: boolean;
  bio: string;
  photos: string[];
  derniereDecision: { decision: string; decidedAt: Date } | null;
  signaux: Array<{
    type: string;
    force: string;
    extrait: string | null;
    photo: string | null;
    autreUserId: string | null;
    createdAt: Date;
    nouveau: boolean;
  }>;
}

function etat(u: { isVerified: boolean; retraitAt: Date | null; verifInviteeAt: Date | null }): EtatVerification {
  if (u.isVerified) return 'verifie';
  if (u.retraitAt) return 'retrait';
  if (u.verifInviteeAt) return 'invite';
  return 'aucune';
}

/**
 * Charge les comptes porteurs d'au moins un indice non tranché et les liens
 * qui les relient, puis les regroupe. Une requête par table, calcul en
 * mémoire : la base compte quelques centaines de membres.
 */
export async function chargerGrappes(now = new Date()): Promise<Grappe<CompteGrappe>[]> {
  const db = getDb();
  const users = await db.user.findMany({
    where: { isBanned: false, profileSignals: { some: {} } },
    select: {
      id: true,
      displayName: true,
      email: true,
      createdAt: true,
      emailVerified: true,
      isVerified: true,
      retraitAt: true,
      verifInviteeAt: true,
      lastSeenAt: true,
      profile: { select: { photos: true, bio: true } },
      profileSignals: {
        select: { type: true, force: true, extrait: true, photoKey: true, autreUserId: true, createdAt: true },
        orderBy: { createdAt: 'desc' },
      },
      profileReview: { select: { decision: true, decidedAt: true } },
    },
    take: MAX_COMPTES,
  });

  const comptes: CompteGrappe[] = [];
  const liens: Lien[] = [];
  for (const u of users) {
    const decidedAt = u.profileReview?.decidedAt ?? null;
    const recents = signauxRecents(u.profileSignals, decidedAt);
    if (recents.length === 0) continue;
    for (const s of recents) {
      const sorte = SORTE_PAR_SIGNAL[s.type];
      if (sorte && s.autreUserId) liens.push({ de: u.id, vers: s.autreUserId, sorte });
    }
    const photos = u.profile?.photos ?? [];
    comptes.push({
      id: u.id,
      displayName: u.displayName,
      createdAt: u.createdAt,
      emailConfirme: u.emailVerified !== null,
      niveau: niveauFiabilite(recents, u.isVerified),
      types: recents.map((s) => s.type),
      dernierSignal: recents[0]?.createdAt ?? null,
      email: masquerEmail(u.email),
      aPhoto: photos.length > 0,
      lastSeenAt: u.lastSeenAt,
      etatVerification: etat(u),
      enRetrait: u.retraitAt !== null,
      bio: u.profile?.bio ?? '',
      photos: photos.map(photoUrl),
      derniereDecision: u.profileReview,
      signaux: u.profileSignals.map((s) => ({
        type: s.type,
        force: s.force,
        extrait: s.extrait,
        photo: s.photoKey ? photoUrl(s.photoKey) : null,
        autreUserId: s.autreUserId,
        createdAt: s.createdAt,
        nouveau: !decidedAt || s.createdAt > decidedAt,
      })),
    });
  }

  // Même connexion à l'inscription : seule la trace (7 jours) relie les
  // comptes, la clé du signal est une date. On ne relie que des comptes
  // dont l'indice « inscriptions groupées » est encore ouvert.
  const groupes = new Set(comptes.filter((c) => c.types.includes('inscriptions_groupees')).map((c) => c.id));
  if (groupes.size > 1) {
    const traces = await db.signupTrace.findMany({
      where: { userId: { in: [...groupes] }, createdAt: { gte: new Date(now.getTime() - SEPT_JOURS) } },
      select: { userId: true, ipHash: true },
    });
    const parIp = new Map<string, string[]>();
    for (const t of traces) parIp.set(t.ipHash, [...(parIp.get(t.ipHash) ?? []), t.userId]);
    for (const ids of parIp.values()) {
      for (let i = 1; i < ids.length; i++) liens.push({ de: ids[0], vers: ids[i], sorte: 'connexion' });
    }
  }

  return construireGrappes(comptes, liens);
}

/** Compteur de la navigation admin : le nombre de grappes ouvertes. */
export async function compterGrappes(): Promise<number> {
  return (await chargerGrappes()).length;
}
