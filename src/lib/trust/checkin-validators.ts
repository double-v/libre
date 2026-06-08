/**
 * Validators Zod pour les opérations de Check-in de sécurité.
 *
 * Cf. docs/roadmap/chantiers/01-securite/plan.md tâches 2.1, 2.2, 2.3, 2.4, 2.5.
 *
 * V1 simplifié : on n'accepte QUE des valeurs énumérées pour la
 * durée, pas un nombre libre. C'est à la fois pour la sécurité (pas
 * de durée arbitraire) et pour l'UX (l'utilisateur choisit dans une
 * liste prédéfinie, comme Spotify pour la durée d'un focus).
 */
import { z } from 'zod';

/**
 * Durées prédéfinies (en minutes).
 * Choix UX : 30 min / 1h / 2h / 4h / 8h. Couvre la majorité des
 * cas d'usage (café, dîner, soirée, nuit, journée).
 *
 * ⚠️ Ne PAS exposer ce tableau comme source de vérité côté UI :
 * faire une constante partagée entre ce validator et le composant
 * `CheckinDurationModal`.
 */
export const CHECKIN_DURATIONS = [30, 60, 120, 240, 480] as const;
export type CheckinDurationMinutes = (typeof CHECKIN_DURATIONS)[number];

/**
 * POST /api/circle/check-in — Démarre un check-in.
 * Body : { durationMinutes: 30|60|120|240|480 }
 */
export const startCheckinSchema = z
  .object({
    durationMinutes: z
      .number()
      .int()
      .refine((v) => (CHECKIN_DURATIONS as readonly number[]).includes(v), {
        message: 'Durée invalide. Valeurs acceptées : 30, 60, 120, 240, 480 minutes.',
      }),
  })
  .strict();

/**
 * POST /api/circle/check-in/:id/validate — Valide "Je suis safe".
 * Body : {} (l'ID est dans l'URL)
 */
export const validateCheckinSchema = z
  .object({
    // Pas de body nécessaire : l'ID vient de l'URL.
  })
  .strict();

/**
 * POST /api/circle/check-in/:id/cancel — Annule un check-in.
 * Body : {}
 */
export const cancelCheckinSchema = z
  .object({})
  .strict();

/**
 * GET /api/circle/check-in/active — Récupère le check-in actif.
 * Pas de body.
 */
export const getActiveCheckinSchema = z.object({}).strict();

/**
 * Types inférés.
 */
export type StartCheckinInput = z.infer<typeof startCheckinSchema>;
export type ValidateCheckinInput = z.infer<typeof validateCheckinSchema>;
export type CancelCheckinInput = z.infer<typeof cancelCheckinSchema>;
export type GetActiveCheckinInput = z.infer<typeof getActiveCheckinSchema>;
