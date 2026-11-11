// @vitest-environment node
/**
 * Garde « jamais de test sur une base partagée » (#548).
 *
 * Les attendus sont écrits à la main : chaque cas est une adresse qu'un
 * `.env` de développeur ou un secret de CI pourrait réellement contenir.
 */
import { describe, it, expect } from 'vitest';
import { baseEstJetable, neutraliserBaseDistante, URL_NEUTRALISEE } from '../garde-base';

describe('baseEstJetable', () => {
  it.each([
    ['postgresql://libre:libre@localhost:5432/libre_ci'],
    ['postgresql://libre:libre@127.0.0.1:5432/libre_test'],
    ['postgres://u:p@[::1]:5432/t'],
  ])('accepte une base locale : %s', (url) => {
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

  it('laisse une base locale intacte', () => {
    const env: Record<string, string | undefined> = { DATABASE_URL: 'postgresql://libre:libre@localhost:5432/libre_ci' };
    expect(neutraliserBaseDistante(env)).toEqual([]);
    expect(env.DATABASE_URL).toBe('postgresql://libre:libre@localhost:5432/libre_ci');
  });

  it('ne crée pas de variable absente', () => {
    const env: Record<string, string | undefined> = {};
    expect(neutraliserBaseDistante(env)).toEqual([]);
    expect('DATABASE_URL' in env).toBe(false);
  });

  it("l'adresse neutralisée est elle-même jugée locale mais ne répond pas (port 1)", () => {
    expect(new URL(URL_NEUTRALISEE).port).toBe('1');
  });
});
