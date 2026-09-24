'use client';

import { useEffect, useId, useState } from 'react';
import Button from '@/components/ui/Button';
import Tag from '@/components/ui/Tag';
import * as api from '@/lib/verification/client';
import type { StatutVerification, Tirage } from '@/lib/verification/client';

/**
 * Parcours du badge vérifié (#436) — reproduit le prototype validé le
 * 2026-09-24 : présentation, geste, aperçu, puis l'état de la demande.
 *
 * Le geste vient du serveur et voyage dans un jeton signé : l'écran n'en
 * garde que l'affichage. Rien ne part avant « Envoyer pour vérification ».
 */
export type VerifyApi = Pick<typeof api, 'lireStatut' | 'tirerGeste' | 'envoyerSelfie'>;

type Etape =
  | { nom: 'chargement' }
  | { nom: 'intro' }
  | { nom: 'geste'; tirage: Tirage }
  | { nom: 'apercu'; tirage: Tirage; fichier: File; url: string }
  | { nom: 'examen' }
  | { nom: 'refus'; motif: string | null }
  | { nom: 'validee' };

function depuisStatut(s: StatutVerification): Etape {
  switch (s.statut) {
    case 'en_cours': return { nom: 'examen' };
    case 'validee': return { nom: 'validee' };
    case 'refusee': return { nom: 'refus', motif: s.motif };
    default: return { nom: 'intro' };
  }
}

export default function VerifyFlow({ client = api, onRetour }: { client?: VerifyApi; onRetour: () => void }) {
  const [etape, setEtape] = useState<Etape>({ nom: 'chargement' });
  const [occupe, setOccupe] = useState(false);
  const [erreur, setErreur] = useState('');

  useEffect(() => {
    let actif = true;
    void client.lireStatut().then((r) => {
      if (!actif) return;
      if (r.ok) setEtape(depuisStatut(r.valeur));
      else { setErreur(r.erreur); setEtape({ nom: 'intro' }); }
    });
    return () => { actif = false; };
  }, [client]);

  async function tirer(precedent?: string) {
    setErreur('');
    setOccupe(true);
    const r = await client.tirerGeste(precedent);
    setOccupe(false);
    if (r.ok) setEtape({ nom: 'geste', tirage: r.valeur });
    else setErreur(r.erreur);
  }

  async function envoyer(tirage: Tirage, fichier: File) {
    setErreur('');
    setOccupe(true);
    const r = await client.envoyerSelfie(fichier, tirage.jeton);
    setOccupe(false);
    if (r.ok) quitterApercu({ nom: 'examen' });
    else setErreur(r.erreur);
  }

  // L'URL `blob:` de l'aperçu naît au choix du fichier et meurt en quittant
  // l'aperçu : la créer dans un effet la ferait révoquer par le double
  // montage du mode strict, et l'image disparaîtrait.
  function quitterApercu(suivante: Etape) {
    if (etape.nom === 'apercu') URL.revokeObjectURL(etape.url);
    setEtape(suivante);
  }

  const alerte = erreur ? <p role="alert" className="mt-4 text-sm text-error">{erreur}</p> : null;

  switch (etape.nom) {
    case 'chargement':
      return <p className="text-sm text-muted">Chargement…</p>;

    case 'intro':
      return (
        <Ecran eyebrow="Badge vérifié" titre="Montre que c'est bien toi">
          <p className="mb-5 text-[15px] leading-relaxed text-muted">
            Le badge dit aux autres que tes photos sont les tiennes. Il suffit d&apos;un selfie, pris avec un geste qu&apos;on te demande.
          </p>
          <ol className="grid gap-3.5">
            <Etape n={1} titre="On te donne un geste">Tiré au hasard, pour que la photo soit prise maintenant.</Etape>
            <Etape n={2} titre="Tu prends un selfie">Visage bien visible, avec le geste.</Etape>
            <Etape n={3} titre="Une personne de l'équipe compare">Ton selfie et les photos de ton profil. Tu vois le résultat ici.</Etape>
          </ol>
          <Confidentialite />
          {alerte}
          <Actions>
            <Button type="button" onClick={() => void tirer()} loading={occupe}>Voir mon geste</Button>
            <Button type="button" variant="ghost" onClick={onRetour}>Plus tard</Button>
          </Actions>
        </Ecran>
      );

    case 'geste':
      return (
        <Ecran eyebrow="Étape 2 sur 3" titre="Ton geste">
          <CarteGeste tirage={etape.tirage} />
          {etape.tirage.peutRetirer && (
            <p className="mt-2.5 text-sm text-muted">
              Ce geste ne te convient pas ?{' '}
              <button
                type="button"
                disabled={occupe}
                onClick={() => void tirer(etape.tirage.jeton)}
                className="font-medium text-coral-dark underline underline-offset-2 dark:text-coral-light"
              >
                En tirer un autre
              </button>{' '}
              (une fois)
            </p>
          )}
          <PriseSelfie onFichier={(fichier) => { setErreur(''); setEtape({ nom: 'apercu', tirage: etape.tirage, fichier, url: URL.createObjectURL(fichier) }); }} />
          <ul className="mt-3.5 grid gap-1.5 text-sm text-muted">
            <li>Lumière de face, sans lunettes de soleil.</li>
            <li>Ton visage en entier dans le cadre.</li>
          </ul>
          {alerte}
        </Ecran>
      );

    case 'apercu':
      return (
        <Ecran eyebrow="Étape 3 sur 3" titre="On l'envoie ?">
          <Apercu url={etape.url} geste={etape.tirage.geste.texte} />
          <p className="mt-3.5 text-sm text-muted">Vérifie que ton visage et le geste se voient bien.</p>
          {alerte}
          <Actions>
            <Button type="button" onClick={() => void envoyer(etape.tirage, etape.fichier)} loading={occupe}>
              Envoyer pour vérification
            </Button>
            <Button type="button" variant="secondary" disabled={occupe} onClick={() => quitterApercu({ nom: 'geste', tirage: etape.tirage })}>
              Reprendre la photo
            </Button>
          </Actions>
        </Ecran>
      );

    case 'examen':
      return (
        <Ecran centre>
          <Horloge />
          <p className="text-center"><Tag variant="pending">En cours d&apos;examen</Tag></p>
          <h1 className="mb-2 mt-3 text-center text-2xl font-bold leading-tight text-content">C&apos;est bien reçu</h1>
          <p className="text-center text-[15px] leading-relaxed text-muted">
            Une personne de l&apos;équipe compare ton selfie à tes photos. Tu verras le résultat dans Paramètres, et le badge apparaîtra sur ton profil.
          </p>
          <Actions>
            <Button type="button" variant="secondary" onClick={onRetour}>Retour aux paramètres</Button>
          </Actions>
        </Ecran>
      );

    case 'refus':
      return (
        <Ecran eyebrow="Badge vérifié" titre="On n'a pas pu valider ce selfie">
          <div className="grid gap-2.5 rounded-2xl border border-hairline bg-surface p-4">
            <span><Tag variant="refused">Non validé</Tag></span>
            {etape.motif && (
              <div className="rounded-r-xl border-l-4 border-error bg-red-50 px-3 py-2.5 text-sm text-content dark:bg-red-900/30">
                <span className="block text-xs font-semibold text-red-700 dark:text-red-300">Motif</span>
                {etape.motif}
              </div>
            )}
            <p className="text-sm text-muted">Ça arrive souvent. Tu peux recommencer tout de suite, avec un nouveau geste.</p>
          </div>
          {alerte}
          <Actions>
            <Button type="button" onClick={() => void tirer()} loading={occupe}>Recommencer</Button>
            <Button type="button" variant="ghost" onClick={onRetour}>Plus tard</Button>
          </Actions>
        </Ecran>
      );

    case 'validee':
      return (
        <Ecran eyebrow="Badge vérifié" titre="Ton profil est vérifié">
          <p className="text-[15px] leading-relaxed text-muted">Le badge apparaît sur ton profil. Il n&apos;y a rien d&apos;autre à faire.</p>
          <Actions>
            <Button type="button" variant="secondary" onClick={onRetour}>Retour aux paramètres</Button>
          </Actions>
        </Ecran>
      );
  }
}

