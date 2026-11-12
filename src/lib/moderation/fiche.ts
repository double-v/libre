import { getDb } from '@/lib/db';
import { photoUrl } from '@/lib/photos';
import { photoSensitivityMap } from '@/lib/photo-veil';
import { questionByKey, choiceLabels } from '@/lib/questions';
import { niveauFiabilite, signauxRecents, TYPES_CONTEXTE, type NiveauFiabilite } from '@/lib/fraude/fiabilite';
import { LIBELLES_SIGNAL, MENTION_LEGITIME } from '@/lib/fraude/libelles';
import { texteAncienGeste } from '@/lib/verification/ancien-geste';
import { lireMotif } from '@/lib/verification/motifs';
import { estUuid } from './gestes';
import { casDuMembre, statutDe, type StatutMembre } from './membres';
import { ACTIONS_CONSULTATION, LIBELLES_ACTION, MOTIFS_SIGNALEMENT } from './reperes';

/**
 * Fiche d'un membre (spec 012, US4, contrats/api.md) : tout ce qu'il faut
 * pour trancher ses cas sans ouvrir d'autre page. Surface admin seulement.
 *
 * Champs exposés en liste blanche : l'adresse complète y figure (la fiche est
 * l'accès ciblé de #423), mais ni mot de passe, ni appareil, ni position, ni
 * ville saisie (spec 004) ne sortent, même vers un admin.
 */

const HISTORIQUE_MAX = 50;

export interface FicheMembre {
  membre: {
    id: string;
    pseudo: string;
    email: string;
    inscritAt: string;
    vuLe: string | null;
    verifie: boolean;
    statut: StatutMembre;
    fiabilite: NiveauFiabilite;
    invitation: string | null;
    retrait: string | null;
    admin: boolean;
  };
  cas: CasFiche[];
  reponses: Array<{ id: string; cle: string; question: string; texte: string; choix: string[] }>;
  signaux: Array<{ type: string; libelle: string; force: string; date: string; extrait: string | null; legitimePossible: string | null }>;
  photos: Array<{ cle: string; url: string; voile: string | null }>;
  historique: Array<{ at: string; action: string; libelle: string; motif: string | null; auteur: string }>;
}

export type CasFiche =
  | {
      type: 'report'; id: string; depuis: string; motif: string; motifLibelle: string; description: string;
      auteur: string; enAttente: number;
      reponsesAuMoment: Array<{ question: string; texte: string; choix: string[] }>;
    }
  | { type: 'verif'; id: string; depuis: string; verification: LigneVerification }
  | { type: 'photo'; id: string; depuis: string; cle: string; url: string; texteLu: string | null }
  | {
      type: 'indice'; id: string; depuis: string;
      doublon: { id: string; pseudo: string } | null;
      lies: Array<{ id: string; pseudo: string | null; existe: boolean; confirme: boolean }>;
    };

/** Même forme que `VerificationRow` d'`AdminVerificationCard` (lot 1). */
export interface LigneVerification {
  id: string;
  selfieUrl: string;
  status: string;
  createdAt: string;
  codeAttendu: string | null;
  codeLu: string | null;
  tentative: number;
  sansDonneesAppareil: boolean | null;
  ancienGeste: string | null;
  motif: string | null;
  refusPrecedent: { motif: string | null; at: string | null } | null;
  user: { id: string; displayName: string; emailMasque: string; photos: string[] };
}

type Snapshot = Array<{ questionKey?: string; text?: string; choices?: string[] }>;

const iso = (d: Date | null | undefined) => (d ? d.toISOString() : null);

/**
 * Le motif d'une ligne de journal, tel qu'un humain le lit : les clés
 * internes (motif de refus, types de signaux d'une invitation automatique,
 * question d'une réponse retirée) sont traduites ; un texte libre reste tel quel.
 */
export function motifLisible(action: string, motif: string | null): string | null {
  if (!motif) return null;
  if (action === 'REJECT_VERIFICATION') return lireMotif(motif)?.libelle ?? motif;
  if (action === 'INVITE_VERIFICATION') return motif.split(',').map((t) => LIBELLES_SIGNAL[t.trim()] ?? t.trim()).join(', ');
  if (action === 'REMOVE_ANSWER') return questionByKey(motif)?.label ?? motif;
  return motif;
}

