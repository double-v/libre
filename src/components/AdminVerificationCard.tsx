'use client';

import { useState } from 'react';
import Button from '@/components/ui/Button';
import Card from '@/components/ui/Card';
import Tag from '@/components/ui/Tag';
import { CODES_MOTIFS, MOTIFS_REFUS, type MotifRefus } from '@/lib/verification/motifs';
import { comparerCode } from '@/lib/verification/code-forme';
import { cleDepuisUrl } from '@/lib/photos';
import AdminPhotoSearch from '@/components/AdminPhotoSearch';

/**
 * Une demande de badge dans la file admin (#436, spec 012 US1/US2).
 *
 * Le selfie se juge à côté du code attendu et des photos du profil, jamais
 * seul. Trois questions fermées, trois oui pour valider (FR-006). La lecture
 * automatique est un indice affiché, jamais une décision (FR-005). Les
 * demandes envoyées au geste restent traitables (FR-008).
 */
export interface VerificationRow {
  id: string;
  selfieUrl: string;
  status: 'pending' | 'approved' | 'rejected' | string;
  createdAt: string;
  codeAttendu: string | null;
  /** `null` = lecture en cours, `''` = impossible. */
  codeLu: string | null;
  tentative: number;
  sansDonneesAppareil: boolean | null;
  ancienGeste: string | null;
  motif: string | null;
  refusPrecedent: { motif: string | null; at: string | null } | null;
  user: { id: string; displayName: string; emailMasque: string; photos: string[] };
}

export type Decision = { action: 'APPROVE_VERIFICATION' } | { action: 'REJECT_VERIFICATION'; motif: MotifRefus };

