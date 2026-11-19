'use client';

import { Suspense, useCallback, useEffect, useRef, useState } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import AnalyseRattrapage from '@/components/admin/AnalyseRattrapage';
import FicheMembre, { Vide } from '@/components/admin/FicheMembre';
import MembreRow from '@/components/admin/MembreRow';
import Button from '@/components/ui/Button';
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
 *
 * Mise en page (#568) : la page occupe toute la hauteur laissée par la coque
 * (`data-plein-cadre`). Dans le volet de liste, recherche, filtres et tri ne
 * défilent pas ; seule la zone de liste défile, la fenêtre jamais. La liste
 * n'est pas dans une carte `overflow-hidden` : dans un volet à hauteur fixe,
 * une telle carte rétrécit et coupe ses lignes, sentinelle comprise.
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
  const zone = useRef<HTMLDivElement>(null);
  const [ombre, setOmbre] = useState(false);
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
    // La racine est la zone de liste : c'est elle qui défile, pas la fenêtre.
    const obs = new IntersectionObserver((entrees) => {
      if (entrees.some((e) => e.isIntersecting)) void chargerSuite();
    }, { root: zone.current, rootMargin: '200px' });
    obs.observe(el);
    return () => obs.disconnect();
  }, [curseur, chargerSuite]);

  // Sous 900 px, la fiche remplace la liste : on retient où l'on était dans
  // la liste pour y revenir avec « ← Membres » (US3, test indépendant).
  const positionListe = useRef<number | null>(null);
  const ouvrir = useCallback((id: string) => {
    if (window.matchMedia('(max-width: 899.98px)').matches) {
      if (!membre) positionListe.current = zone.current?.scrollTop ?? 0;
    }
    allerA({ membre: id });
  }, [allerA, membre]);
  useEffect(() => {
    if (membre || positionListe.current === null) return;
    const y = positionListe.current;
    positionListe.current = null;
    requestAnimationFrame(() => {
      if (zone.current) zone.current.scrollTop = y;
    });
  }, [membre]);
  // Le membre ouvert (clic, lien partagé, rechargement) est amené dans la
  // zone, **une fois** : sans cette mémoire, chaque page chargée ramènerait la
  // liste sur lui et on ne pourrait plus descendre avec une fiche ouverte.
  const amene = useRef<string | null>(null);
  useEffect(() => {
    if (!membre) {
      amene.current = null;
      return;
    }
    if (etat !== 'pret' || amene.current === membre) return;
    const ligne = zone.current?.querySelector('[aria-current="true"]');
    if (!ligne) return;
    amene.current = membre;
    ligne.scrollIntoView({ block: 'nearest' });
  }, [membre, etat, membres.length]);
  // Nouvelle liste : on repart du haut.
  useEffect(() => {
    if (zone.current) zone.current.scrollTop = 0;
  }, [filtre, tri, q]);
  const recharger = useCallback(() => setVersion((v) => v + 1), []);

  const compte = etat === 'pret' && membres.length > 0
    ? curseur ? `${membres.length} affichés, d’autres suivent` : `${membres.length} membre${membres.length > 1 ? 's' : ''}`
    : '';
  const controle = 'min-h-[44px] rounded-lg border border-hairline bg-surface text-content focus-visible:outline-none focus-visible:shadow-focus';

  return (
    <div data-plein-cadre className="grid h-full min-h-0 grid-cols-[minmax(0,1fr)] min-[900px]:grid-cols-[clamp(360px,36vw,420px)_minmax(0,1fr)]">
      <div className={`flex min-h-0 min-w-0 flex-col bg-surface min-[900px]:border-r min-[900px]:border-hairline ${membre ? 'max-[899.98px]:hidden' : ''}`}>
        {/* Zone fixe : recherche, filtres, tri. */}
        <div className={`relative z-[1] grid shrink-0 gap-2.5 border-b border-hairline px-4 pb-2.5 pt-3 ${ombre ? 'shadow-soft' : ''}`}>
          <h1 className="sr-only">Membres</h1>
          <input
            type="search"
            value={saisie}
            onChange={(e) => setSaisie(e.target.value)}
            placeholder="Chercher par pseudo ou e-mail"
            aria-label="Chercher un membre"
            maxLength={100}
            className={`w-full px-3 text-sm placeholder:text-muted ${controle}`}
          />
          {/* Sous 900 px : douze puces sur une ligne qui défile au doigt. Au-delà :
              les six filtres de travail en puces, les filtres de statut dans la
              liste « Statut du compte… » ci-dessous. */}
          <div role="toolbar" aria-label="Filtres" className="-mx-4 flex gap-1.5 overflow-x-auto px-4 py-0.5 [scrollbar-width:none] min-[900px]:mx-0 min-[900px]:flex-wrap min-[900px]:gap-1 min-[900px]:overflow-visible min-[900px]:px-0">
            {FILTRES.map((f) => (
              <button
                key={f.cle}
                type="button"
                aria-pressed={filtre === f.cle}
                onClick={() => allerA({ filtre: f.cle === 'atraiter' ? null : f.cle, membre: null })}
                className={`min-h-[44px] shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full border px-3 text-[13px] min-[900px]:px-2.5 focus-visible:outline-none focus-visible:shadow-focus ${FILTRES_TRAVAIL.has(f.cle) ? 'flex' : 'flex min-[900px]:hidden'} ${filtre === f.cle ? 'border-coral bg-coral/10 text-coral-dark dark:text-coral-light' : 'border-hairline bg-surface text-content'}`}
              >
                {f.libelle}
                {FILTRES_TRAVAIL.has(f.cle) && compteurs && <CountChip count={compteurs[f.cle as keyof Compteurs]} />}
              </button>
            ))}
          </div>
          <div className="flex items-center justify-between gap-2.5 min-[900px]:grid min-[900px]:grid-cols-2 min-[900px]:gap-2">
            <span className="text-xs leading-snug text-muted min-[900px]:hidden" aria-live="polite">{compte}</span>
            <select
              aria-label="Filtrer par statut du compte"
              value={FILTRES_TRAVAIL.has(filtre) ? '' : filtre}
              onChange={(e) => allerA({ filtre: e.target.value || null, membre: null })}
              className={`hidden w-full px-2 text-[13px] min-[900px]:block ${controle}`}
            >
              <option value="">Statut du compte…</option>
              {FILTRES.filter((f) => !FILTRES_TRAVAIL.has(f.cle)).map((f) => <option key={f.cle} value={f.cle}>{f.libelle}</option>)}
            </select>
            <select
              aria-label="Trier"
              value={tri}
              onChange={(e) => allerA({ tri: e.target.value === 'urgence' ? null : e.target.value })}
              className={`w-auto px-2 text-[13px] min-[900px]:w-full ${controle}`}
            >
              {TRIS.map((t) => <option key={t.cle} value={t.cle}>{t.libelle}</option>)}
            </select>
          </div>
        </div>

        {/* Zone qui défile : la liste, et elle seule. */}
        <div
          ref={zone}
          role="region"
          aria-label="Liste des membres"
          tabIndex={0}
          onScroll={(e) => setOmbre(e.currentTarget.scrollTop > 2)}
          className="min-h-0 flex-1 overflow-y-auto overscroll-contain focus-visible:outline-none focus-visible:shadow-[inset_var(--shadow-focus)]"
        >
          {compte && <div className="hidden border-b border-hairline px-4 py-2 text-xs leading-snug text-muted min-[900px]:block" aria-live="polite">{compte}</div>}
          {etat === 'erreur' ? (
            <div role="alert" className="grid gap-2 px-4 py-6 text-center text-sm text-muted">
              La liste n’a pas pu être chargée. Vérifie ta connexion, puis réessaie.
              <span><Button pill variant="secondary" onClick={recharger}>Réessayer</Button></span>
            </div>
          ) : etat === 'chargement' && membres.length === 0 ? (
            <div className="px-4 py-6 text-center text-sm text-muted" aria-busy="true">Chargement…</div>
          ) : membres.length === 0 ? (
            <div className="grid justify-items-center gap-1 pb-6">
              <Vide titre="Rien ici" texte={q ? 'Aucun membre ne correspond à cette recherche dans ce filtre.' : 'Aucun membre ne correspond à ce filtre.'} />
              {(filtre !== 'tous' || q) && (
                <Button pill variant="secondary" onClick={() => { setSaisie(''); allerA({ filtre: 'tous', q: null, membre: null }); }}>Voir tous les membres</Button>
              )}
            </div>
          ) : (
            <>
              {membres.map((m) => (
                <MembreRow key={m.id} m={m} courant={m.id === membre} onOuvrir={ouvrir} maintenant={maintenant} />
              ))}
              {curseur ? (
                <div ref={sentinelle} className="grid justify-items-center gap-2 px-4 pb-5 pt-3.5 text-center text-xs text-muted">
                  <span>Les membres suivants se chargent en arrivant ici.</span>
                  <Button pill variant="secondary" loading={suite} disabled={suite} onClick={() => void chargerSuite()}>Afficher les membres suivants</Button>
                </div>
              ) : (
                <div className="px-4 pb-5 pt-3.5 text-center text-xs text-muted">Fin de la liste · {membres.length} membre{membres.length > 1 ? 's' : ''}</div>
              )}
            </>
          )}
          {filtre === 'indice' && <div className="px-4 pb-4"><AnalyseRattrapage onFini={recharger} /></div>}
        </div>
      </div>

      <div className={`min-h-0 min-w-0 overflow-y-auto overscroll-contain ${membre ? '' : 'max-[899.98px]:hidden'}`}>
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
    <Suspense fallback={<div className="p-4 text-sm text-muted">Chargement…</div>}>
      <Hub />
    </Suspense>
  );
}