export async function lireFiche(id: string): Promise<FicheMembre | null> {
  if (!estUuid(id)) return null;
  const db = getDb();
  const u = await db.user.findUnique({
    where: { id },
    select: {
      id: true, displayName: true, email: true, role: true, createdAt: true, lastSeenAt: true,
      isVerified: true, isBanned: true, retraitAt: true, verifInviteeAt: true, emailVerified: true,
      profile: { select: { photos: true } },
      profileReview: { select: { decidedAt: true } },
      profileSignals: {
        orderBy: { createdAt: 'desc' },
        select: { id: true, type: true, force: true, extrait: true, photoKey: true, autreUserId: true, createdAt: true },
      },
      profileAnswers: { where: { status: 'published' }, orderBy: { createdAt: 'asc' }, select: { id: true, questionKey: true, text: true, choices: true } },
    },
  });
  if (!u) return null;

  const photos = u.profile?.photos ?? [];
  const recents = signauxRecents(u.profileSignals, u.profileReview?.decidedAt ?? null);
  const casBruts = await casDuMembre(id);

  const idsReports = casBruts.filter((c) => c.type === 'report').map((c) => c.id);
  const idsVerifs = casBruts.filter((c) => c.type === 'verif').map((c) => c.id);
  const lies = [...new Set([...recents].reverse().map((s) => s.autreUserId).filter((x): x is string => !!x))];

  const [reports, verifs, refus, comptesLies, voiles, journal] = await Promise.all([
    idsReports.length
      ? db.report.findMany({
          where: { id: { in: idsReports } },
          select: { id: true, reason: true, description: true, answersSnapshot: true, reporter: { select: { displayName: true } } },
        })
      : [],
    idsVerifs.length ? db.verificationRequest.findMany({ where: { id: { in: idsVerifs } } }) : [],
    idsVerifs.length
      ? db.verificationRequest.findMany({
          where: { userId: id, status: 'rejected' },
          orderBy: { resolvedAt: 'desc' },
          select: { id: true, rejectReason: true, resolvedAt: true, createdAt: true },
        })
      : [],
    lies.length ? db.user.findMany({ where: { id: { in: lies } }, select: { id: true, displayName: true, emailVerified: true } }) : [],
    photoSensitivityMap(photos),
    db.moderationLog.findMany({
      where: { targetUserId: id, action: { notIn: [...ACTIONS_CONSULTATION] } },
      orderBy: { createdAt: 'desc' },
      take: HISTORIQUE_MAX,
      select: { action: true, reason: true, createdAt: true, admin: { select: { displayName: true } } },
    }),
  ]);

  const parCompte = new Map(comptesLies.map((c) => [c.id, c]));
  const etiquette = (s: Snapshot[number]) => {
    const key = s.questionKey ?? '';
    return { question: questionByKey(key)?.label ?? key, texte: s.text ?? '', choix: choiceLabels(key, s.choices ?? []) };
  };

  const cas: CasFiche[] = [];
  for (const c of casBruts) {
    const depuis = c.depuis.toISOString();
    if (c.type === 'report') {
      const r = reports.find((x) => x.id === c.id);
      if (!r) continue;
      cas.push({
        type: 'report', id: c.id, depuis,
        motif: r.reason, motifLibelle: MOTIFS_SIGNALEMENT[r.reason] ?? r.reason, description: r.description,
        auteur: r.reporter.displayName, enAttente: idsReports.length,
        reponsesAuMoment: Array.isArray(r.answersSnapshot) ? (r.answersSnapshot as Snapshot).map(etiquette) : [],
      });
    } else if (c.type === 'verif') {
      const v = verifs.find((x) => x.id === c.id);
      if (!v) continue;
      const precedent = v.tentative > 1 ? refus.find((r) => r.id !== v.id && r.createdAt < v.createdAt) : undefined;
      cas.push({
        type: 'verif', id: c.id, depuis,
        verification: {
          id: v.id, selfieUrl: v.selfieUrl, status: v.status, createdAt: v.createdAt.toISOString(),
          codeAttendu: v.codeAttendu, codeLu: v.codeLu, tentative: v.tentative, sansDonneesAppareil: v.sansDonneesAppareil,
          ancienGeste: v.codeAttendu ? null : texteAncienGeste(v.challenge),
          motif: lireMotif(v.rejectReason)?.texte ?? null,
          refusPrecedent: precedent ? { motif: lireMotif(precedent.rejectReason)?.libelle ?? null, at: iso(precedent.resolvedAt) } : null,
          // La carte affiche l'adresse masquée ; la fiche a déjà l'adresse entière en tête.
          user: { id: u.id, displayName: u.displayName, emailMasque: '', photos: photos.map(photoUrl) },
        },
      });
    } else if (c.type === 'photo') {
      const s = u.profileSignals.find((x) => x.id === c.id);
      if (!s?.photoKey) continue;
      cas.push({ type: 'photo', id: c.id, depuis, cle: s.photoKey, url: photoUrl(s.photoKey), texteLu: s.extrait });
    } else if (c.type === 'indice') {
      const liste = lies.map((l) => {
        const compte = parCompte.get(l);
        return { id: l, pseudo: compte?.displayName ?? null, existe: !!compte, confirme: !!compte?.emailVerified };
      });
      // Doublon probable (spec 011, US2) : même appareil qu'un compte jamais
      // confirmé, ce membre-ci étant confirmé. La suppression revérifie tout.
      const appareil = new Set(recents.filter((s) => s.type === 'appareil_partage').map((s) => s.autreUserId));
      const doublon = u.emailVerified ? liste.find((l) => l.existe && !l.confirme && appareil.has(l.id)) : undefined;
      cas.push({ type: 'indice', id: c.id, depuis, doublon: doublon ? { id: doublon.id, pseudo: doublon.pseudo! } : null, lies: liste });
    }
  }

  const historique = [
    ...journal.map((j) => ({
      at: j.createdAt.toISOString(),
      action: j.action,
      libelle: LIBELLES_ACTION[j.action] ?? j.action,
      motif: motifLisible(j.action, j.reason),
      auteur: j.admin?.displayName ?? 'automatique',
    })),
    { at: u.createdAt.toISOString(), action: 'INSCRIPTION', libelle: LIBELLES_ACTION.INSCRIPTION, motif: null, auteur: 'automatique' },
  ].sort((a, b) => (a.at < b.at ? 1 : a.at > b.at ? -1 : 0));

  return {
    membre: {
      id: u.id,
      pseudo: u.displayName,
      email: u.email,
      inscritAt: u.createdAt.toISOString(),
      vuLe: u.lastSeenAt ? u.lastSeenAt.toISOString().slice(0, 10) : null,
      verifie: u.isVerified,
      statut: statutDe({ banni: u.isBanned, retrait: !!u.retraitAt, confirme: !!u.emailVerified }),
      fiabilite: niveauFiabilite(recents, u.isVerified),
      invitation: iso(u.verifInviteeAt),
      retrait: iso(u.retraitAt),
      admin: u.role === 'ADMIN',
    },
    cas,
    reponses: u.profileAnswers.map((a) => ({
      id: a.id, cle: a.questionKey, question: questionByKey(a.questionKey)?.label ?? a.questionKey, texte: a.text, choix: choiceLabels(a.questionKey, a.choices),
    })),
    signaux: recents.map((s) => ({
      type: s.type,
      libelle: LIBELLES_SIGNAL[s.type] ?? s.type,
      force: s.force,
      date: s.createdAt.toISOString(),
      extrait: s.extrait,
      legitimePossible: TYPES_CONTEXTE.has(s.type) ? MENTION_LEGITIME[s.type] ?? null : null,
    })),
    photos: photos.map((cle) => ({ cle, url: photoUrl(cle), voile: voiles[cle] ?? null })),
    historique,
  };
}
