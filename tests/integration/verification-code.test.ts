// @vitest-environment node
/**
 * Code manuscrit du selfie (spec 012, US1/US2) sur un vrai PostgreSQL.
 *
 * Ce qu'une base factice ne prouve pas : la ligne écrasée qui révoque le code
 * précédent, l'effacement conditionnel qui ne laisse passer qu'un envoi même
 * quand deux partent en même temps, et les bornes de 24 h lues sur de vraies
 * demandes. Comptes du jeu factice seulement ; on n'efface que leurs lignes
 * de vérification.
 */
import { describe, it, expect, beforeAll, beforeEach, afterAll } from 'vitest';
import { getDb } from '@/lib/db';
import { codeValide, consommerCode, peutTirer, tirerCode, DUREE_CODE_MS } from '@/lib/verification/code';

let membre: string;
let autre: string;

async function nettoyer() {
  const db = getDb();
  await db.verificationCode.deleteMany({ where: { userId: { in: [membre, autre] } } });
  await db.verificationRequest.deleteMany({ where: { userId: { in: [membre, autre] } } });
}

beforeAll(async () => {
  const db = getDb();
  membre = (await db.user.findUniqueOrThrow({ where: { email: 'membre@exemple.test' }, select: { id: true } })).id;
  autre = (await db.user.findUniqueOrThrow({ where: { email: 'admin@exemple.test' }, select: { id: true } })).id;
});
beforeEach(nettoyer);
afterAll(nettoyer);

describe('tirage et révocation', () => {
  it('un nouveau tirage révoque le précédent', async () => {
    const premier = await tirerCode(membre);
    let second = await tirerCode(membre);
    // Deux tirages peuvent donner le même code par hasard (1 sur 4 096) :
    // on retire jusqu'à en avoir un différent, pour tester la révocation.
    while (second.code === premier.code) second = await tirerCode(membre);
    expect(await codeValide(membre, premier.code)).toBe(false);
    expect(await codeValide(membre, second.code)).toBe(true);
    expect(await getDb().verificationCode.count({ where: { userId: membre } })).toBe(1);
  });

  it('expire 30 minutes après le tirage, pas une milliseconde de plus', async () => {
    const t = new Date('2026-11-12T12:00:00Z');
    const { code, expireAt } = await tirerCode(membre, t);
    expect(expireAt.getTime() - t.getTime()).toBe(DUREE_CODE_MS);
    expect(await codeValide(membre, code, new Date(expireAt.getTime() - 1))).toBe(true);
    expect(await codeValide(membre, code, expireAt)).toBe(false);
  });

  it('le code d’un membre ne vaut rien pour un autre', async () => {
    const { code } = await tirerCode(membre);
    expect(await codeValide(autre, code)).toBe(false);
    expect(await consommerCode(autre, code)).toBe(false);
    expect(await codeValide(membre, code)).toBe(true);
  });

  it('deux tirages simultanés : un seul code reste valable', async () => {
    const [a, b] = await Promise.all([tirerCode(membre), tirerCode(membre)]);
    const valables = [await codeValide(membre, a.code), await codeValide(membre, b.code)];
    if (a.code === b.code) expect(valables).toEqual([true, true]);
    else expect(valables.filter(Boolean)).toHaveLength(1);
    expect(await getDb().verificationCode.count({ where: { userId: membre } })).toBe(1);
  });
});

describe('consommation à la mise en file', () => {
  it('une seule fois', async () => {
    const { code } = await tirerCode(membre);
    expect(await consommerCode(membre, code)).toBe(true);
    expect(await consommerCode(membre, code)).toBe(false);
    expect(await codeValide(membre, code)).toBe(false);
  });

  it('deux envois simultanés du même code : un seul passe', async () => {
    const { code } = await tirerCode(membre);
    const issues = await Promise.all(Array.from({ length: 5 }, () => consommerCode(membre, code)));
    expect(issues.filter(Boolean)).toHaveLength(1);
  });

  it('un code expiré ne se consomme pas et reste en place jusqu’au tirage suivant', async () => {
    const t = new Date(Date.now() - DUREE_CODE_MS - 1000);
    const { code } = await tirerCode(membre, t);
    expect(await consommerCode(membre, code)).toBe(false);
  });

  it('une valeur hors forme n’atteint pas la base et ne consomme rien', async () => {
    const { code } = await tirerCode(membre);
    expect(await consommerCode(membre, `${code} OR 1=1`)).toBe(false);
    expect(await consommerCode(membre, '%')).toBe(false);
    expect(await codeValide(membre, code)).toBe(true);
  });
});

describe('peutTirer sur de vraies demandes (FR-012)', () => {
  const H = 3600 * 1000;
  async function demande(status: string, resolvedAt: Date | null, createdAt: Date) {
    await getDb().verificationRequest.create({
      data: { userId: membre, selfieUrl: 'x', status, resolvedAt, createdAt },
    });
  }

  it('trois refus : fermé à 24 h moins 1 s, ouvert à 24 h plus 1 s', async () => {
    const maintenant = new Date();
    const dernier = new Date(maintenant.getTime() - 2 * H);
    await demande('rejected', new Date(dernier.getTime() - 2 * H), new Date(dernier.getTime() - 3 * H));
    await demande('rejected', new Date(dernier.getTime() - H), new Date(dernier.getTime() - 1.5 * H));
    await demande('rejected', dernier, new Date(dernier.getTime() - 0.5 * H));
    const avant = await peutTirer(membre, new Date(dernier.getTime() + 24 * H - 1000));
    expect(avant.ok).toBe(false);
    expect(avant.ok === false && avant.reessaiAt.getTime()).toBe(dernier.getTime() + 24 * H);
    expect((await peutTirer(membre, new Date(dernier.getTime() + 24 * H + 1000))).ok).toBe(true);
  });

  it('une validation entre les refus : ouvert, et le rang repart après elle', async () => {
    const t = Date.now();
    await demande('rejected', new Date(t - 10 * H), new Date(t - 11 * H));
    await demande('approved', new Date(t - 8 * H), new Date(t - 9 * H));
    await demande('rejected', new Date(t - 4 * H), new Date(t - 5 * H));
    await demande('rejected', new Date(t - 2 * H), new Date(t - 3 * H));
    expect(await peutTirer(membre)).toEqual({ ok: true, tentative: 3 });
  });

  it('les refus d’un autre membre ne comptent pas', async () => {
    const t = Date.now();
    for (let i = 1; i <= 3; i++) {
      await getDb().verificationRequest.create({
        data: { userId: autre, selfieUrl: 'x', status: 'rejected', resolvedAt: new Date(t - i * H), createdAt: new Date(t - i * H - 1000) },
      });
    }
    expect(await peutTirer(membre)).toEqual({ ok: true, tentative: 1 });
  });
});
