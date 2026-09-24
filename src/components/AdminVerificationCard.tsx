'use client';

import { useState } from 'react';
import Button from '@/components/ui/Button';
import Card from '@/components/ui/Card';
import Tag from '@/components/ui/Tag';
import { MOTIFS_REFUS, type MotifRefus } from '@/lib/verification/motifs';

/**
 * Une demande de badge dans la file admin (#436) — le selfie se juge à côté
 * du geste demandé et des photos du profil, jamais seul. « Valider » attend
 * les deux constats cochés ; « Refuser » attend un motif, que le membre lira.
 */
export interface VerificationRow {
  id: string;
  selfieUrl: string;
  status: 'pending' | 'approved' | 'rejected' | string;
  createdAt: string;
  geste: string | null;
  motif: string | null;
  tentatives: number;
  user: { id: string; displayName: string; emailMasque: string; photos: string[] };
}

export type Decision = { action: 'APPROVE_VERIFICATION' } | { action: 'REJECT_VERIFICATION'; motif: MotifRefus };

const MOTIFS_ADMIN: Record<MotifRefus, string> = {
  geste_invisible: 'Le geste demandé ne se voit pas',
  visage_peu_visible: 'Le visage n’est pas assez visible',
  ne_correspond_pas: 'Ne correspond pas aux photos du profil',
  photo_ecran: 'Photo d’une photo ou d’un écran',
};

export default function AdminVerificationCard({ v, onDecision }: { v: VerificationRow; onDecision: (d: Decision) => Promise<void> }) {
  const [geste, setGeste] = useState(false);
  const [visage, setVisage] = useState(false);
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
          <span className="text-sm tabular-nums text-muted">
            Demande du {new Date(v.createdAt).toLocaleDateString('fr-FR')}
            {v.tentatives > 1 && ` · ${v.tentatives} tentatives au total`}
          </span>
          {v.status === 'approved' && <Tag variant="verified" size="sm">Validée</Tag>}
          {v.status === 'rejected' && <Tag variant="refused" size="sm">Refusée</Tag>}
        </div>

        <div className="grid gap-5 sm:grid-cols-[minmax(200px,260px)_1fr]">
          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted">Selfie</p>
            {/* eslint-disable-next-line @next/next/no-img-element -- proxy signé, pas d'optimisation voulue */}
            <img src={v.selfieUrl} alt={`Selfie de vérification de ${v.user.displayName}`} className="aspect-[4/5] w-full rounded-2xl bg-sunken object-cover" />
            <div className="mt-2.5 rounded-xl bg-sunken px-3 py-2.5 text-sm text-content">
              <span className="block text-xs font-semibold text-coral-dark dark:text-coral-light">Geste demandé</span>
              {v.geste ?? 'Aucun (demande antérieure aux gestes)'}
            </div>
          </div>
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
                  </div>
                ))}
              </div>
            )}
            {enAttente && (
              <div className="mt-3.5 grid gap-1.5 text-sm text-content">
                <label className="flex items-center gap-2">
                  <input type="checkbox" checked={geste} onChange={(e) => setGeste(e.target.checked)} /> Le geste demandé est visible
                </label>
                <label className="flex items-center gap-2">
                  <input type="checkbox" checked={visage} onChange={(e) => setVisage(e.target.checked)} /> Même personne que sur les photos
                </label>
              </div>
            )}
            {v.status === 'rejected' && v.motif && <p className="mt-3.5 text-sm text-muted">Motif lu par le membre : {v.motif}</p>}
          </div>
        </div>

        {enAttente && (
          <div className="flex flex-wrap items-center gap-2.5 border-t border-hairline pt-4">
            <Button type="button" size="sm" disabled={!geste || !visage || occupe} onClick={() => void decider({ action: 'APPROVE_VERIFICATION' })}>
              Valider
            </Button>
            <select
              aria-label="Motif de refus"
              value={motif}
              onChange={(e) => setMotif(e.target.value as MotifRefus | '')}
              className="min-h-[36px] max-w-full rounded-control border border-hairline-strong bg-surface px-2.5 text-sm text-content"
            >
              <option value="">Motif de refus…</option>
              {(Object.keys(MOTIFS_REFUS) as MotifRefus[]).map((m) => (
                <option key={m} value={m}>{MOTIFS_ADMIN[m]}</option>
              ))}
            </select>
            <Button type="button" size="sm" variant="danger" disabled={!motif || occupe} onClick={() => motif && void decider({ action: 'REJECT_VERIFICATION', motif })}>
              Refuser
            </Button>
            <span className="text-xs text-muted">« Valider » n&apos;est actif que si les deux cases sont cochées.</span>
          </div>
        )}
      </div>
    </Card>
  );
}
