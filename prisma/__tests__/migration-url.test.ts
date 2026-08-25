/**
 * Tests — l'URL des migrations ne doit jamais passer par le pooler (#363).
 *
 * Le mode d'échec qu'ils verrouillent : une migration passée par pgbouncer
 * prend `pg_advisory_lock(72707369)` — un verrou de **session** — et sa
 * connexion serveur retourne au pool sans le relâcher. Toutes les migrations
 * suivantes meurent en P1002, parfois pendant plus de treize minutes.
 *
 * La règle de réécriture touche une chaîne qui contient un mot de passe :
 * c'est ce qui justifie de la tester plutôt que de la relire.
 */
import { describe, it, expect } from 'vitest';
import { urlDeMigration, endpointDirect, URL_PLACEHOLDER } from '../migration-url';

const POOLE = 'postgresql://u:p@ep-exemple-pooler.eu-central-1.aws.neon.tech/neondb?sslmode=require';
const DIRECT = 'postgresql://u:p@ep-exemple.eu-central-1.aws.neon.tech/neondb?sslmode=require';

describe('endpointDirect', () => {
  it('retire `-pooler` de l’hôte', () => {
    expect(endpointDirect(POOLE)).toBe(DIRECT);
  });

  it('laisse intact un hôte déjà direct', () => {
    expect(endpointDirect(DIRECT)).toBe(DIRECT);
  });

  it('ne touche pas à un mot de passe qui contient `-pooler.`', () => {
    // Le piège que le `sed` du workflow documente : sans ancrage sur l'hôte,
    // la réécriture corromprait l'identifiant et la migration échouerait en
    // P1000 — une panne qui ne ressemble en rien à sa cause.
    const avecPiege = 'postgresql://u:x-pooler.y@ep-exemple-pooler.eu-central-1.aws.neon.tech/neondb';
    expect(endpointDirect(avecPiege)).toBe(
      'postgresql://u:x-pooler.y@ep-exemple.eu-central-1.aws.neon.tech/neondb',
    );
  });

  it('ne réécrit pas un nom de base qui contient `-pooler.`', () => {
    const url = 'postgresql://u:p@ep-exemple.aws.neon.tech/db-pooler.test';
    expect(endpointDirect(url)).toBe(url);
  });
});

describe('urlDeMigration', () => {
  it('préfère DATABASE_URL_UNPOOLED quand elle existe', () => {
    // C'est la variable déjà posée sur Vercel — inerte tant que `directUrl`
    // était censée la porter.
    expect(urlDeMigration({ DATABASE_URL: POOLE, DATABASE_URL_UNPOOLED: DIRECT })).toBe(DIRECT);
  });

  it('dérive l’endpoint direct à défaut', () => {
    expect(urlDeMigration({ DATABASE_URL: POOLE })).toBe(DIRECT);
  });

  it('ignore une DATABASE_URL_UNPOOLED vide plutôt que de la prendre au mot', () => {
    expect(urlDeMigration({ DATABASE_URL: POOLE, DATABASE_URL_UNPOOLED: '' })).toBe(DIRECT);
  });

  it('retombe sur la sentinelle sans configuration', () => {
    expect(urlDeMigration({})).toBe(URL_PLACEHOLDER);
  });
});
