/**
 * Validators Zod pour les opérations du Cercle de Confiance.
 *
 * V1 = Libre-only (cf. décision #43, roadmap/chantiers/01-securite).
 * Les contacts sont obligatoirement des users Libre (contactId FK).
 * Pas de contacts hors-app (email/tel) en V1 : ils seront ajoutés
 * en V2 via un flow d'invitation opt-in.
 *
 * Limite métier : 5 contacts max par utilisateur (cf. spec.md).
 * Cette limite est appliquée côté API (POST /api/circle/contacts),
 * pas ici, parce qu'elle nécessite une query DB.
 */
import { z } from 'zod';

/**
 * UUID v4 d'un user Libre.
 * On utilise le format UUID standard (le schema Prisma utilise
 * @db.Uuid qui correspond à des UUIDs classiques, pas cuid).
 */
const userIdSchema = z
  .string({ message: 'Identifiant utilisateur requis' })
  .uuid({ message: 'Identifiant utilisateur invalide' });

/**
 * POST /api/circle/contacts
 * Ajoute un user Libre au cercle de confiance de l'utilisateur
 * courant.
 *
 * V1 simplifié : on n'accepte QUE contactId. Pas de XOR avec
 * email/phone (cf. décision A sur #43).
 *
 * La validation `contactId !== session.user.id` (anti-auto-désignation)
 * ne peut pas se faire ici (on n'a pas accès à la session dans un
 * validator pur). Elle est gérée côté handler.
 */
export const addContactSchema = z
  .object({
    contactId: userIdSchema,
  })
  .strict();

/**
 * DELETE /api/circle/contacts/:id
 * Retire un contact du cercle.
 *
 * Note : l'ID ici est l'ID du TrustContact (pas du User).
 * On valide juste que c'est un UUID.
 */
export const removeContactSchema = z
  .object({
    contactId: userIdSchema,
  })
  .strict();

/**
 * GET /api/circle/contacts
 * Aucun body requis.
 *
 * Le validator existe pour la cohérence (un seul endroit où définir
 * le contrat de l'API) et pour pouvoir ajouter des filtres plus tard
 * (ex: pagination, tri) sans casser les call sites.
 */
export const listContactsSchema = z.object({}).strict();

/**
 * Types inférés depuis les schémas Zod.
 * À utiliser côté handler/API pour typer les inputs validés.
 */
export type AddContactInput = z.infer<typeof addContactSchema>;
export type RemoveContactInput = z.infer<typeof removeContactSchema>;
export type ListContactsInput = z.infer<typeof listContactsSchema>;
