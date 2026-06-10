/**
 * POST /api/circle/check-in — Démarre un check-in de sécurité.
 *
 * Cf. docs/roadmap/chantiers/01-securite/plan.md tâche 2.2.
 *
 * Préconditions métier :
 * 1. User authentifié (401 sinon)
 * 2. Body validé par startCheckinSchema (400 sinon)
 * 3. User a ≥1 contact dans son cercle (422 sinon, message FR)
 * 4. Pas de check-in 'active' existant pour ce user (409 sinon)
 *
 * V1 simplifié : pas de position (lastLat/lastLng = null). Sera ajouté
 * en V2 avec opt-in explicite depuis l'UI.
 *
 * Convention : comme les autres tests d'intégration du repo
 * (cf. tests/integration/auth.test.ts), ces tests sont des MOCKS DE DOC
 * qui décrivent les cas attendus. Les vrais tests HTTP sont dans
 * tests/e2e (Playwright, désactivé pour l'instant — cf. #35).
 */
import { describe, it } from 'vitest';

describe('POST /api/circle/check-in (requires server)', () => {
  it('crée un check-in de 30 min pour un user avec 1 contact', async () => {
    // Setup : user authentifié, 1 TrustContact dans son cercle
    // POST /api/circle/check-in { durationMinutes: 30 }
    // Expect 201, { id: uuid, expiresAt: ISO 30 min plus tard, durationMinutes: 30 }
    // Vérif DB : SafetyCheckin créé avec status='active', userId correct
  });

  it('accepte 60 / 120 / 240 / 480 minutes (toutes les durées du validator)', async () => {
    // 4 sous-cas : POST avec chaque valeur de CHECKIN_DURATIONS
    // Expect 201 pour chaque
  });

  it('rejette 401 si non authentifié', async () => {
    // POST sans cookie de session
    // Expect 401, { error: 'Non authentifié' }
  });

  it('rejette 400 si body invalide (regression du validator startCheckinSchema)', async () => {
    // 5 sous-cas : { durationMinutes: 33 } / { durationMinutes: 0 }
    //              { durationMinutes: -10 } / { durationMinutes: 30.5 }
    //              { durationMinutes: '60' }
    // Plus : { durationMinutes: 60, extraField: 'x' } (strict)
    // Expect 400 pour chaque, { error: 'Données invalides', details: [...] }
  });

  it("rejette 422 si user a 0 contact dans son cercle", async () => {
    // Setup : user authentifié, 0 TrustContact
    // POST { durationMinutes: 60 }
    // Expect 422, { error: "Ajoute d'abord un contact à ton Cercle" }
    // Pas de SafetyCheckin créé en DB
  });

  it('rejette 409 si un check-in active existe déjà pour ce user', async () => {
    // Setup : user authentifié, 1 contact, 1 SafetyCheckin status='active'
    // POST { durationMinutes: 60 }
    // Expect 409, { error: "Tu as déjà un check-in en cours..." }
    // Le checkin existant n'est PAS modifié
  });

  it('ignore les champs supplémentaires (strict Zod)', async () => {
    // POST { durationMinutes: 60, notes: 'foo' } — `notes` n'est pas
    // accepté par le startCheckinSchema (côté validate/cancel V2)
    // Expect 400
  });

  it('renvoie expiresAt strictement > triggeredAt', async () => {
    // Setup : user avec 1 contact
    // POST { durationMinutes: 60 }
    // Vérif : (expiresAt - triggeredAt) = 60 min ± 1s
    // Note : l'API ne renvoie pas triggeredAt, donc cette vérif est
    // côté DB ou via GET /api/circle/check-in/active (V1.1)
  });
});
