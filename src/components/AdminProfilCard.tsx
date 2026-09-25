'use client';

import { useState } from 'react';
import Link from 'next/link';
import Button from '@/components/ui/Button';
import Card from '@/components/ui/Card';
import Tag from '@/components/ui/Tag';
import AdminPhotoSearch from '@/components/AdminPhotoSearch';
import { cleDepuisUrl } from '@/lib/photos';
import { LIBELLES_DECISION, LIBELLES_SIGNAL } from '@/lib/fraude/libelles';

/**
 * Un profil de la file « Profils à vérifier » (spec 006, US4). Les indices
 * d'abord — pourquoi ce profil est ici —, puis les photos avec la recherche
 * inversée (#442), puis trois décisions. « Bannir » demande une confirmation :
 * c'est la seule décision qui ne se défait pas d'un clic.
 */
export type DecisionProfil = 'rien' | 'verification' | 'banni';

export interface SignalRow {
  type: string;
  force: 'faible' | 'fort' | string;
  extrait: string | null;
  photo: string | null;
  /** Compte qui porte la même photo (spec 006, US3) — le lien survit à sa suppression. */
  autreUserId?: string | null;
  createdAt: string;
  nouveau: boolean;
}

export interface ProfilRow {
  userId: string;
  displayName: string;
  email: string;
  inscritLe: string;
  enRetrait: boolean;
  /** #437 : âge mis en doute par un signalement — traité en priorité. */
  ageEnDoute?: boolean;
  bio: string;
  photos: string[];
  derniereDecision: { decision: string; decidedAt: string } | null;
  signaux: SignalRow[];
}

const date = (iso: string) => new Date(iso).toLocaleDateString('fr-FR');

export default function AdminProfilCard({ p, onDecision }: { p: ProfilRow; onDecision: (d: DecisionProfil) => Promise<void> }) {
  const [confirmerBan, setConfirmerBan] = useState(false);
  const [occupe, setOccupe] = useState(false);

  async function decider(d: DecisionProfil) {
    setOccupe(true);
    await onDecision(d);
    setOccupe(false);
    setConfirmerBan(false);
  }

  return (
    <Card as="article" variant="profile" aria-label={`Profil à vérifier : ${p.displayName}`} className={p.ageEnDoute ? 'ring-2 ring-error' : undefined}>
      <div className="grid gap-4">
        <div className="flex flex-wrap items-baseline gap-x-4 gap-y-1">
          <b className="text-base text-content">{p.displayName}</b>
          <span className="text-sm text-muted">{p.email}</span>
          <span className="text-sm tabular-nums text-muted">Inscrit le {date(p.inscritLe)}</span>
          {p.ageEnDoute && <Tag variant="refused" size="sm">Âge mis en doute</Tag>}
          {p.enRetrait && <Tag variant="pending" size="sm">En retrait</Tag>}
        </div>
        {p.derniereDecision && (
          <p className="text-sm text-muted">
            Déjà examiné le {date(p.derniereDecision.decidedAt)} : {LIBELLES_DECISION[p.derniereDecision.decision] ?? p.derniereDecision.decision}.
            Un nouvel indice l’a remis dans la file.
          </p>
        )}

        <div className="grid gap-5 sm:grid-cols-[minmax(220px,300px)_1fr]">
          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted">Pourquoi ce profil est ici</p>
            <ul className="grid gap-2">
              {p.signaux.map((s, i) => (
                <li key={i} className={`rounded-xl bg-sunken px-3 py-2.5 text-sm text-content ${s.nouveau ? '' : 'opacity-60'}`}>
                  <div className="flex flex-wrap items-center gap-2">
                    <Tag variant={s.force === 'fort' ? 'refused' : 'pending'} size="sm">
                      {s.force === 'fort' ? 'Indice fort' : 'Indice faible'}
                    </Tag>
                    <span className="font-medium">{LIBELLES_SIGNAL[s.type] ?? s.type}</span>
                  </div>
                  {s.extrait && <p className="mt-1.5 break-words font-mono text-xs text-content">« {s.extrait} »</p>}
                  {s.autreUserId && (
                    <Link href={`/admin/users/${s.autreUserId}`} className="mt-1.5 inline-block text-xs font-semibold text-coral-dark underline underline-offset-2 hover:no-underline dark:text-coral-light">
                      Voir l’autre compte
                    </Link>
                  )}
                  <p className="mt-1 text-xs text-muted">
                    Le {date(s.createdAt)}
                    {!s.nouveau && ' · déjà vu lors de la décision précédente'}
                  </p>
                </li>
              ))}
            </ul>
            {p.bio && (
              <>
                <p className="mb-1.5 mt-4 text-xs font-semibold uppercase tracking-wider text-muted">Bio</p>
                <p className="whitespace-pre-line text-sm text-content">{p.bio}</p>
              </>
            )}
          </div>

          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted">Photos du profil</p>
            {p.photos.length === 0 ? (
              <p className="text-sm text-muted">Aucune photo sur le profil.</p>
            ) : (
              <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3">
                {p.photos.map((src, i) => {
                  const lue = p.signaux.some((s) => s.type === 'contact_photo' && s.photo === src);
                  return (
                    <div key={src} className="relative">
                      {/* eslint-disable-next-line @next/next/no-img-element -- proxy signé */}
                      <img src={src} alt={`Photo ${i + 1} du profil`} className={`aspect-[4/5] w-full rounded-xl bg-sunken object-cover ${lue ? 'ring-2 ring-coral' : ''}`} />
                      {lue && <span className="absolute left-2 top-2 rounded-full bg-surface/90 px-2 py-0.5 text-[11px] font-semibold text-content">Texte lu ici</span>}
                      {cleDepuisUrl(src) && <AdminPhotoSearch cle={cleDepuisUrl(src)!} />}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 border-t border-hairline pt-4">
          {confirmerBan ? (
            <>
              <span className="text-sm text-content">Bannir {p.displayName} ? Le compte ne pourra plus se connecter.</span>
              <Button type="button" size="sm" variant="danger" disabled={occupe} onClick={() => void decider('banni')}>
                Confirmer le bannissement
              </Button>
              <Button type="button" size="sm" variant="ghost" disabled={occupe} onClick={() => setConfirmerBan(false)}>
                Annuler
              </Button>
            </>
          ) : (
            <>
              <Button type="button" size="sm" variant="secondary" disabled={occupe} onClick={() => void decider('rien')}>
                Rien à signaler
              </Button>
              <Button type="button" size="sm" disabled={occupe || p.enRetrait} onClick={() => void decider('verification')}>
                Demander une vérification
              </Button>
              <Button type="button" size="sm" variant="danger" disabled={occupe} onClick={() => setConfirmerBan(true)}>
                Bannir
              </Button>
              <span className="text-xs text-muted">« Demander une vérification » masque le profil jusqu’à son selfie validé.</span>
            </>
          )}
        </div>
      </div>
    </Card>
  );
}
