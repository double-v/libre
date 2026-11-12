'use client';

import { Suspense, useCallback, useEffect, useRef, useState } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import AnalyseRattrapage from '@/components/admin/AnalyseRattrapage';
import FicheMembre, { Vide } from '@/components/admin/FicheMembre';
import MembreRow from '@/components/admin/MembreRow';
import CountChip from '@/components/ui/CountChip';
import { FILTRES, FILTRES_TRAVAIL, TRIS, estFiltre, estTri, estUuid, type Compteurs, type Filtre, type Tri } from '@/lib/moderation/cas';
import type { MembreListe } from '@/lib/moderation/membres';

/**
 * Hub Membres (spec 012, US3 ; DESIGN.md « Hub Membres »).
 *
 * L'état — filtre, recherche, tri, membre ouvert — vit dans l'adresse
 * (FR-016) : un rechargement ou un lien partagé rend le même écran. Sous
 * 900 px, la fiche remplace la liste ; au-delà, les deux volets cohabitent.
 * La liste se charge par pages en arrivant à son bout (FR-017).
 */
function Hub() {
  const sp = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  const brutFiltre = sp.get('filtre') ?? '';
  const brutTri = sp.get('tri') ?? '';
  const filtre: Filtre = estFiltre(brutFiltre) ? brutFiltre : 'atraiter';
  const tri: Tri = estTri(brutTri) ? brutTri : 'urgence';
  const q = sp.get('q') ?? '';
  const brutMembre = sp.get('membre');
  const membre = brutMembre && estUuid(brutMembre) ? brutMembre : null;

  const [saisie, setSaisie] = useState(q);
  const [membres, setMembres] = useState<MembreListe[]>([]);
  const [curseur, setCurseur] = useState<string | null>(null);
  const [compteurs, setCompteurs] = useState<Compteurs | null>(null);
  const [etat, setEtat] = useState<'chargement' | 'pret' | 'erreur'>('chargement');
  const [suite, setSuite] = useState(false);
  const [version, setVersion] = useState(0);
  const sentinelle = useRef<HTMLDivElement>(null);
  const [maintenant, setMaintenant] = useState(() => new Date());

  const allerA = useCallback(
    (changes: Record<string, string | null>) => {
      const p = new URLSearchParams(sp.toString());
      for (const [k, v] of Object.entries(changes)) {
        if (v === null || v === '') p.delete(k);
        else p.set(k, v);
      }
      const chaine = p.toString();
      router.replace(chaine ? `${pathname}?${chaine}` : pathname, { scroll: false });
    },
    [pathname, router, sp],
  );

  // Clé de la liste affichée : une page suivante demandée pour une autre clé
  // (filtre changé entre-temps) est jetée à son retour.
  const cleListe = `${filtre}|${tri}|${q}|${version}`;
  const cleCourante = useRef(cleListe);
  useEffect(() => {
    cleCourante.current = cleListe;
  }, [cleListe]);

  // Première page à chaque changement de filtre, de tri ou de recherche.
  useEffect(() => {
    let annule = false;
    void (async () => {
      // Le curseur de l'ancienne liste ne vaut rien pour la nouvelle.
      setCurseur(null);
      setEtat('chargement');
      try {
        const res = await fetch(`/api/admin/membres?${new URLSearchParams({ filtre, tri, ...(q ? { q } : {}) })}`);
        if (!res.ok) throw new Error();
        const d: { membres: MembreListe[]; curseur: string | null; compteurs: Compteurs } = await res.json();
        if (annule) return;
        setMembres(d.membres);
        setCurseur(d.curseur);
        setCompteurs(d.compteurs);
        setMaintenant(new Date());
        setEtat('pret');
      } catch {
        if (!annule) setEtat('erreur');
      }
    })();
    return () => { annule = true; };
  }, [filtre, tri, q, version]);

  // Recherche : l'adresse suit la saisie après une courte pause.
  useEffect(() => {
    if (saisie === q) return;
    const t = setTimeout(() => allerA({ q: saisie.trim() || null }), 300);
    return () => clearTimeout(t);
  }, [saisie, q, allerA]);

  const chargerSuite = useCallback(async () => {
    if (!curseur || suite || etat !== 'pret') return;
    const cle = cleListe;
    setSuite(true);
    try {
      const res = await fetch(`/api/admin/membres?${new URLSearchParams({ filtre, tri, curseur, ...(q ? { q } : {}) })}`);
      if (!res.ok) throw new Error();
      const d: { membres: MembreListe[]; curseur: string | null } = await res.json();
      if (cleCourante.current !== cle) return;
      setMembres((l) => [...l, ...d.membres.filter((m) => !l.some((x) => x.id === m.id))]);
      setCurseur(d.curseur);
    } catch {
      // La sentinelle reste en place : un nouveau passage relancera.
    } finally {
      setSuite(false);
    }
  }, [curseur, suite, etat, cleListe, filtre, tri, q]);

  useEffect(() => {
    const el = sentinelle.current;
    if (!el || !curseur) return;
    const obs = new IntersectionObserver((entrees) => {
      if (entrees.some((e) => e.isIntersecting)) void chargerSuite();
    }, { rootMargin: '200px' });
    obs.observe(el);
    return () => obs.disconnect();
  }, [curseur, chargerSuite]);

  // Sous 900 px, la fiche remplace la liste : on retient où l'on était dans
  // la liste pour y revenir avec « ← Membres » (US3, test indépendant).
  const positionListe = useRef<number | null>(null);
  const ouvrir = useCallback((id: string) => {
    if (window.matchMedia('(max-width: 899.98px)').matches) {
      if (!membre) positionListe.current = window.scrollY;
      window.scrollTo(0, 0);
    }
    allerA({ membre: id });
  }, [allerA, membre]);
  useEffect(() => {
    if (membre || positionListe.current === null) return;
    const y = positionListe.current;
    positionListe.current = null;
    requestAnimationFrame(() => window.scrollTo(0, y));
  }, [membre]);
  const recharger = useCallback(() => setVersion((v) => v + 1), []);

  return (
    <div className="grid grid-cols-[minmax(0,1fr)] min-[900px]:-my-6 min-[900px]:h-[100dvh] min-[900px]:grid-cols-[360px_minmax(0,1fr)]">
      <div className={`grid min-w-0 content-start gap-2.5 py-3.5 min-[900px]:overflow-auto min-[900px]:border-r min-[900px]:border-hairline min-[900px]:pr-4 ${membre ? 'max-[899.98px]:hidden' : ''}`}>
        <h1 className="sr-only">Membres</h1>
        <input
          type="search"
          value={saisie}
          onChange={(e) => setSaisie(e.target.value)}
          placeholder="Chercher un pseudo ou une adresse e-mail"
          aria-label="Chercher un membre"
          maxLength={100}
          className="min-h-[42px] w-full rounded-lg border border-hairline bg-surface px-3 text-sm text-content placeholder:text-muted"
        />
        <div role="toolbar" aria-label="Filtres" className="-mx-4 flex gap-1.5 overflow-x-auto px-4 [scrollbar-width:none] min-[900px]:mx-0 min-[900px]:flex-wrap min-[900px]:px-0">
          {FILTRES.map((f) => (
            <button
              key={f.cle}
              type="button"
              aria-pressed={filtre === f.cle}
              onClick={() => allerA({ filtre: f.cle === 'atraiter' ? null : f.cle, membre: null })}
              className={`flex min-h-11 shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full border px-3 text-[13px] focus-visible:outline-none focus-visible:shadow-focus ${filtre === f.cle ? 'border-coral bg-coral/10 text-coral-dark dark:text-coral-light' : 'border-hairline bg-surface text-content'}`}
            >
              {f.libelle}
              {FILTRES_TRAVAIL.has(f.cle) && compteurs && <CountChip count={compteurs[f.cle as keyof Compteurs]} />}
            </button>
          ))}
        </div>
        <div className="flex items-center justify-between gap-2.5">
          <span className="text-xs text-muted" aria-live="polite">
            {etat === 'pret' ? `${membres.length} membre${membres.length > 1 ? 's' : ''}${curseur ? ', d’autres suivent' : ''}` : ''}
          </span>
          <select
            aria-label="Trier"
            value={tri}
            onChange={(e) => allerA({ tri: e.target.value === 'urgence' ? null : e.target.value })}
            className="min-h-11 w-auto rounded-lg border border-hairline bg-surface px-2 text-[13px] text-content"
          >
            {TRIS.map((t) => <option key={t.cle} value={t.cle}>{t.libelle}</option>)}
          </select>
        </div>
        <div className="overflow-hidden rounded-card border border-hairline bg-surface">
          {etat === 'erreur' ? (
            <div role="alert" className="grid gap-2 px-4 py-6 text-center text-sm text-muted">
              La liste n’a pas pu être chargée. Vérifie ta connexion, puis réessaie.
              <button type="button" onClick={recharger} className="mx-auto min-h-11 font-semibold text-coral-dark dark:text-coral-light">Réessayer</button>
            </div>
          ) : etat === 'chargement' && membres.length === 0 ? (
            <div className="px-4 py-6 text-center text-sm text-muted" aria-busy="true">Chargement…</div>
          ) : membres.length === 0 ? (
            <Vide titre="Rien ici" texte="Aucun membre ne correspond à ce filtre." />
          ) : (
            <>
              {membres.map((m) => (
                <MembreRow key={m.id} m={m} courant={m.id === membre} onOuvrir={ouvrir} maintenant={maintenant} />
              ))}
              {curseur && (
                <div ref={sentinelle} className="px-3.5 py-3 text-xs text-muted">
                  {suite ? 'Chargement des membres suivants…' : 'Les membres suivants se chargent en arrivant au bout de la liste.'}
                </div>
              )}
            </>
          )}
        </div>
        {filtre === 'indice' && <AnalyseRattrapage onFini={recharger} />}
      </div>

      <div className={`min-w-0 min-[900px]:overflow-auto min-[900px]:pl-5 ${membre ? '' : 'max-[899.98px]:hidden'}`}>
        {membre ? (
          <FicheMembre key={membre} id={membre} onRetour={() => allerA({ membre: null })} onChange={recharger} onOuvrir={ouvrir} />
        ) : (
          <Vide titre="Choisis un membre" texte="Sa fiche s’affiche ici." />
        )}
      </div>
    </div>
  );
}

export default function AdminMembresPage() {
  return (
    <Suspense fallback={<div className="py-6 text-sm text-muted">Chargement…</div>}>
      <Hub />
    </Suspense>
  );
}
