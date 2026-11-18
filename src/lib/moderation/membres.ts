import { Prisma } from '@/generated/client/client';
import { getDb } from '@/lib/db';
import { photoUrl } from '@/lib/photos';
import type { NiveauFiabilite } from '@/lib/fraude/fiabilite';
import {
  GRAVITE, RANG_GRAVITE, RANG_SANS_CAS, TYPES_CAS, echapperRecherche, encoderCurseur,
  type Compteurs, type Curseur, type Filtre, type Gravite, type Tri, type TypeCas,
} from './cas';

/**
 * Liste du hub Membres (spec 012, US3, research R6) : un seul aller-retour
 * SQL par page, pour l'offre Hobby de Vercel. Les cas sont dérivés en base à
 * partir des tables existantes, jamais stockés ; la gravité et l'ordre
 * viennent de `cas.ts`, passés en paramètres.
 *
 * Sécurité (FR-S14, M15) : uniquement des gabarits `Prisma.sql` — chaque
 * valeur venue du client (recherche, curseur, filtre) part en paramètre lié,
 * jamais concaténée. Le filtre et le tri ne choisissent qu'entre des
 * fragments écrits ici.
 *
 * Surface admin seulement : la fiabilité calculée ici ne sort jamais vers un
 * membre (garde `signaux-never-leak`).
 */

export const TAILLE_PAGE = 20;

/** Rang de gravité de chaque type, en table SQL construite depuis `cas.ts`. */
function tableGravite(): Prisma.Sql {
  return Prisma.sql`(VALUES ${Prisma.join(
    TYPES_CAS.map((t) => Prisma.sql`(${t}::text, ${RANG_GRAVITE[GRAVITE[t]]}::int)`),
  )}) AS g(type, rang)`;
}

/**
 * Les CTE communes : signaux non tranchés (`sig`) et cas en attente (`cas`).
 *
 * - `report` : signalement `pending` ;
 * - `verif` : selfie `pending` ;
 * - `photo` : texte de contact lu sur une photo encore publiée, ni tranchée
 *   ni voilée **par la modération** (spec 006) — un voile posé par le membre
 *   lui-même laisse le contact en ligne, le cas reste ouvert ;
 * - `indice` : au moins un autre signal non tranché — un cas par membre, daté
 *   du plus ancien (spec 010/011, page Indices) ;
 * - `reponse` et `relecture` n'ont pas encore de source : aucune réponse
 *   n'attend de modération hors signalement (spec 009), et le masquage
 *   arrive avec la spec 012 US6.
 * Un compte banni garde ses signalements et selfies en attente (comme les
 * anciennes files), mais plus ses indices ni ses photos.
 */
function cteCas(uid: string | null = null): Prisma.Sql {
  const pour = (col: Prisma.Sql) => (uid ? Prisma.sql`AND ${col} = ${uid}::uuid` : Prisma.empty);
  return Prisma.sql`
    sig AS (
      SELECT s.id, s."userId" AS uid, s.type, s.force, s."photoKey", s."createdAt"
      FROM profile_signals s
      LEFT JOIN profile_reviews r ON r."userId" = s."userId"
      WHERE (r."decidedAt" IS NULL OR s."createdAt" > r."decidedAt") ${pour(Prisma.sql`s."userId"`)}
    ),
    cas AS (
      SELECT 'report'::text AS type, r.id::text AS id, r."reportedId" AS uid, r."createdAt" AS depuis
        FROM reports r WHERE r.status = 'pending' ${pour(Prisma.sql`r."reportedId"`)}
      UNION ALL
      SELECT 'verif', v.id::text, v."userId", v."createdAt"
        FROM verification_requests v WHERE v.status = 'pending' ${pour(Prisma.sql`v."userId"`)}
      UNION ALL
      SELECT 'photo', s.id::text, s.uid, s."createdAt"
        FROM sig s JOIN users u ON u.id = s.uid JOIN profiles p ON p."userId" = s.uid
        WHERE s.type = 'contact_photo' AND NOT u."isBanned" AND s."photoKey" = ANY(p.photos)
          AND NOT EXISTS (SELECT 1 FROM photo_moderation pm WHERE pm.key = s."photoKey" AND pm."classifiedBy" IS NOT NULL)
      UNION ALL
      SELECT 'indice', s.uid::text, s.uid, min(s."createdAt")
        FROM sig s JOIN users u ON u.id = s.uid
        WHERE s.type <> 'contact_photo' AND NOT u."isBanned"
        GROUP BY s.uid
    )`;
}

/** Niveau de fiabilité en SQL, même règle que `niveauFiabilite` (spec 010, FR-013/FR-014). */
const NIVEAU_SQL = Prisma.sql`GREATEST(0,
  (CASE WHEN COALESCE(f.fort, false) OR COALESCE(f.types_faibles, 0) >= 3 THEN 2 WHEN COALESCE(f.n, 0) > 0 THEN 1 ELSE 0 END)
  - (CASE WHEN u."isVerified" THEN 1 ELSE 0 END))`;

