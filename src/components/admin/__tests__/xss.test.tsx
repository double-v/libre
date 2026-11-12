/**
 * Garde XSS du back-office (spec 012, FR-S15, menace M16, T035a).
 *
 * 1. Aucun `dangerouslySetInnerHTML` dans les composants et pages admin
 *    (recherche dans le texte, commentaires retirés : un commentaire ne doit
 *    ni déclencher ni masquer la garde).
 * 2. Un pseudo, une description de signalement, une réponse et un texte lu
 *    piégés s'affichent comme du texte dans `MembreRow` et `FicheMembre` :
 *    aucun élément n'est créé à partir d'eux.
 */
import { describe, it, expect, vi, afterEach } from 'vitest';
import { readdirSync, readFileSync, statSync } from 'fs';
import path from 'path';
import { render, screen, cleanup } from '@testing-library/react';
import MembreRow from '../MembreRow';
import FicheMembre from '../FicheMembre';
import type { FicheMembre as Fiche } from '@/lib/moderation/fiche';

const PIEGE = '<img src=x onerror="window.__xss=1">';
const SCRIPT = '<script>window.__xss=1</script>';

function fichiers(dossier: string): string[] {
  return readdirSync(dossier).flatMap((nom) => {
    const p = path.join(dossier, nom);
    if (statSync(p).isDirectory()) return nom === '__tests__' ? [] : fichiers(p);
    return /\.(tsx?|jsx?)$/.test(nom) ? [p] : [];
  });
}

const sansCommentaires = (s: string) => s.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:])\/\/.*$/gm, '$1');

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  delete (window as unknown as { __xss?: number }).__xss;
});

describe('aucun HTML brut dans le back-office', () => {
  const racine = path.resolve(__dirname, '../../../');
  const cibles = [...fichiers(path.join(racine, 'components/admin')), ...fichiers(path.join(racine, 'app/(admin)')), path.join(racine, 'components/AdminVerificationCard.tsx'), path.join(racine, 'components/ui/BottomSheet.tsx')];

  it('la garde lit bien des fichiers (pas de test vide)', () => {
    expect(cibles.length).toBeGreaterThan(20);
    expect(cibles.some((f) => f.endsWith('FicheMembre.tsx'))).toBe(true);
  });

  it.each(cibles.map((f) => [path.relative(racine, f), f]))('%s', (_r, f) => {
    expect(sansCommentaires(readFileSync(f, 'utf8'))).not.toMatch(/dangerouslySetInnerHTML|innerHTML\s*=|insertAdjacentHTML/);
  });
});

describe('contenu de membre rendu comme du texte', () => {
  it('MembreRow : pseudo piégé', () => {
    const { container } = render(
      <MembreRow
        m={{ id: 'u', pseudo: PIEGE, avatar: null, inscritAt: '2026-11-10T00:00:00Z', vuLe: null, verifie: false, statut: 'actif', fiabilite: 'fiable', cas: [] }}
        courant={false}
        onOuvrir={() => {}}
        maintenant={new Date('2026-11-12T00:00:00Z')}
      />,
    );
    expect(screen.getByText(PIEGE)).toBeInTheDocument();
    expect(container.querySelector('img')).toBeNull();
  });

  it('FicheMembre : pseudo, signalement, réponse et texte lu piégés', async () => {
    const fiche: Fiche = {
      membre: { id: '3f2b8c1e-1d2a-4c3b-9a8e-7f6d5c4b3a21', pseudo: PIEGE, email: 'x@exemple.test', inscritAt: '2026-11-10T00:00:00Z', vuLe: null, verifie: false, statut: 'actif', fiabilite: 'douteux', invitation: null, retrait: null, admin: false },
      cas: [
        { type: 'report', id: 'r', depuis: '2026-11-11T00:00:00Z', motif: 'scam', motifLibelle: 'Arnaque ou demande d’argent', description: SCRIPT, auteur: PIEGE, enAttente: 1, reponsesAuMoment: [] },
        { type: 'photo', id: 'p', depuis: '2026-11-11T00:00:00Z', cle: 'k', url: '/api/photos/k', texteLu: PIEGE },
      ],
      reponses: [{ id: 'a', cle: 'rire', question: 'Ce qui me fait rire', texte: SCRIPT, choix: [] }],
      signaux: [{ type: 'lexique_arnaque', libelle: 'Vocabulaire', force: 'fort', date: '2026-11-11T00:00:00Z', extrait: SCRIPT, legitimePossible: null }],
      photos: [],
      historique: [{ at: '2026-11-11T00:00:00Z', action: 'BAN', libelle: 'Banni', motif: PIEGE, auteur: PIEGE }],
    };
    vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify(fiche), { status: 200 })));
    const { container } = render(<FicheMembre id={fiche.membre.id} onRetour={() => {}} onChange={() => {}} onOuvrir={() => {}} />);
    expect(await screen.findByRole('heading', { level: 1, name: PIEGE })).toBeInTheDocument();
    expect(screen.getAllByText(SCRIPT).length).toBeGreaterThanOrEqual(2);
    expect(container.querySelector('script')).toBeNull();
    expect([...container.querySelectorAll('img')].every((i) => i.getAttribute('src') !== 'x')).toBe(true);
    expect((window as unknown as { __xss?: number }).__xss).toBeUndefined();
  });
});
