// @vitest-environment node
/**
 * Garde « jamais de test sur une base partagée » (#548).
 *
 * Les attendus sont écrits à la main : chaque cas est une adresse qu'un
 * `.env` de développeur ou un secret de CI pourrait réellement contenir.
 */
import { describe, it, expect } from 'vitest';
import { baseEstJetable, neutraliserBaseDistante, URL_NEUTRALISEE, effacerServicesExternes } from '../garde-base';

describe('effacerServicesExternes', () => {
  it('retire les identifiants des services qui envoient ou stockent pour de vrai', () => {
    const env: Record<string, string | undefined> = {
      PUSHER_APP_ID: '1', PUSHER_KEY: 'k', PUSHER_SECRET: 's',
      UPSTASH_REDIS_REST_URL: 'https://x.upstash.io', UPSTASH_REDIS_REST_TOKEN: 't',
      R2_ACCOUNT_ID: 'a', R2_ACCESS_KEY_ID: 'b', R2_SECRET_ACCESS_KEY: 'c',
      RESEND_API_KEY: 're', VAPID_PRIVATE_KEY: 'v', GIPHY_API_KEY: 'g', TURNSTILE_SECRET_KEY: 'ts',
      NEXTAUTH_SECRET: 'garde-moi', NEXT_PUBLIC_PUSHER_KEY: 'public',
    };
    const effaces = effacerServicesExternes(env);
    expect(Object.keys(env).sort()).toEqual(['NEXTAUTH_SECRET', 'NEXT_PUBLIC_PUSHER_KEY']);
    expect(effaces.sort()).toEqual([
      'GIPHY_API_KEY', 'PUSHER_APP_ID', 'PUSHER_KEY', 'PUSHER_SECRET',
      'R2_ACCESS_KEY_ID', 'R2_ACCOUNT_ID', 'R2_SECRET_ACCESS_KEY', 'RESEND_API_KEY',
      'TURNSTILE_SECRET_KEY', 'UPSTASH_REDIS_REST_TOKEN', 'UPSTASH_REDIS_REST_URL', 'VAPID_PRIVATE_KEY',
    ]);
  });

  it('ne signale rien quand aucun identifiant n’est présent', () => {
    expect(effacerServicesExternes({ NEXTAUTH_SECRET: 'x' })).toEqual([]);
  });
});

describe('baseEstJetable', () => {
  it.each([
    ['postgresql://libre:libre@localhost:5432/libre_ci'],
    ['postgresql://libre:libre@127.0.0.1:54329/libre_test'],
    ['postgres://u:p@[::1]:5432/libre_test'],
  ])('accepte une base locale nommée pour les tests : %s', (url) => {
    expect(baseEstJetable(url)).toBe(true);
  });

  it.each([
    ['Neon via le pooler', 'postgresql://neondb_owner:pw@ep-cool-name-123-pooler.eu-central-1.aws.neon.tech/neondb?sslmode=require'],
    ['Neon en direct', 'postgresql://neondb_owner:pw@ep-cool-name-123.eu-central-1.aws.neon.tech/neondb'],
    ['un hôte qui commence par localhost', 'postgresql://u:p@localhost.attaquant.example/db'],
    ['« localhost » caché dans le mot de passe', 'postgresql://u:x@localhost@db.example.com/db'],
    ['« localhost » caché dans le nom de base', 'postgresql://u:p@db.example.com/localhost'],
    ['une adresse IP publique', 'postgresql://u:p@203.0.113.7:5432/db'],
    ['0.0.0.0, qui n’est pas une destination', 'postgresql://u:p@0.0.0.0:5432/db'],
    ['un nom d’hôte nu résolu par un DNS', 'postgresql://u:p@postgres:5432/db'],
    ['un autre nom nu', 'postgresql://u:p@db:5432/db'],
    ['un hôte distant glissé dans ?host= (pg le préfère à l’hôte de l’URL)', 'postgresql://u:p@localhost:5432/libre_test?host=ep-x.eu-central-1.aws.neon.tech'],
    ['un hôte distant glissé dans ?hostaddr=', 'postgresql://u:p@localhost:5432/libre_test?hostaddr=203.0.113.7'],
    ['?host= en majuscules', 'postgresql://u:p@localhost:5432/libre_test?HOST=ep-x.aws.neon.tech'],
    ['une base de dev locale persistante (nom non réservé aux tests)', 'postgresql://libre:libre@localhost:5432/libre'],
    ['un nom de base qui commence seulement comme celui des tests', 'postgresql://u:p@localhost:5432/libre_test_copie_prod'],
    ['l’adresse neutralisée elle-même', URL_NEUTRALISEE],
    ['une adresse vide', ''],
    ['une adresse illisible', 'pas une url'],
    ['aucune adresse', undefined],
  ])('refuse %s', (_cas, url) => {
    expect(baseEstJetable(url)).toBe(false);
  });
});

describe('neutraliserBaseDistante', () => {
  it('remplace une base distante par une adresse injoignable', () => {
    const env: Record<string, string | undefined> = {
      DATABASE_URL: 'postgresql://neondb_owner:pw@ep-x-pooler.eu-central-1.aws.neon.tech/neondb',
      DATABASE_URL_UNPOOLED: 'postgresql://neondb_owner:pw@ep-x.eu-central-1.aws.neon.tech/neondb',
    };
    const remplacees = neutraliserBaseDistante(env);
    expect(env.DATABASE_URL).toBe(URL_NEUTRALISEE);
    expect(env.DATABASE_URL_UNPOOLED).toBe(URL_NEUTRALISEE);
    expect(remplacees).toEqual(['DATABASE_URL', 'DATABASE_URL_UNPOOLED']);
  });

  it('laisse intacte une base locale de test', () => {
    const env: Record<string, string | undefined> = { DATABASE_URL: 'postgresql://libre:libre@localhost:5432/libre_ci' };
    expect(neutraliserBaseDistante(env)).toEqual([]);
    expect(env.DATABASE_URL).toBe('postgresql://libre:libre@localhost:5432/libre_ci');
  });

  it('neutralise une base de dev locale qui n’est pas une base de test', () => {
    const env: Record<string, string | undefined> = { DATABASE_URL: 'postgresql://libre:libre@localhost:5432/libre' };
    expect(neutraliserBaseDistante(env)).toEqual(['DATABASE_URL']);
    expect(env.DATABASE_URL).toBe(URL_NEUTRALISEE);
  });

  it('ne crée pas de variable absente', () => {
    const env: Record<string, string | undefined> = {};
    expect(neutraliserBaseDistante(env)).toEqual([]);
    expect('DATABASE_URL' in env).toBe(false);
  });

  it("l'adresse neutralisée ne répond pas (port 1) et la garde la refuse comme base de test", () => {
    expect(new URL(URL_NEUTRALISEE).port).toBe('1');
    expect(baseEstJetable(URL_NEUTRALISEE)).toBe(false);
  });
});