const NIVEAUX: NiveauFiabilite[] = ['fiable', 'a_surveiller', 'douteux'];

export type StatutMembre = 'actif' | 'banni' | 'masque' | 'non_confirme';

export interface CasListe {
  type: TypeCas;
  id: string;
  gravite: Gravite;
  depuis: string;
}

export interface MembreListe {
  id: string;
  pseudo: string;
  avatar: string | null;
  inscritAt: string;
  vuLe: string | null;
  verifie: boolean;
  statut: StatutMembre;
  fiabilite: NiveauFiabilite;
  cas: CasListe[];
}

interface Ligne {
  id: string;
  pseudo: string;
  photo: string | null;
  inscrit: Date;
  vu: Date | null;
  verifie: boolean;
  banni: boolean;
  retrait: boolean;
  confirme: boolean;
  rang: number;
  temps_urgence: Date;
  n: number;
  niveau: number;
  cas: Array<{ type: TypeCas; id: string; depuis: string }> | null;
}

/**
 * Statut affiché. « Masqué » désigne pour l'instant la mise en retrait
 * (spec 006), seul masquage existant ; la spec 012 US6 y ajoutera le
 * masquage de 3 mois.
 */
export function statutDe(l: { banni: boolean; retrait: boolean; confirme: boolean }): StatutMembre {
  if (l.banni) return 'banni';
  if (l.retrait) return 'masque';
  if (!l.confirme) return 'non_confirme';
  return 'actif';
}

function filtreSql(filtre: Filtre): Prisma.Sql {
  switch (filtre) {
    case 'atraiter': return Prisma.sql`m.rang < ${RANG_SANS_CAS}`;
    case 'verif':
    case 'report':
    case 'photo':
    case 'reponse':
    case 'indice':
      return Prisma.sql`EXISTS (SELECT 1 FROM cas c WHERE c.uid = m.id AND c.type = ${filtre})`;
    case 'douteux': return Prisma.sql`m.niveau = 2`;
    case 'verifies': return Prisma.sql`m.verifie`;
    case 'masques': return Prisma.sql`m.retrait`;
    case 'bannis': return Prisma.sql`m.banni`;
    case 'nonconf': return Prisma.sql`NOT m.confirme`;
    case 'tous': return Prisma.sql`TRUE`;
  }
}

function ordreSql(tri: Tri): Prisma.Sql {
  switch (tri) {
    case 'urgence': return Prisma.sql`m.rang ASC, m.temps_urgence ASC, m.id ASC`;
    case 'recent': return Prisma.sql`m.inscrit DESC, m.id DESC`;
    case 'fiabilite': return Prisma.sql`m.niveau DESC, m.n DESC, m.inscrit DESC, m.id DESC`;
  }
}

function apresSql(c: Curseur | null): Prisma.Sql {
  if (!c) return Prisma.sql`TRUE`;
  switch (c.tri) {
    case 'urgence':
      return Prisma.sql`(m.rang, m.temps_urgence, m.id) > (${c.rang}::int, ${c.temps}::timestamp(3), ${c.id}::uuid)`;
    case 'recent':
      return Prisma.sql`(m.inscrit, m.id) < (${c.temps}::timestamp(3), ${c.id}::uuid)`;
    case 'fiabilite':
      return Prisma.sql`(m.niveau, m.n, m.inscrit, m.id) < (${c.rang}::int, ${c.n}::int, ${c.temps}::timestamp(3), ${c.id}::uuid)`;
  }
}

function curseurDe(tri: Tri, l: Ligne): string {
  switch (tri) {
    case 'urgence': return encoderCurseur({ tri, rang: l.rang, temps: l.temps_urgence.toISOString(), id: l.id });
    case 'recent': return encoderCurseur({ tri, temps: l.inscrit.toISOString(), id: l.id });
    case 'fiabilite': return encoderCurseur({ tri, rang: l.niveau, n: l.n, temps: l.inscrit.toISOString(), id: l.id });
  }
}

const jour = (d: Date | null) => (d ? d.toISOString().slice(0, 10) : null);