function Ecran({ eyebrow, titre, centre = false, children }: { eyebrow?: string; titre?: string; centre?: boolean; children: React.ReactNode }) {
  return (
    <section className={`flex flex-col ${centre ? 'pt-4' : ''}`}>
      {eyebrow && <p className="mb-1.5 text-xs font-semibold uppercase tracking-wider text-muted">{eyebrow}</p>}
      {titre && <h1 className="mb-2 text-2xl font-bold leading-tight text-content">{titre}</h1>}
      {children}
    </section>
  );
}

function Actions({ children }: { children: React.ReactNode }) {
  return <div className="mt-6 flex flex-col gap-2">{children}</div>;
}

function Etape({ n, titre, children }: { n: number; titre: string; children: React.ReactNode }) {
  return (
    <li className="grid grid-cols-[28px_1fr] items-start gap-3">
      <span aria-hidden="true" className="grid h-7 w-7 place-items-center rounded-full bg-sunken text-[13px] font-semibold tabular-nums text-coral-dark dark:text-coral-light">
        {n}
      </span>
      <div>
        <b className="block text-[15px] font-semibold text-content">{titre}</b>
        <span className="text-sm text-muted">{children}</span>
      </div>
    </li>
  );
}

function Confidentialite() {
  return (
    <div className="mt-5 grid grid-cols-[18px_1fr] gap-2.5 rounded-xl bg-fill-subtle px-3.5 py-3 text-[13px] leading-normal text-muted">
      <svg viewBox="0 0 24 24" className="mt-px h-[18px] w-[18px]" aria-hidden="true">
        <rect x="5" y="10.5" width="14" height="10" rx="2" fill="none" stroke="currentColor" strokeWidth="1.8" />
        <path d="M8 10.5V8a4 4 0 0 1 8 0v2.5" fill="none" stroke="currentColor" strokeWidth="1.8" />
      </svg>
      <p>Ton selfie n&apos;est jamais montré aux autres membres ni ajouté à ton profil. Il est effacé 30 jours après la décision.</p>
    </div>
  );
}