export default function AdminVerificationCard({ v, onDecision }: { v: VerificationRow; onDecision: (d: Decision) => Promise<void> }) {
  const questions = v.codeAttendu
    ? [
        `Le code est écrit à la main et je lis bien ${v.codeAttendu}.`,
        'C’est la même personne que sur les photos.',
        'C’est une vraie photo, pas un écran ni une image générée.',
      ]
    : [
        'Le geste demandé se voit sur la photo.',
        'C’est la même personne que sur les photos.',
        'C’est une vraie photo, pas un écran ni une image générée.',
      ];
  const [oui, setOui] = useState<boolean[]>(() => questions.map(() => false));
  const [motif, setMotif] = useState<MotifRefus | ''>('');
  const [occupe, setOccupe] = useState(false);
  const enAttente = v.status === 'pending';

  async function decider(d: Decision) {
    setOccupe(true);
    await onDecision(d);
    setOccupe(false);
  }

  return (
    <Card variant="profile">
      <div className="grid gap-4">
        <div className="flex flex-wrap items-baseline gap-x-4 gap-y-1">
          <b className="text-base text-content">{v.user.displayName}</b>
          <span className="text-sm text-muted">{v.user.emailMasque}</span>
          <span className="text-sm tabular-nums text-muted">Demande du {new Date(v.createdAt).toLocaleDateString('fr-FR')}</span>
          {v.status === 'approved' && <Tag variant="verified" size="sm">Validée</Tag>}
          {v.status === 'rejected' && <Tag variant="refused" size="sm">Refusée</Tag>}
        </div>

        <div className="grid gap-5 sm:grid-cols-[minmax(200px,260px)_1fr]">
          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted">Selfie</p>
            {/* eslint-disable-next-line @next/next/no-img-element -- proxy signé, pas d'optimisation voulue */}
            <img src={v.selfieUrl} alt={`Selfie de vérification de ${v.user.displayName}`} className="aspect-[4/5] w-full rounded-2xl bg-sunken object-cover" />
            {v.sansDonneesAppareil && (
              <p className="mt-2 text-xs text-muted">Indice : le fichier reçu ne portait aucune donnée d’appareil (capture, retouche ou image générée possibles).</p>
            )}
          </div>
          <div className="grid content-start gap-3.5">
            {v.codeAttendu ? (
              <div>
                <p className="mb-1 text-xs font-semibold uppercase tracking-wider text-muted">Code attendu</p>
                <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                  <span className="font-mono text-2xl font-bold tracking-[0.16em] text-content">{v.codeAttendu}</span>
                  <LectureAuto attendu={v.codeAttendu} lu={v.codeLu} />
                </div>
              </div>
            ) : (
              <div className="rounded-xl bg-sunken px-3 py-2.5 text-sm text-content">
                <span className="block text-xs font-semibold text-coral-dark dark:text-coral-light">Geste demandé (ancienne demande)</span>
                {v.ancienGeste ?? 'Aucun'}
              </div>
            )}

            {v.tentative > 1 && (
              <p className="text-sm text-muted">
                Tentative n° {v.tentative}.
                {v.refusPrecedent && ` La précédente a été refusée${v.refusPrecedent.at ? ` le ${new Date(v.refusPrecedent.at).toLocaleDateString('fr-FR')}` : ''}${v.refusPrecedent.motif ? ` (${v.refusPrecedent.motif.toLowerCase()})` : ''}.`}
              </p>
            )}

            <div>
              <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted">Photos du profil</p>
              {v.user.photos.length === 0 ? (
                <p className="text-sm text-muted">Aucune photo sur le profil : rien à comparer.</p>
              ) : (
                <div className="grid grid-cols-3 gap-2.5">
                  {v.user.photos.map((src, i) => (
                    <div key={src} className="relative">
                      {/* eslint-disable-next-line @next/next/no-img-element -- proxy signé */}
                      <img src={src} alt={`Photo ${i + 1} du profil`} className="aspect-[4/5] w-full rounded-xl bg-sunken object-cover" />
                      {i === 0 && <span className="absolute left-2 top-2 rounded-full bg-surface/90 px-2 py-0.5 text-[11px] font-semibold text-content">Principale</span>}
                      {cleDepuisUrl(src) && <AdminPhotoSearch cle={cleDepuisUrl(src)!} />}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {enAttente && (
              <fieldset className="grid gap-1.5 text-sm text-content">
                <legend className="mb-1 text-xs font-semibold uppercase tracking-wider text-muted">Trois oui pour valider</legend>
                {questions.map((q, i) => (
                  <label key={q} className="flex min-h-[44px] items-center gap-2">
                    <input
                      type="checkbox"
                      checked={oui[i]}
                      onChange={(e) => setOui((o) => o.map((x, j) => (j === i ? e.target.checked : x)))}
                    />
                    {q}
                  </label>
                ))}
              </fieldset>
            )}
            {v.status === 'rejected' && v.motif && <p className="text-sm text-muted">Motif lu par le membre : {v.motif}</p>}
          </div>
        </div>

        {enAttente && (
          <div className="flex flex-wrap items-center gap-2.5 border-t border-hairline pt-4">
            <Button type="button" size="sm" disabled={!oui.every(Boolean) || occupe} onClick={() => void decider({ action: 'APPROVE_VERIFICATION' })}>
              Valider
            </Button>
            <select
              aria-label="Motif de refus"
              value={motif}
              onChange={(e) => setMotif(e.target.value as MotifRefus | '')}
              className="min-h-[44px] max-w-full rounded-control border border-hairline-strong bg-surface px-2.5 text-sm text-content"
            >
              <option value="">Motif de refus…</option>
              {CODES_MOTIFS.map((m) => (
                <option key={m} value={m}>{MOTIFS_REFUS[m].libelle}</option>
              ))}
            </select>
            <Button type="button" size="sm" variant="danger" disabled={!motif || occupe} onClick={() => motif && void decider({ action: 'REJECT_VERIFICATION', motif })}>
              Refuser
            </Button>
            <span className="text-xs text-muted">Au moindre doute, refuse : le membre reçoit le motif, un conseil et un nouveau code.</span>
          </div>
        )}
      </div>
    </Card>
  );
}

/** Indice de lecture : jamais une décision, les chiffres divergents soulignés. */
function LectureAuto({ attendu, lu }: { attendu: string; lu: string | null }) {
  if (lu === null) return <span className="text-sm text-muted">Lecture automatique en cours…</span>;
  if (lu === '') return <span className="text-sm text-warning">Lecture automatique impossible : lis-le toi-même.</span>;
  if (lu === attendu) return <span className="text-sm text-success">Lu automatiquement : {lu}</span>;
  return (
    <span className="text-sm text-error">
      Lu automatiquement :{' '}
      {comparerCode(attendu, lu).map(({ c, ok }, i) =>
        ok ? <span key={i}>{c}</span> : <u key={i} className="font-bold" title="différent du code attendu">{c}</u>,
      )}
    </span>
  );
}
