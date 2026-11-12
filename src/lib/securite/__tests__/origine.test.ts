// @vitest-environment node
/**
 * Contrôle d'origine des écritures admin (spec 012, FR-S08, menace M9).
 *
 * Un site tiers peut faire envoyer une requête par le navigateur d'un
 * modérateur connecté. On attend un refus 403 dès que l'origine n'est pas
 * celle du site ou que le corps n'est pas du JSON : un formulaire HTML ou un
 * `sendBeacon` en `text/plain` ne doivent jamais passer.
 */
import { describe, it, expect, afterEach } from 'vitest';
import { refusOrigine } from '../origine';

const SITE = 'https://libre.exemple.test';

function requete(entetes: Record<string, string>, url = `${SITE}/api/admin/membres/x`): Request {
  return new Request(url, { method: 'DELETE', headers: entetes, body: '{}' });
}

afterEach(() => {
  delete process.env.NEXTAUTH_URL;
});

describe('refusOrigine', () => {
  it('laisse passer une requête JSON de la même origine', () => {
    expect(refusOrigine(requete({ origin: SITE, 'content-type': 'application/json' }))).toBeNull();
  });

  it('accepte le jeu de caractères après le type', () => {
    expect(refusOrigine(requete({ origin: SITE, 'content-type': 'application/json; charset=utf-8' }))).toBeNull();
  });

  it('refuse sans en-tête Origin', async () => {
    const r = refusOrigine(requete({ 'content-type': 'application/json' }));
    expect(r?.status).toBe(403);
    expect((await r!.json()).error).toMatch(/origine/i);
  });

  it('refuse une origine étrangère', () => {
    expect(refusOrigine(requete({ origin: 'https://attaquant.exemple', 'content-type': 'application/json' }))?.status).toBe(403);
  });

  it('refuse une origine qui ne fait que commencer comme le site', () => {
    expect(refusOrigine(requete({ origin: `${SITE}.attaquant.exemple`, 'content-type': 'application/json' }))?.status).toBe(403);
  });

  it('refuse le même hôte sur un autre schéma', () => {
    expect(refusOrigine(requete({ origin: 'http://libre.exemple.test', 'content-type': 'application/json' }))?.status).toBe(403);
  });

  it('refuse l’origine « null » d’un document isolé', () => {
    expect(refusOrigine(requete({ origin: 'null', 'content-type': 'application/json' }))?.status).toBe(403);
  });

  it.each(['text/plain', 'application/x-www-form-urlencoded', 'multipart/form-data; boundary=x', 'application/jsonp', ''])(
    'refuse le type de contenu « %s »',
    (type) => {
      const entetes: Record<string, string> = { origin: SITE };
      if (type) entetes['content-type'] = type;
      expect(refusOrigine(requete(entetes))?.status).toBe(403);
    },
  );

  it('accepte l’adresse publique déclarée quand le serveur se voit sous un autre nom', () => {
    process.env.NEXTAUTH_URL = SITE;
    const interne = requete({ origin: SITE, 'content-type': 'application/json' }, 'http://localhost:3000/api/admin/membres/x');
    expect(refusOrigine(interne)).toBeNull();
  });

  it('une adresse publique déclarée n’ouvre pas la porte aux autres', () => {
    process.env.NEXTAUTH_URL = SITE;
    const r = requete({ origin: 'https://attaquant.exemple', 'content-type': 'application/json' }, 'http://localhost:3000/api/x');
    expect(refusOrigine(r)?.status).toBe(403);
  });
});
