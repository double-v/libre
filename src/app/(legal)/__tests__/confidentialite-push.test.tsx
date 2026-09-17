/**
 * Tests — Confidentialité, paragraphe notifications (#392, FR-027, T063).
 *
 * Corollaire de #328 : une promesse de confidentialité ne vaut que si le
 * code la tient. On vérifie donc la copie ET ce qu'elle promet, en lisant
 * les sources : la table ne stocke que l'adresse d'envoi et ses clés (pas
 * de contenu ni d'historique), la charge utile n'a ni texte ni nom, et
 * l'abonnement est supprimé au désabonnement, à la déconnexion et en cascade.
 */
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import Confidentialite from '@/app/(legal)/confidentialite/page';

const read = (p: string) => readFileSync(join(process.cwd(), p), 'utf8');

describe('page Confidentialité — notifications hors de l’app', () => {
  it('dit ce qui est conservé, ce qui ne l’est jamais, et quand c’est supprimé', () => {
    render(<Confidentialite />);
    expect(screen.getByText(/2\.6 Notifications hors de l.application/)).toBeInTheDocument();
    const p = screen.getByText(/adresse d.envoi fournie par votre navigateur/i);
    expect(p.textContent).toMatch(/jamais le contenu des notifications envoyées ni leur historique/i);
    expect(p.textContent).toMatch(/ni le texte d.un message, ni le nom/i);
    expect(p.textContent).toMatch(/désactivez le réglage/i);
    expect(p.textContent).toMatch(/déconnectez sur cet appareil/i);
    expect(p.textContent).toMatch(/avec votre compte/i);
    expect(p.textContent).toMatch(/désactivée par défaut/i);
  });

  it('« seulement où envoyer » : la table n’a que l’adresse, les clés, le type d’appareil et des dates', () => {
    const model = read('prisma/schema.prisma').split('model PushSubscription')[1].split('}')[0];
    const fields = [...model.matchAll(/^\s+(\w+)\s+(?:String|DateTime)/gm)].map((m) => m[1]);
    expect(fields.sort()).toEqual(['auth', 'createdAt', 'endpoint', 'id', 'lastUsedAt', 'p256dh', 'userAgent', 'userId'].sort());
  });

  it('« ni le texte ni le nom » : la charge utile est construite sans lire le contexte, sauf conversationId', () => {
    const server = read('src/lib/push/server.ts');
    const build = server.slice(server.indexOf('export function buildPayload'), server.indexOf('const DAY'));
    // La seule lecture de `ctx` est conversationId.
    const reads = [...build.matchAll(/ctx\.(\w+)/g)].map((m) => m[1]);
    expect(new Set(reads)).toEqual(new Set(['conversationId']));
  });

  it('« supprimé au désabonnement, à la déconnexion, avec le compte » : le code le fait', () => {
    expect(read('src/lib/push/client.ts')).toMatch(/method: 'DELETE'/);
    expect(read('src/lib/logout.ts')).toMatch(/await disablePush\(\)/);
    expect(read('prisma/migrations/20260917120000_add_push_subscriptions/migration.sql')).toMatch(/ON DELETE CASCADE/);
  });

  it('« désactivée par défaut » : aucune demande de permission hors d’un clic', () => {
    // On cherche l'APPEL (`requestPermission(`), pas sa mention en commentaire.
    const CALL = /requestPermission\(/;
    expect(read('src/components/PushSettings.tsx')).not.toMatch(CALL);
    const client = read('src/lib/push/client.ts');
    const enable = client.slice(client.indexOf('export async function enablePush'), client.indexOf('export async function disablePush'));
    expect(enable).toMatch(CALL);
    expect(client.replace(enable, '')).not.toMatch(CALL);
  });
});