export async function listerMembres(p: {
  filtre: Filtre;
  tri: Tri;
  q: string;
  curseur: Curseur | null;
}): Promise<{ membres: MembreListe[]; curseur: string | null }> {
  const motif = p.q ? `%${echapperRecherche(p.q)}%` : null;
  const recherche = motif
    ? Prisma.sql`(m.pseudo ILIKE ${motif} ESCAPE '\\' OR m.email ILIKE ${motif} ESCAPE '\\')`
    : Prisma.sql`TRUE`;

  const lignes = await getDb().$queryRaw<Ligne[]>(Prisma.sql`
    WITH ${cteCas()},
    g AS (SELECT * FROM ${tableGravite()}),
    agg AS (
      SELECT c.uid, MIN(g.rang) AS rang,
        json_agg(json_build_object('type', c.type, 'id', c.id, 'depuis', c.depuis) ORDER BY g.rang, c.depuis, c.id) AS cas
      FROM cas c JOIN g ON g.type = c.type GROUP BY c.uid
    ),
    aggdepuis AS (
      SELECT c.uid, MIN(c.depuis) AS depuis
      FROM cas c JOIN g ON g.type = c.type JOIN agg a ON a.uid = c.uid AND a.rang = g.rang
      GROUP BY c.uid
    ),
    fiab AS (
      SELECT s.uid, COUNT(*)::int AS n, BOOL_OR(s.force = 'fort') AS fort,
        (COUNT(DISTINCT s.type) FILTER (WHERE s.force <> 'fort'))::int AS types_faibles
      FROM sig s GROUP BY s.uid
    ),
    m AS (
      SELECT u.id, u."displayName" AS pseudo, u.email, (p.photos)[1] AS photo, u."createdAt" AS inscrit,
        u.last_seen_at AS vu, u."isVerified" AS verifie, u."isBanned" AS banni,
        (u."retraitAt" IS NOT NULL) AS retrait, (u."emailVerified" IS NOT NULL) AS confirme,
        COALESCE(a.rang, ${RANG_SANS_CAS}::int)::int AS rang,
        COALESCE(ad.depuis, u."createdAt") AS temps_urgence,
        COALESCE(f.n, 0)::int AS n,
        (${NIVEAU_SQL})::int AS niveau,
        a.cas
      FROM users u
      LEFT JOIN profiles p ON p."userId" = u.id
      LEFT JOIN agg a ON a.uid = u.id
      LEFT JOIN aggdepuis ad ON ad.uid = u.id
      LEFT JOIN fiab f ON f.uid = u.id
    )
    SELECT m.id::text AS id, m.pseudo, m.photo, m.inscrit, m.vu, m.verifie, m.banni, m.retrait, m.confirme,
      m.rang, m.temps_urgence, m.n, m.niveau, m.cas
    FROM m
    WHERE ${filtreSql(p.filtre)} AND ${recherche} AND ${apresSql(p.curseur)}
    ORDER BY ${ordreSql(p.tri)}
    LIMIT ${TAILLE_PAGE + 1}
  `);

  const page = lignes.slice(0, TAILLE_PAGE);
  return {
    membres: page.map((l) => ({
      id: l.id,
      pseudo: l.pseudo,
      avatar: l.photo ? photoUrl(l.photo) : null,
      inscritAt: l.inscrit.toISOString(),
      vuLe: jour(l.vu),
      verifie: l.verifie,
      statut: statutDe(l),
      fiabilite: NIVEAUX[l.niveau] ?? 'fiable',
      cas: (l.cas ?? []).map((c) => ({ type: c.type, id: c.id, gravite: GRAVITE[c.type], depuis: new Date(c.depuis + (c.depuis.endsWith('Z') ? '' : 'Z')).toISOString() })),
    })),
    curseur: lignes.length > TAILLE_PAGE ? curseurDe(p.tri, page[page.length - 1]) : null,
  };
}

/**
 * Compteurs des filtres de travail (FR-014) : un seul `COUNT` groupé sur les
 * mêmes cas que la liste, qui remplace les trois `count` de `countAdminQueues`.
 */
export async function compterCas(): Promise<Compteurs> {
  const lignes = await getDb().$queryRaw<Array<{ type: TypeCas; n: number }>>(Prisma.sql`
    WITH ${cteCas()}
    SELECT type, COUNT(*)::int AS n FROM cas GROUP BY type
  `);
  const par = Object.fromEntries(lignes.map((l) => [l.type, l.n])) as Partial<Record<TypeCas, number>>;
  return {
    atraiter: lignes.reduce((s, l) => s + l.n, 0),
    verif: par.verif ?? 0,
    report: par.report ?? 0,
    photo: par.photo ?? 0,
    reponse: par.reponse ?? 0,
    indice: par.indice ?? 0,
  };
}

/** Les cas en attente d'un seul membre, pour sa fiche : du plus grave au moins grave, puis du plus ancien. */
export async function casDuMembre(uid: string): Promise<Array<{ type: TypeCas; id: string; depuis: Date }>> {
  return getDb().$queryRaw<Array<{ type: TypeCas; id: string; depuis: Date }>>(Prisma.sql`
    WITH ${cteCas(uid)}, g AS (SELECT * FROM ${tableGravite()})
    SELECT cas.type, cas.id, cas.depuis FROM cas JOIN g ON g.type = cas.type
    WHERE cas.uid = ${uid}::uuid ORDER BY g.rang ASC, cas.depuis ASC, cas.id ASC
  `);
}
