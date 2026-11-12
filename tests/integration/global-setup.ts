/**
 * Préparation unique des tests d'intégration (#548) : sème le jeu factice
 * dans la base jetable. Refuse toute autre base, et échoue avant le premier
 * test plutôt que de laisser la suite tourner sur une base inconnue.
 */
import { semerBaseDeTest } from '../../prisma/seed-test';

export default async function setup(): Promise<void> {
  const n = await semerBaseDeTest(process.env.DATABASE_URL);
  console.info(`[tests] Base de test prête : ${n} comptes factices.`);
}