function CarteGeste({ tirage }: { tirage: Tirage }) {
  return (
    <div className="grid grid-cols-[72px_1fr] items-center gap-4 rounded-[20px] border border-hairline bg-surface p-[18px]">
      <div className="grid h-[72px] w-[72px] place-items-center rounded-2xl bg-sunken text-coral-dark dark:text-coral-light">
        <PictoGeste type={tirage.geste.type} />
      </div>
      <div>
        <p className="text-xs font-semibold uppercase tracking-wider text-muted">À faire sur la photo</p>
        <p className="mt-0.5 text-[17px] font-semibold leading-snug text-content">{tirage.geste.texte}</p>
      </div>
    </div>
  );
}

function PictoGeste({ type }: { type: 'main' | 'visage' }) {
  return (
    <svg viewBox="0 0 64 64" className="h-[52px] w-[52px]" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
      {type === 'main' ? (
        <>
          <circle cx="24" cy="28" r="13" />
          <path d="M11 60c1-9 6-14 13-14s12 5 13 14" />
          <path d="M44 42V24M49 42V19M54 42V21M59 42V26" />
          <path d="M44 42c0 6 4 10 8 10s7-4 7-10" />
          <path d="M44 38l-4-5" />
        </>
      ) : (
        <>
          <circle cx="32" cy="28" r="16" />
          <path d="M16 62c1-10 7-16 16-16s15 6 16 16" />
          <path d="M26 25h.01M38 25h.01M27 34c3 2.5 7 2.5 10 0" />
        </>
      )}
    </svg>
  );
}

function PriseSelfie({ onFichier }: { onFichier: (f: File) => void }) {
  const camera = useId();
  const fichier = useId();
  const choisir = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (f) onFichier(f);
    e.target.value = '';
  };
  return (
    <div className="mt-4 flex flex-col items-center gap-3 rounded-card border border-dashed border-coral-light bg-sunken px-4 py-6 text-center">
      <div className="grid h-16 w-16 place-items-center rounded-full bg-surface text-coral-dark shadow-soft dark:text-coral-light">
        <svg viewBox="0 0 24 24" className="h-7 w-7" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round">
          <path d="M4 8h3l2-2.5h6L17 8h3a1 1 0 0 1 1 1v9a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V9a1 1 0 0 1 1-1z" />
          <circle cx="12" cy="13" r="3.5" />
        </svg>
      </div>
      <p className="text-sm text-muted">Prends la photo maintenant, face à l&apos;objectif.</p>
      <input id={camera} type="file" accept="image/jpeg,image/png,image/webp" capture="user" className="sr-only" aria-label="Prendre le selfie" onChange={choisir} />
      <input id={fichier} type="file" accept="image/jpeg,image/png,image/webp" className="sr-only" aria-label="Choisir un fichier" onChange={choisir} />
      <Button type="button" onClick={() => document.getElementById(camera)?.click()}>Prendre le selfie</Button>
      <p className="text-xs text-muted">
        ou{' '}
        <button type="button" className="text-coral-dark underline underline-offset-2 dark:text-coral-light" onClick={() => document.getElementById(fichier)?.click()}>
          choisir un fichier
        </button>{' '}
        · JPG, PNG ou WebP · 5 Mo max
      </p>
    </div>
  );
}

function Apercu({ url, geste }: { url: string; geste: string }) {
  return (
    <div className="relative aspect-[4/5] max-w-full overflow-hidden rounded-card bg-sunken">
      {/* eslint-disable-next-line @next/next/no-img-element -- aperçu local (blob:), rien à optimiser */}
      <img src={url} alt="Aperçu de ton selfie" className="h-full w-full object-cover" />
      <p className="absolute inset-x-3 bottom-3 rounded-xl bg-ink/60 px-3 py-2 text-xs font-medium leading-snug text-white backdrop-blur-sm">
        <b className="font-semibold">Ton geste :</b> {geste}
      </p>
    </div>
  );
}

function Horloge() {
  return (
    <div className="grid place-items-center pb-2 pt-4" aria-hidden="true">
      <svg viewBox="0 0 120 120" className="h-[120px] w-[120px]">
        <circle cx="60" cy="60" r="52" className="fill-sunken" />
        <circle cx="60" cy="60" r="30" fill="none" className="stroke-coral-light" strokeWidth="4" />
        <path d="M60 44v17l10 7" fill="none" className="stroke-coral" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </div>
  );
}
