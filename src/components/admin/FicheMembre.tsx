'use client';

import { useCallback, useEffect, useState, type ReactNode } from 'react';
import AdminPhotoSearch from '@/components/AdminPhotoSearch';
import AdminVerificationCard, { type Decision } from '@/components/AdminVerificationCard';
import AdminUserKeyState from '@/components/admin/AdminUserKeyState';
import BottomSheet, { MembreVerra } from '@/components/ui/BottomSheet';
import Button from '@/components/ui/Button';
import CaseTag from '@/components/ui/CaseTag';
import { GRAVITE } from '@/lib/moderation/cas';
import type { CasFiche, FicheMembre as Fiche } from '@/lib/moderation/fiche';
import {
  CODES_MOTIFS_SANCTION, GESTES, MOTIFS_LEVER_VOILE, MOTIFS_PHOTO, MOTIFS_SANCTION, repereDuCas,
  type CodeGeste, type MotifSanction,
} from '@/lib/moderation/reperes';
import { duree, ilYa, vuLe } from '@/lib/moderation/temps';
import { SENSITIVITY_LABELS, SENSITIVITY_LEVELS, type SensitivityLevel } from '@/lib/photo-sensitivity';
import { toast } from '@/lib/toast';
import CaseCard from './CaseCard';
import { Avatar, FiabiliteTag, StatutTag } from './MembreRow';

/**
 * Fiche d'un membre (spec 012, US4 ; DESIGN.md « Hub Membres »).
 *
 * Sections dans l'ordre de FR-019 : identité, cas, fiabilité, photos,
 * historique, autres gestes, zone sensible repliée. Chaque geste passe par la
 * route unitaire existante (lot 2) : même effet, même ligne de journal que
 * les anciennes pages (FR-023). Les gestes à confirmer ouvrent une feuille qui
 * dit ce que le membre verra (FR-021) ; bannir et supprimer exigent un motif
 * de la liste fermée (FR-022), et supprimer la ressaisie du pseudo (FR-S11).
 */

type Feuille =
  | { geste: 'avertir'; reportId: string }
  | { geste: 'bannir'; reportId: string | null }
  | { geste: 'retirer_reponse'; answerId: string; question: string }
  | { geste: 'retirer_photo'; cle: string }
  | { geste: 'voiler'; cle: string }
  | { geste: 'lever_voile'; cle: string }
  | { geste: 'supprimer_doublon'; orphelin: { id: string; pseudo: string } }
  | { geste: 'mettre_en_retrait' }
  | { geste: 'supprimer' };

const JSON_ENTETES = { 'Content-Type': 'application/json' };
const ECHEC = 'Le geste n’a pas abouti. Recharge la fiche et réessaie.';

function Panneau({ titre, children, extra }: { titre: ReactNode; children: ReactNode; extra?: ReactNode }) {
  return (
    <section className="grid min-w-0 content-start gap-2.5 rounded-card border border-hairline bg-surface p-3.5">
      <h2 className="flex items-baseline justify-between gap-2 text-[11px] font-semibold uppercase tracking-[0.07em] text-muted">
        <span className="flex flex-wrap items-center gap-2">{titre}</span>
        {extra}
      </h2>
      {children}
    </section>
  );
}

function Citation({ children }: { children: ReactNode }) {
  return <div className="whitespace-pre-line break-words rounded-lg bg-sunken px-3.5 py-3 text-sm leading-relaxed text-content">{children}</div>;
}

