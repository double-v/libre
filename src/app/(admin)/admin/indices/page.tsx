'use client';

import { Suspense, useCallback, useEffect, useState } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import Button from '@/components/ui/Button';
import GrappeCard, { type GrappeVue } from '@/components/admin/GrappeCard';
import type { DecisionProfil } from '@/components/AdminProfilCard';

type Filtre = 'tous' | 'doublons' | 'douteux' | 'a_surveiller';

const FILTRES: { valeur: Filtre; libelle: string }[] = [
  { valeur: 'tous', libelle: 'Toutes' },
  { valeur: 'doublons', libelle: 'Doublons probables' },
  { valeur: 'douteux', libelle: 'Douteux' },
  { valeur: 'a_surveiller', libelle: 'À surveiller' },
];

interface Reponse {
  grappes: GrappeVue[];
  total: number;
  parPage: number;
  compteurs: Record<Filtre, number>;
}

/**
 * Page Indices (spec 011, US2) — remplace la file « Profils à vérifier ».
 * Le filtre et la page vivent dans l'adresse : un retour depuis une fiche
 * retrouve la liste telle qu'on l'a laissée.
 */
function Indices() {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const filtre = (FILTRES.find((f) => f.valeur === params.get('filtre'))?.valeur ?? 'tous') as Filtre;
  const page = Math.max(1, Number.parseInt(params.get('page') ?? '1', 10) || 1);

  const [data, setData] = useState<Reponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [erreur, setErreur] = useState('');
  const [analyse, setAnalyse] = useState<{ enCours: boolean; profils: number; fini: boolean }>({ enCours: false, profils: 0, fini: false });

  const allerA = (f: Filtre, p = 1) => {
    const q = new URLSearchParams();
    if (f !== 'tous') q.set('filtre', f);
    if (p > 1) q.set('page', String(p));
    router.replace(q.size ? `${pathname}?${q}` : pathname, { scroll: false });
  };

  const charger = useCallback(async () => {
    setLoading(true);
    try {
      const q = new URLSearchParams({ filtre, page: String(page) });
      const res = await fetch(`/api/admin/indices?${q}`);
      if (!res.ok) throw new Error();
      setData(await res.json());
    } catch {
      setErreur('Impossible de charger les indices.');
    } finally {
      setLoading(false);
    }
  }, [filtre, page]);

  useEffect(() => {
    void (async () => { await charger(); })();
  }, [charger]);

  async function envoyer(url: string, init: RequestInit, echec: string) {
    setErreur('');
    try {
      const res = await fetch(url, { headers: { 'Content-Type': 'application/json' }, ...init });
      if (!res.ok) {
        const corps = await res.json().catch(() => ({}));
        throw new Error(typeof corps.error === 'string' ? corps.error : echec);
      }
      await charger();
    } catch (e) {
      setErreur(e instanceof Error && e.message ? e.message : echec);
    }
  }

  const decider = (userId: string, decision: DecisionProfil) =>
    envoyer(`/api/admin/profils-a-verifier/${userId}`, { method: 'PUT', body: JSON.stringify({ decision }) }, 'La décision n’a pas été enregistrée. Réessaie.');
  const rien = (userIds: string[]) =>
    envoyer('/api/admin/indices/rien', { method: 'POST', body: JSON.stringify({ userIds }) }, 'La décision n’a pas été enregistrée. Réessaie.');
  const doublon = (orphelinId: string, gardeId: string) =>
    envoyer('/api/admin/indices/doublon', { method: 'POST', body: JSON.stringify({ orphelinId, gardeId }) }, 'La suppression n’a pas abouti. Réessaie.');

  const rattraper = async () => {
    setAnalyse({ enCours: true, profils: 0, fini: false });
    let apres: string | null = null;
    let total = 0;
    try {
      do {
        const res: Response = await fetch('/api/admin/profils-a-verifier/analyse', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(apres ? { apres } : {}),
        });
        if (!res.ok) throw new Error();
        const lot: { profils: number; suivant: string | null } = await res.json();
        total += lot.profils;
        apres = lot.suivant;
        setAnalyse({ enCours: true, profils: total, fini: false });
      } while (apres);
      setAnalyse({ enCours: false, profils: total, fini: true });
      await charger();
    } catch {
      setAnalyse({ enCours: false, profils: total, fini: false });
      setErreur('L’analyse s’est arrêtée en route. Relance-la : elle reprend sans rien refaire en double.');
    }
  };

  const pages = data ? Math.max(1, Math.ceil(data.total / data.parPage)) : 1;

  return (
    <div className="min-w-0">
      <h1 className="mb-1 text-2xl font-bold text-content">Indices</h1>
      <p className="mb-5 max-w-reading text-sm text-muted">
        Les comptes qui portent un indice non tranché. Les comptes reliés entre eux sont regroupés, avec la raison du
        rapprochement. Les plus douteux sont en tête. Les indices ne décident rien : c’est toi qui tranches, et chaque
        décision est journalisée.
      </p>

      <div role="group" aria-label="Filtrer les grappes" className="mb-5 flex flex-wrap gap-2">
        {FILTRES.map((f) => (
          <button
            key={f.valeur}
            type="button"
            aria-pressed={filtre === f.valeur}
            onClick={() => allerA(f.valeur)}
            className={`inline-flex min-h-11 items-center gap-2 rounded-full border px-4 text-sm font-medium focus:outline-none focus-visible:ring-2 focus-visible:ring-coral ${filtre === f.valeur ? 'border-coral bg-coral text-white' : 'border-hairline-strong bg-surface text-content hover:bg-sunken'}`}
          >
            {f.libelle}
            {data && <span className="tabular-nums opacity-85">{data.compteurs[f.valeur]}</span>}
          </button>
        ))}
      </div>

      {erreur && <div role="alert" className="mb-3 rounded-md bg-red-50 p-2 text-sm text-red-700 dark:bg-red-900/30 dark:text-red-400">{erreur}</div>}

      {loading && !data ? (
        <p className="text-muted">Chargement…</p>
      ) : !data || data.grappes.length === 0 ? (
        <p className="rounded-card border border-dashed border-hairline-strong px-4 py-10 text-center text-muted">
          {filtre === 'tous' ? 'Aucun indice à examiner pour le moment.' : 'Aucune grappe ne correspond à ce filtre.'}
        </p>
      ) : (
        <div className="flex flex-col gap-4">
          {data.grappes.map((g) => (
            <GrappeCard key={g.id} g={g} onDecision={decider} onRien={rien} onDoublon={doublon} />
          ))}
        </div>
      )}

      {pages > 1 && (
        <nav aria-label="Pages" className="mt-5 flex items-center justify-center gap-3">
          <Button type="button" size="sm" variant="secondary" disabled={page <= 1} onClick={() => allerA(filtre, page - 1)}>Précédente</Button>
          <span className="text-sm tabular-nums text-muted">Page {page} sur {pages}</span>
          <Button type="button" size="sm" variant="secondary" disabled={page >= pages} onClick={() => allerA(filtre, page + 1)}>Suivante</Button>
        </nav>
      )}

      <div className="mt-8 flex flex-wrap items-center gap-3 rounded-card border border-hairline bg-surface p-4">
        <Button type="button" size="sm" variant="secondary" loading={analyse.enCours} disabled={analyse.enCours} onClick={() => void rattraper()}>
          Analyser les profils existants
        </Button>
        <span className="text-sm text-muted" aria-live="polite">
          {analyse.enCours
            ? `Analyse en cours : ${analyse.profils} profils lus.`
            : analyse.fini
              ? `Analyse terminée : ${analyse.profils} profils lus.`
              : 'Lit le pseudo, la bio et les photos des profils créés avant la détection.'}
        </span>
      </div>
    </div>
  );
}

export default function AdminIndicesPage() {
  return (
    <Suspense fallback={<p className="text-muted">Chargement…</p>}>
      <Indices />
    </Suspense>
  );
}
