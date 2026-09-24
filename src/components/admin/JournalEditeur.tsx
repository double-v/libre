'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import Alert from '@/components/ui/Alert';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import TexteJournal from '@/components/journal/TexteJournal';
import { REGLES_EDITORIALES } from '@/lib/journal/regles';

/**
 * Écran de rédaction du journal (spec 007, US2 + US3 ; maquette T014, écran 4).
 *
 * Il **aide** à relire — règles toujours visibles, alertes calculées par le
 * serveur, levée extrait par extrait, case « J'ai relu les règles » — mais ne
 * décide rien : `publier` recontrôle le texte reçu. Sa seule exigence propre
 * est de ne jamais activer « Publier » sur un texte que le serveur refusera,
 * d'où le verrou tant que la vérification ne porte pas sur le texte affiché.
 */

export interface AlerteEditeur {
  regle: string;
  motif: string;
  description: string;
  extrait: string;
  bloquante: boolean;
  empreinte: string;
}

export interface PostEditeur {
  id: string;
  titre: string;
  corps: string;
  statut: string;
  publieeAt: string | null;
  slug: string | null;
}

const DELAI_CONTROLE_MS = 400;
const cle = (titre: string, corps: string) => `${titre}\u0000${corps}`;

export default function JournalEditeur({ initial, onCree, onEnregistre, onSupprime }: {
  initial?: PostEditeur;
  onCree?: (id: string) => void;
  onEnregistre?: (post: PostEditeur) => void;
  onSupprime?: () => void;
}) {
  const [titre, setTitre] = useState(initial?.titre ?? '');
  const [corps, setCorps] = useState(initial?.corps ?? '');
  const [onglet, setOnglet] = useState<'ecrire' | 'apercu'>('ecrire');
  const [alertes, setAlertes] = useState<AlerteEditeur[]>([]);
  const [verifie, setVerifie] = useState<string | null>(null);
  const [levees, setLevees] = useState<Set<string>>(new Set());
  const [relues, setRelues] = useState(false);
  const [occupe, setOccupe] = useState(false);
  const [message, setMessage] = useState<{ ton: 'error' | 'success'; texte: string } | null>(null);
  const [confirmerSuppression, setConfirmerSuppression] = useState(false);
  const requete = useRef(0);

  const enLigne = initial?.statut === 'publiee';
  const courant = cle(titre, corps);
  const aJour = verifie === courant;

  function appliquerAlertes(recues: AlerteEditeur[]) {
    setAlertes(recues);
    // Une levée ne survit que si son extrait existe encore (FR-019).
    setLevees((avant) => new Set(recues.filter((a) => avant.has(a.empreinte)).map((a) => a.empreinte)));
  }

  // Contrôle à chaque arrêt de frappe. Seule la dernière réponse compte : une
  // réponse lente pour un ancien texte ne doit pas valider le texte actuel.
  useEffect(() => {
    if (!titre.trim() || !corps.trim()) return;
    const n = ++requete.current;
    const minuterie = setTimeout(async () => {
      try {
        const res = await fetch('/api/admin/journal/controle', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ titre, corps }),
        });
        if (!res.ok || n !== requete.current) return;
        const { alertes: recues } = (await res.json()) as { alertes: AlerteEditeur[] };
        appliquerAlertes(recues);
        setVerifie(cle(titre, corps));
      } catch {
        // Hors ligne : « Publier » reste verrouillé, rien de plus à dire ici.
      }
    }, verifie === null ? 0 : DELAI_CONTROLE_MS);
    return () => clearTimeout(minuterie);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- relancé sur le texte seulement
  }, [titre, corps]);

  const bloquantes = alertes.filter((a) => a.bloquante);
  const aLever = alertes.filter((a) => !a.bloquante);
  const peutPublier = aJour && !occupe && bloquantes.length === 0 && aLever.every((a) => levees.has(a.empreinte)) && relues;

  const regles = useMemo(() => new Map(REGLES_EDITORIALES.map((r, i) => [r.id, i + 1])), []);

  async function appeler(url: string, method: string, body?: unknown) {
    const res = await fetch(url, {
      method,
      headers: body ? { 'Content-Type': 'application/json' } : undefined,
      body: body ? JSON.stringify(body) : undefined,
    });
    const data = res.status === 204 ? {} : await res.json().catch(() => ({}));
    return { res, data: data as { post?: PostEditeur; error?: string; alertes?: AlerteEditeur[] } };
  }

  async function enregistrer() {
    setOccupe(true);
    setMessage(null);
    try {
      const { res, data } = initial
        ? await appeler(`/api/admin/journal/${initial.id}`, 'PUT', { titre, corps })
        : await appeler('/api/admin/journal', 'POST', { titre, corps });
      if (!res.ok || !data.post) return setMessage({ ton: 'error', texte: data.error ?? 'Enregistrement impossible, réessaie.' });
      setMessage({ ton: 'success', texte: 'Brouillon enregistré.' });
      if (initial) onEnregistre?.(data.post);
      else onCree?.(data.post.id);
    } finally {
      setOccupe(false);
    }
  }

  async function publier() {
    setOccupe(true);
    setMessage(null);
    try {
      let id = initial?.id;
      if (!id) {
        const cree = await appeler('/api/admin/journal', 'POST', { titre, corps });
        if (!cree.res.ok || !cree.data.post) return setMessage({ ton: 'error', texte: cree.data.error ?? 'Enregistrement impossible, réessaie.' });
        id = cree.data.post.id;
      }
      const { res, data } = await appeler(`/api/admin/journal/${id}/publier`, 'POST', {
        titre, corps, levees: [...levees], reglesRelues: relues,
      });
      if (!res.ok || !data.post) {
        if (data.alertes) {
          appliquerAlertes(data.alertes);
          setVerifie(courant);
        }
        return setMessage({ ton: 'error', texte: data.error ?? 'Publication impossible, réessaie.' });
      }
      setRelues(false);
      setMessage({ ton: 'success', texte: 'Publié.' });
      if (initial) onEnregistre?.(data.post);
      else onCree?.(data.post.id);
    } finally {
      setOccupe(false);
    }
  }

  async function depublier() {
    if (!initial) return;
    setOccupe(true);
    setMessage(null);
    try {
      const { res, data } = await appeler(`/api/admin/journal/${initial.id}/depublier`, 'POST');
      if (!res.ok || !data.post) return setMessage({ ton: 'error', texte: data.error ?? 'Dépublication impossible, réessaie.' });
      setMessage({ ton: 'success', texte: 'Retirée de la page publique.' });
      onEnregistre?.(data.post);
    } finally {
      setOccupe(false);
    }
  }

  async function supprimer() {
    if (!initial) return;
    setOccupe(true);
    try {
      const { res, data } = await appeler(`/api/admin/journal/${initial.id}`, 'DELETE');
      if (!res.ok) return setMessage({ ton: 'error', texte: data.error ?? 'Suppression impossible, réessaie.' });
      onSupprime?.();
    } finally {
      setOccupe(false);
      setConfirmerSuppression(false);
    }
  }

  const ongletClasse = (actif: boolean) =>
    `-mb-px inline-flex min-h-11 items-center border-b-2 px-3.5 text-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-coral ${
      actif ? 'border-coral font-semibold text-content' : 'border-transparent text-muted hover:text-content'
    }`;

  return (
    <div className="grid items-start gap-4 lg:grid-cols-[minmax(0,1fr)_300px]">
      <div className="grid min-w-0 gap-3.5">
        <div role="tablist" aria-label="Mode" className="flex gap-1 border-b border-hairline">
          <button type="button" role="tab" aria-selected={onglet === 'ecrire'} onClick={() => setOnglet('ecrire')} className={ongletClasse(onglet === 'ecrire')}>Écrire</button>
          <button type="button" role="tab" aria-selected={onglet === 'apercu'} onClick={() => setOnglet('apercu')} className={ongletClasse(onglet === 'apercu')}>Aperçu</button>
        </div>

        {onglet === 'ecrire' ? (
          <div role="tabpanel" className="grid gap-3.5">
            <Input label="Titre" value={titre} maxLength={120} onChange={(e) => setTitre(e.target.value)} />
            <Input
              label="Texte"
              multiline
              rows={12}
              value={corps}
              maxLength={20000}
              onChange={(e) => setCorps(e.target.value)}
              hint="Ligne vide = paragraphe · « - » = liste · **gras** · *italique* · [texte](lien)"
            />
          </div>
        ) : (
          <div role="tabpanel" className="rounded-xl border border-hairline bg-background p-5">
            <span className="mb-2 block text-2xl font-extrabold tracking-tight text-content">{titre || 'Sans titre'}</span>
            <TexteJournal corps={corps} />
            <span className="mt-6 block border-t border-hairline pt-3 text-sm text-muted">L’équipe Libre</span>
          </div>
        )}

        <section aria-live="polite" aria-label="Alertes avant publication" className="grid gap-2">
          {!aJour ? (
            <span className="text-sm text-muted">{titre.trim() && corps.trim() ? 'Vérification du texte…' : 'Écris un titre et un texte.'}</span>
          ) : alertes.length === 0 ? (
            <span className="text-sm text-muted">Aucune alerte sur ce texte.</span>
          ) : (
            <span className="text-sm font-semibold text-content">
              {alertes.length === 1 ? '1 alerte avant publication' : `${alertes.length} alertes avant publication`}
            </span>
          )}
          {aJour && alertes.map((a) => (
            <Alert key={a.empreinte} variant={a.bloquante ? 'error' : 'warning'} title={a.description}>
              <span className="block">
                Règle {regles.get(a.regle)} · <code className="break-all rounded bg-fill-subtle px-1 font-mono text-sm">{a.extrait}</code>
              </span>
              {a.bloquante ? (
                <span className="mt-1 block">Retire-le du texte pour pouvoir publier.</span>
              ) : (
                <label className="mt-1 flex min-h-11 cursor-pointer items-center gap-2 font-semibold">
                  <input
                    type="checkbox"
                    className="h-5 w-5 accent-coral"
                    checked={levees.has(a.empreinte)}
                    onChange={(e) => setLevees((avant) => {
                      const s = new Set(avant);
                      if (e.target.checked) s.add(a.empreinte);
                      else s.delete(a.empreinte);
                      return s;
                    })}
                  />
                  Je maintiens cet extrait
                </label>
              )}
            </Alert>
          ))}
          <span className="text-xs text-muted">Le contrôle aide à relire, il ne remplace pas ta relecture.</span>
        </section>

        {message && <Alert variant={message.ton} onDismiss={() => setMessage(null)}>{message.texte}</Alert>}

        <div className="flex flex-wrap items-center justify-between gap-2 border-t border-hairline pt-3.5">
          <label className="flex min-h-11 cursor-pointer items-center gap-2.5 text-sm font-semibold text-content">
            <input type="checkbox" className="h-5 w-5 accent-coral" checked={relues} onChange={(e) => setRelues(e.target.checked)} />
            J’ai relu les règles
          </label>
          <div className="flex flex-wrap gap-2">
            {enLigne ? (
              <Button variant="secondary" onClick={() => void depublier()} disabled={occupe}>Dépublier</Button>
            ) : (
              <Button variant="secondary" onClick={() => void enregistrer()} disabled={occupe || !titre.trim() || !corps.trim()}>
                Enregistrer le brouillon
              </Button>
            )}
            <Button variant="primary" onClick={() => void publier()} disabled={!peutPublier}>
              {enLigne ? 'Publier les modifications' : 'Publier'}
            </Button>
          </div>
        </div>

        {initial && !initial.publieeAt && (
          <div className="flex flex-wrap items-center gap-2">
            {confirmerSuppression ? (
              <>
                <span className="text-sm text-content">Supprimer ce brouillon pour de bon ?</span>
                <Button variant="danger" size="sm" onClick={() => void supprimer()} disabled={occupe}>Supprimer</Button>
                <Button variant="ghost" size="sm" onClick={() => setConfirmerSuppression(false)}>Annuler</Button>
              </>
            ) : (
              <Button variant="ghost" size="sm" onClick={() => setConfirmerSuppression(true)}>Supprimer le brouillon</Button>
            )}
          </div>
        )}
      </div>

      <aside aria-label="Règles éditoriales" className="grid gap-2.5 rounded-xl border border-hairline bg-surface p-3.5">
        <span className="text-base font-semibold text-content">Avant de publier</span>
        <span className="text-sm font-semibold text-coral dark:text-coral-light">On dit ce que le membre y gagne, jamais comment ça marche.</span>
        <ol className="grid list-decimal gap-2.5 pl-4 text-sm leading-snug text-content">
          {REGLES_EDITORIALES.map((r) => (
            <li key={r.id}>
              <span className="font-semibold">{r.enonce}</span>
              <span className="mt-1 block text-muted"><s>{r.aEviter}</s></span>
              <span className="block text-muted">→ {r.plutot}</span>
            </li>
          ))}
        </ol>
      </aside>
    </div>
  );
}