export default function FicheMembre({
  id,
  onRetour,
  onChange,
  onOuvrir,
}: {
  id: string;
  onRetour: () => void;
  /** Un geste a été appliqué : la liste se recharge. */
  onChange: () => void;
  onOuvrir: (id: string) => void;
}) {
  const [fiche, setFiche] = useState<Fiche | null>(null);
  const [etat, setEtat] = useState<'chargement' | 'pret' | 'introuvable' | 'erreur'>('chargement');
  const [erreur, setErreur] = useState('');
  const [feuille, setFeuille] = useState<Feuille | null>(null);
  const [occupe, setOccupe] = useState(false);
  const [cle, setCle] = useState(false);
  const maintenant = new Date();

  const charger = useCallback(async () => {
    try {
      const res = await fetch(`/api/admin/membres/${id}`);
      if (res.status === 404) {
        setEtat('introuvable');
        return;
      }
      if (!res.ok) throw new Error();
      setFiche(await res.json());
      setEtat('pret');
    } catch {
      setEtat('erreur');
    }
  }, [id]);

  useEffect(() => {
    void (async () => {
      setEtat('chargement');
      setErreur('');
      setFeuille(null);
      await charger();
    })();
  }, [charger]);

  /** Envoie un geste à sa route unitaire, puis recharge la fiche et la liste. */
  const agir = useCallback(
    async (url: string, init: RequestInit, succes: string): Promise<boolean> => {
      setOccupe(true);
      setErreur('');
      try {
        const res = await fetch(url, { headers: JSON_ENTETES, ...init });
        if (!res.ok) {
          const corps = (await res.json().catch(() => null)) as { error?: string } | null;
          setErreur(corps?.error ?? ECHEC);
          return false;
        }
        toast(succes);
        setFeuille(null);
        onChange();
        await charger();
        return true;
      } catch {
        setErreur(ECHEC);
        return false;
      } finally {
        setOccupe(false);
      }
    },
    [charger, onChange],
  );

  if (etat === 'chargement' && !fiche) {
    return <div className="grid gap-3.5 py-3.5" aria-busy="true"><BoutonRetour onRetour={onRetour} /><span className="text-sm text-muted">Chargement de la fiche…</span></div>;
  }
  if (etat === 'introuvable') {
    return (
      <div className="grid gap-3.5 py-3.5">
        <BoutonRetour onRetour={onRetour} />
        <Vide titre="Ce membre n’existe plus" texte="Son compte a été supprimé. Choisis un autre membre dans la liste." />
      </div>
    );
  }
  if (etat === 'erreur' || !fiche) {
    return (
      <div className="grid gap-3.5 py-3.5">
        <BoutonRetour onRetour={onRetour} />
        <div role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-900/30 dark:text-red-300">La fiche n’a pas pu être chargée. Vérifie ta connexion, puis réessaie.</div>
        <div><Button pill variant="secondary" onClick={() => void charger()}>Réessayer</Button></div>
      </div>
    );
  }

  const m = fiche.membre;
  const uid = m.id;
  const pseudo = m.pseudo;
  const decisionProfil = (decision: 'rien' | 'verification', succes: string) =>
    agir(`/api/admin/profils-a-verifier/${uid}`, { method: 'PUT', body: JSON.stringify({ decision }) }, succes);
  const signalement = (reportId: string, action: 'DISMISS_REPORT' | 'WARNING' | 'BAN', succes: string, reason?: string) =>
    agir(`/api/admin/reports/${reportId}`, { method: 'PATCH', body: JSON.stringify({ action, reason }) }, succes);
  const inviter = () => agir(`/api/admin/users/${uid}/invitation`, { method: 'POST' }, `${pseudo} : invitation au selfie envoyée.`);
  const decision = (verificationId: string) => async (d: Decision) => {
    await agir(
      `/api/admin/verifications/${verificationId}`,
      { method: 'PATCH', body: JSON.stringify(d) },
      d.action === 'APPROVE_VERIFICATION' ? `${pseudo} : badge vérifié.` : `${pseudo} : selfie refusé.`,
    );
  };
  const bouton = (code: CodeGeste, onClick: () => void, variant: 'secondary' | 'success' | 'danger' | 'danger-outline' = 'secondary') => (
    <Button key={code} pill size="md" variant={variant} disabled={occupe} onClick={onClick}>
      {GESTES[code].libelle}
    </Button>
  );

  const titreCas = (c: CasFiche): string => {
    if (c.type === 'report') return c.motifLibelle;
    if (c.type === 'verif') return 'Selfie à vérifier';
    if (c.type === 'photo') return 'Photo à revoir';
    return c.doublon ? 'Doublon probable' : 'Indice';
  };

  function corpsCas(c: CasFiche): { corps: ReactNode; gestes: ReactNode; repere: string } {
    if (c.type === 'report') {
      return {
        repere: repereDuCas({ type: 'report', motif: c.motif }),
        corps: (
          <>
            {c.description ? <Citation>{c.description}</Citation> : <span className="text-sm text-muted">Le signalement ne porte aucun texte.</span>}
            <span className="text-xs text-muted">
              {c.enAttente} signalement{c.enAttente > 1 ? 's' : ''} en attente pour ce membre · signalé par {c.auteur}
            </span>
            {c.reponsesAuMoment.length > 0 && (
              <details className="text-sm">
                <summary className="flex min-h-11 cursor-pointer items-center text-xs font-semibold uppercase tracking-[0.06em] text-muted">Ses réponses au moment du signalement</summary>
                <ul className="grid gap-2">
                  {c.reponsesAuMoment.map((r, i) => (
                    <li key={i} className="grid gap-1"><span className="text-xs text-muted">{r.question}</span><Citation>{[...r.choix, r.texte].filter(Boolean).join(' · ')}</Citation></li>
                  ))}
                </ul>
              </details>
            )}
          </>
        ),
        gestes: (
          <>
            {bouton('sans_suite', () => void signalement(c.id, 'DISMISS_REPORT', `${pseudo} : signalement classé sans suite.`))}
            {bouton('avertir', () => setFeuille({ geste: 'avertir', reportId: c.id }))}
            {m.statut !== 'banni' && !m.admin && bouton('bannir', () => setFeuille({ geste: 'bannir', reportId: c.id }), 'danger')}
          </>
        ),
      };
    }
    if (c.type === 'verif') {
      return {
        repere: repereDuCas({ type: 'verif' }),
        corps: <AdminVerificationCard bare v={c.verification} onDecision={decision(c.verification.id)} />,
        gestes: null,
      };
    }
    if (c.type === 'photo') {
      return {
        repere: repereDuCas({ type: 'photo' }),
        corps: (
          <div className="grid grid-cols-[minmax(0,160px)_minmax(0,1fr)] gap-2">
            {/* eslint-disable-next-line @next/next/no-img-element -- proxy des photos, dérogation admin tracée */}
            <img src={c.url} alt={`Photo de ${pseudo} à revoir`} className="aspect-[4/5] w-full rounded-lg bg-sunken object-cover" />
            <div className="grid content-start gap-1.5">
              <span className="text-[11px] font-semibold uppercase tracking-[0.07em] text-muted">Texte lu sur l’image</span>
              <span className="break-words rounded-lg bg-sunken px-3 py-2 font-mono text-xs text-content">{c.texteLu ?? 'Aucun texte conservé.'}</span>
            </div>
          </div>
        ),
        gestes: (
          <>
            {bouton('garder', () => void decisionProfil('rien', `${pseudo} : photo gardée, indices archivés.`), 'success')}
            {bouton('voiler', () => setFeuille({ geste: 'voiler', cle: c.cle }))}
            {bouton('retirer_photo', () => setFeuille({ geste: 'retirer_photo', cle: c.cle }), 'danger-outline')}
          </>
        ),
      };
    }
    const disparus = c.lies.filter((l) => !l.existe).length;
    return {
      repere: repereDuCas({ type: 'indice', doublon: !!c.doublon }),
      corps: (
        <>
          <Citation>
            {fiche!.signaux.filter((s) => s.type !== 'contact_photo').map((s) => s.libelle).join(' · ') || 'Indices non tranchés.'}
          </Citation>
          {c.lies.filter((l) => l.existe).map((l) => (
            <button
              key={l.id}
              type="button"
              onClick={() => onOuvrir(l.id)}
              className="grid min-h-16 w-full grid-cols-[40px_minmax(0,1fr)_auto] items-center gap-2.5 rounded-lg border border-hairline px-2.5 py-2 text-left hover:bg-sunken/60 focus-visible:outline-none focus-visible:shadow-focus"
            >
              <Avatar src={null} pseudo={l.pseudo ?? '?'} />
              <span className="min-w-0">
                <span className="block truncate text-sm font-semibold text-content">{l.pseudo}</span>
                <span className="block text-xs text-muted">Compte lié · {l.confirme ? 'e-mail confirmé' : 'e-mail jamais confirmé'}</span>
              </span>
              <span aria-hidden="true" className="text-muted">›</span>
            </button>
          ))}
          {disparus > 0 && (
            <span className="text-xs text-muted">
              {disparus === 1 ? 'Un compte lié a déjà été supprimé.' : `${disparus} comptes liés ont déjà été supprimés.`} Tu peux trancher « rien à signaler ».
            </span>
          )}
        </>
      ),
      gestes: c.doublon ? (
        <>
          <Button pill variant="danger-outline" disabled={occupe} onClick={() => setFeuille({ geste: 'supprimer_doublon', orphelin: c.doublon! })}>
            Supprimer {c.doublon.pseudo}…
          </Button>
          {bouton('rien', () => void decisionProfil('rien', `${pseudo} : indices archivés.`))}
        </>
      ) : (
        <>
          {!m.verifie && !m.invitation && bouton('inviter', () => void inviter())}
          {bouton('rien', () => void decisionProfil('rien', `${pseudo} : indices archivés.`))}
        </>
      ),
    };
  }

  return (
    <div className="grid min-w-0 content-start gap-3.5 py-3.5">
      <BoutonRetour onRetour={onRetour} />

      <div className="flex flex-wrap items-center gap-3">
        <Avatar src={fiche.photos[0]?.url ?? null} pseudo={pseudo} taille={56} />
        <div className="grid min-w-0 gap-1">
          <h1 className="break-words text-[22px] font-semibold leading-tight text-content">{pseudo}</h1>
          <span className="text-xs text-muted">
            Inscrit {ilYa(m.inscritAt, maintenant)} · {vuLe(m.vuLe, maintenant)} · {fiche.photos.length} photo{fiche.photos.length > 1 ? 's' : ''}
          </span>
          <span className="break-all text-xs text-muted">{m.email}</span>
          <span className="flex flex-wrap gap-1">
            {m.verifie ? <CaseTag variant="ok">Vérifié</CaseTag> : <CaseTag>Non vérifié</CaseTag>}
            {m.admin && <CaseTag variant="info">Admin</CaseTag>}
            <StatutTag statut={m.statut} />
            <FiabiliteTag niveau={m.fiabilite} />
          </span>
        </div>
      </div>

      {erreur && <div role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-900/30 dark:text-red-300">{erreur}</div>}

      {fiche.cas.length === 0 ? (
        <Panneau titre="À traiter"><span className="text-sm text-muted">Aucun geste en attente pour ce membre.</span></Panneau>
      ) : (
        fiche.cas.map((c) => {
          const { corps, gestes, repere } = corpsCas(c);
          return (
            <CaseCardFiche key={`${c.type}:${c.id}`} c={c} titre={titreCas(c)} age={`il y a ${duree(c.depuis, maintenant)}`} repere={repere} gestes={gestes}>
              {corps}
            </CaseCardFiche>
          );
        })
      )}

      <div className="grid gap-3 min-[640px]:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)]">
        <div className="grid min-w-0 content-start gap-3">
          {fiche.signaux.length > 0 && (
            <Panneau titre={<>Indice de fiabilité <FiabiliteTag niveau={m.fiabilite} /></>}>
              <div className="flex flex-wrap gap-1.5">
                {fiche.signaux.map((s, i) => (
                  <span key={i} className="rounded-full bg-amber-50 px-2 py-0.5 text-xs text-amber-800 dark:bg-amber-900/30 dark:text-amber-300" title={s.legitimePossible ?? undefined}>
                    {s.libelle}
                  </span>
                ))}
              </div>
              <span className="text-xs text-muted">Le niveau est calculé, jamais montré au membre.</span>
            </Panneau>
          )}
          {fiche.photos.length > 0 && (
            <Panneau titre="Photos publiées">
              <div className="grid grid-cols-[repeat(auto-fill,minmax(100px,1fr))] gap-2">
                {fiche.photos.map((p, i) => (
                  <figure key={p.cle} className="m-0 grid gap-1.5">
                    <div className="relative">
                      {/* eslint-disable-next-line @next/next/no-img-element -- proxy des photos, dérogation admin tracée */}
                      <img src={p.url} alt={`Photo ${i + 1} de ${pseudo}`} className="aspect-[4/5] w-full rounded-lg bg-sunken object-cover" />
                      <span className="absolute left-1.5 top-1.5 flex flex-wrap gap-1">
                        {i === 0 && <CaseTag variant="info">Principale</CaseTag>}
                        {p.voile && <CaseTag variant="warn">Voilée</CaseTag>}
                      </span>
                    </div>
                    <AdminPhotoSearch cle={p.cle} />
                    <div className="flex flex-wrap gap-1.5">
                      {p.voile
                        ? <Button pill size="sm" variant="secondary" disabled={occupe} onClick={() => setFeuille({ geste: 'lever_voile', cle: p.cle })}>Lever le voile…</Button>
                        : <Button pill size="sm" variant="secondary" disabled={occupe} onClick={() => setFeuille({ geste: 'voiler', cle: p.cle })}>Voiler…</Button>}
                      <Button pill size="sm" variant="danger-outline" disabled={occupe} onClick={() => setFeuille({ geste: 'retirer_photo', cle: p.cle })}>Retirer…</Button>
                    </div>
                  </figure>
                ))}
              </div>
            </Panneau>
          )}
          {fiche.reponses.length > 0 && (
            <Panneau titre="Réponses publiées">
              <ul className="grid gap-2.5">
                {fiche.reponses.map((r) => (
                  <li key={r.id} className="grid gap-1.5">
                    <span className="text-xs text-muted">{r.question}</span>
                    <Citation>{[...r.choix, r.texte].filter(Boolean).join(' · ')}</Citation>
                    <div>
                      <Button pill size="sm" variant="danger-outline" disabled={occupe} onClick={() => setFeuille({ geste: 'retirer_reponse', answerId: r.id, question: r.question })}>
                        {GESTES.retirer_reponse.libelle}…
                      </Button>
                    </div>
                  </li>
                ))}
              </ul>
            </Panneau>
          )}
        </div>

        <div className="grid min-w-0 content-start gap-3">
          <Panneau titre="Historique">
            <ul className="m-0 list-none p-0">
              {fiche.historique.map((h, i) => (
                <li key={i} className="grid grid-cols-[86px_minmax(0,1fr)] gap-2.5 border-b border-hairline py-1.5 text-[13px] last:border-b-0">
                  <span className="pt-0.5 text-[11px] font-medium text-muted">{ilYa(h.at, maintenant)}</span>
                  <span className="min-w-0 break-words text-content">
                    {h.libelle}{h.motif ? ` : ${h.motif}` : ''}{' '}
                    <span className="text-xs text-muted">· {h.auteur === 'automatique' ? 'automatique' : `par ${h.auteur}`}</span>
                  </span>
                </li>
              ))}
            </ul>
          </Panneau>

          <Panneau titre="Autres gestes">
            <div className="flex flex-wrap gap-2">
              {!m.verifie && !m.invitation && bouton('inviter', () => void inviter())}
              {m.statut === 'masque'
                ? bouton('rendre_visible', () => void decisionProfil('rien', `${pseudo} : de nouveau visible.`))
                : m.statut !== 'banni' && bouton('mettre_en_retrait', () => setFeuille({ geste: 'mettre_en_retrait' }))}
              {m.statut === 'banni' && bouton('debannir', () => void agir(`/api/admin/users/${uid}`, { method: 'PATCH', body: JSON.stringify({ banned: false }) }, `${pseudo} : débanni.`))}
            </div>
            {m.invitation && !m.verifie && <span className="text-xs text-muted">Invité au selfie {ilYa(m.invitation, maintenant)}.</span>}
            {/* Montée seulement à l'ouverture : la consultation de la clé est
                journalisée (VIEW_KEY_STATE), elle ne doit pas l'être à chaque fiche. */}
            <details className="text-sm" onToggle={(e) => setCle((e.currentTarget as HTMLDetailsElement).open)}>
              <summary className="flex min-h-11 cursor-pointer items-center text-[13px] font-semibold text-muted">Messagerie chiffrée</summary>
              {cle && <AdminUserKeyState userId={uid} />}
            </details>
            <details className="text-sm">
              <summary className="flex min-h-11 cursor-pointer items-center text-[13px] font-semibold text-red-700 dark:text-red-300">Zone sensible</summary>
              <div className="flex flex-wrap gap-2">
                {m.statut !== 'banni' && !m.admin && bouton('bannir', () => setFeuille({ geste: 'bannir', reportId: null }), 'danger-outline')}
                {!m.admin && bouton('supprimer', () => setFeuille({ geste: 'supprimer' }), 'danger-outline')}
              </div>
            </details>
          </Panneau>
        </div>
      </div>

      {feuille && (
        <FeuilleGeste
          feuille={feuille}
          pseudo={pseudo}
          photos={fiche.photos.map((p) => p.cle)}
          occupe={occupe}
          erreur={erreur}
          onFermer={() => { setFeuille(null); setErreur(''); }}
          onConfirmer={async (f, choix) => {
            switch (f.geste) {
              case 'avertir':
                return void signalement(f.reportId, 'WARNING', `${pseudo} : avertissement inscrit à l’historique.`);
              case 'bannir': {
                const motif = MOTIFS_SANCTION[choix.motif as MotifSanction];
                return void (f.reportId
                  ? signalement(f.reportId, 'BAN', `${pseudo} : banni.`, motif)
                  : agir(`/api/admin/users/${uid}`, { method: 'PATCH', body: JSON.stringify({ banned: true, reason: motif }) }, `${pseudo} : banni.`));
              }
              case 'retirer_reponse':
                return void agir(`/api/admin/answers/${f.answerId}`, { method: 'PATCH', body: JSON.stringify({ status: 'removed' }) }, `${pseudo} : réponse retirée.`);
              case 'retirer_photo':
                return void agir(`/api/admin/users/${uid}/photos`, { method: 'DELETE', body: JSON.stringify({ photoKey: f.cle, reason: choix.motif }) }, `${pseudo} : photo retirée.`);
              case 'voiler':
                return void agir(`/api/admin/users/${uid}/photos/sensitivity`, { method: 'POST', body: JSON.stringify({ photoKey: f.cle, sensitivity: choix.niveau, reason: choix.motif }) }, `${pseudo} : photo voilée.`);
              case 'lever_voile':
                return void agir(`/api/admin/users/${uid}/photos/sensitivity`, { method: 'DELETE', body: JSON.stringify({ photoKey: f.cle, reason: choix.motif }) }, `${pseudo} : voile levé.`);
              case 'supprimer_doublon':
                return void agir('/api/admin/indices/doublon', { method: 'POST', body: JSON.stringify({ orphelinId: f.orphelin.id, gardeId: uid }) }, `${f.orphelin.pseudo} : doublon supprimé.`);
              case 'mettre_en_retrait':
                return void decisionProfil('verification', `${pseudo} : mis en retrait jusqu’au selfie.`);
              case 'supprimer': {
                setOccupe(true);
                setErreur('');
                try {
                  const res = await fetch(`/api/admin/membres/${uid}`, { method: 'DELETE', headers: JSON_ENTETES, body: JSON.stringify({ pseudo: choix.pseudo, motif: choix.motif }) });
                  if (!res.ok) {
                    setErreur(((await res.json().catch(() => null)) as { error?: string } | null)?.error ?? ECHEC);
                    return;
                  }
                  toast(`Le compte de ${pseudo} est supprimé.`);
                  setFeuille(null);
                  onChange();
                  onRetour();
                } catch {
                  setErreur(ECHEC);
                } finally {
                  setOccupe(false);
                }
              }
            }
          }}
        />
      )}
    </div>
  );
}

function CaseCardFiche({ c, titre, age, repere, gestes, children }: { c: CasFiche; titre: string; age: string; repere: string; gestes: ReactNode; children: ReactNode }) {
  return (
    <CaseCard type={c.type} gravite={GRAVITE[c.type]} titre={titre} age={age} repere={repere} gestes={gestes}>
      {children}
    </CaseCard>
  );
}

function BoutonRetour({ onRetour }: { onRetour: () => void }) {
  return (
    <button type="button" onClick={onRetour} className="flex min-h-11 items-center gap-1.5 justify-self-start p-0 font-semibold text-coral-dark focus-visible:outline-none focus-visible:shadow-focus dark:text-coral-light min-[900px]:hidden">
      ← Membres
    </button>
  );
}

export function Vide({ titre, texte }: { titre: string; texte: string }) {
  return (
    <div className="grid place-items-center gap-1.5 px-4 py-10 text-center text-muted">
      <strong className="text-lg font-semibold text-content">{titre}</strong>
      <span>{texte}</span>
    </div>
  );
}

interface Choix {
  motif: string;
  niveau: SensitivityLevel;
  pseudo: string;
}

const TITRES: Record<Feuille['geste'], (pseudo: string) => string> = {
  avertir: (p) => `Avertir ${p} ?`,
  bannir: (p) => `Bannir ${p} ?`,
  retirer_reponse: (p) => `Retirer la réponse de ${p} ?`,
  retirer_photo: (p) => `Retirer cette photo de ${p} ?`,
  voiler: (p) => `Voiler cette photo de ${p} ?`,
  lever_voile: (p) => `Lever le voile de cette photo de ${p} ?`,
  supprimer_doublon: () => 'Supprimer le doublon ?',
  mettre_en_retrait: (p) => `Mettre ${p} en retrait ?`,
  supprimer: (p) => `Supprimer le compte de ${p} ?`,
};

const ACTION: Record<Feuille['geste'], string> = {
  avertir: 'Avertir',
  bannir: 'Bannir',
  retirer_reponse: 'Retirer',
  retirer_photo: 'Retirer',
  voiler: 'Voiler',
  lever_voile: 'Lever le voile',
  supprimer_doublon: 'Supprimer',
  mettre_en_retrait: 'Mettre en retrait',
  supprimer: 'Supprimer',
};

function Options({ valeurs, choisie, onChoisir, libelle }: { valeurs: readonly string[]; choisie: string; onChoisir: (v: string) => void; libelle: (v: string) => string }) {
  return (
    <div className="grid gap-2">
      {valeurs.map((v) => (
        <button
          key={v}
          type="button"
          aria-pressed={choisie === v}
          onClick={() => onChoisir(v)}
          className={`grid min-h-[52px] gap-0.5 rounded-lg border px-3 py-2.5 text-left text-sm focus-visible:outline-none focus-visible:shadow-focus ${choisie === v ? 'border-coral bg-coral/10' : 'border-hairline bg-surface'}`}
        >
          <b className="font-semibold text-content">{libelle(v)}</b>
        </button>
      ))}
    </div>
  );
}

function FeuilleGeste({
  feuille,
  pseudo,
  photos,
  occupe,
  erreur,
  onFermer,
  onConfirmer,
}: {
  feuille: Feuille;
  pseudo: string;
  photos: string[];
  occupe: boolean;
  erreur: string;
  onFermer: () => void;
  onConfirmer: (f: Feuille, choix: Choix) => Promise<void>;
}) {
  const [choix, setChoix] = useState<Choix>({ motif: '', niveau: 'suggestive', pseudo: '' });
  const g = feuille.geste;
  const avecSanction = g === 'bannir' || g === 'supprimer';
  const motifs: readonly string[] | null = avecSanction ? CODES_MOTIFS_SANCTION : g === 'retirer_photo' || g === 'voiler' ? MOTIFS_PHOTO : g === 'lever_voile' ? MOTIFS_LEVER_VOILE : null;
  const pret = (!motifs || choix.motif !== '') && (g !== 'supprimer' || choix.pseudo === pseudo);
  const geste = g === 'supprimer_doublon' ? GESTES.supprimer_doublon : GESTES[g];

  return (
    <BottomSheet titre={TITRES[g](pseudo)} onClose={onFermer}>
      {g === 'supprimer_doublon' && (
        <span className="text-sm text-muted">Le compte {feuille.orphelin.pseudo}, jamais confirmé, sera supprimé. {pseudo} garde le sien.</span>
      )}
      {g === 'retirer_reponse' && <span className="text-sm text-muted">Question : {feuille.question}</span>}
      {g === 'retirer_photo' && photos[0] === feuille.cle && (
        <span className="text-sm text-muted">
          {photos.length > 1
            ? 'C’est sa photo principale, la seule que voient tous les membres : la suivante prendra sa place.'
            : 'C’est sa seule photo : son profil restera sans photo.'}
        </span>
      )}
      {g === 'voiler' && (
        <>
          <span className="text-[11px] font-semibold uppercase tracking-[0.07em] text-muted">Niveau</span>
          <Options valeurs={SENSITIVITY_LEVELS} choisie={choix.niveau} onChoisir={(v) => setChoix((c) => ({ ...c, niveau: v as SensitivityLevel }))} libelle={(v) => SENSITIVITY_LABELS[v as SensitivityLevel]} />
        </>
      )}
      {motifs && avecSanction && (
        <>
          <label className="text-[11px] font-semibold uppercase tracking-[0.07em] text-muted" htmlFor="motif-sanction">Motif, inscrit à l’historique</label>
          <select
            id="motif-sanction"
            value={choix.motif}
            onChange={(e) => setChoix((c) => ({ ...c, motif: e.target.value }))}
            className="min-h-[42px] w-full rounded-lg border border-hairline bg-surface px-3 text-sm text-content"
          >
            <option value="">Choisis un motif…</option>
            {CODES_MOTIFS_SANCTION.map((k) => <option key={k} value={k}>{MOTIFS_SANCTION[k]}</option>)}
          </select>
        </>
      )}
      {motifs && !avecSanction && (
        <>
          <span className="text-[11px] font-semibold uppercase tracking-[0.07em] text-muted">Motif, inscrit à l’historique</span>
          <Options valeurs={motifs} choisie={choix.motif} onChoisir={(v) => setChoix((c) => ({ ...c, motif: v }))} libelle={(v) => v} />
        </>
      )}
      {g === 'supprimer' && (
        <>
          <label className="text-[11px] font-semibold uppercase tracking-[0.07em] text-muted" htmlFor="pseudo-ressaisi">Pour confirmer, écris son pseudo : {pseudo}</label>
          <input
            id="pseudo-ressaisi"
            type="text"
            autoComplete="off"
            value={choix.pseudo}
            onChange={(e) => setChoix((c) => ({ ...c, pseudo: e.target.value }))}
            className="min-h-[42px] w-full rounded-lg border border-hairline bg-surface px-3 text-sm text-content"
          />
        </>
      )}
      <MembreVerra texte={geste.membreVerra} />
      {erreur && <div role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-900/30 dark:text-red-300">{erreur}</div>}
      <div className="flex flex-wrap gap-2">
        <Button pill variant="secondary" onClick={onFermer}>Annuler</Button>
        <Button pill variant="danger" loading={occupe} disabled={!pret || occupe} onClick={() => void onConfirmer(feuille, choix)}>
          {ACTION[g]}
        </Button>
      </div>
    </BottomSheet>
  );
}
