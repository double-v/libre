'use client';

import { useCallback, useEffect, useId, useRef, useState } from 'react';
import Button from '@/components/ui/Button';
import Tag from '@/components/ui/Tag';
import * as api from '@/lib/verification/client';
import type { Code, StatutVerification } from '@/lib/verification/client';

/**
 * Parcours du badge vérifié (#436), au code écrit à la main (spec 012,
 * US1/US2) — reproduit `specs/012-bureau-refonte/proto-bureau.html`
 * (Outils › Proto selfie).
 *
 * Le code vient du serveur ; l'écran ne fait que l'afficher. Rien ne part
 * avant « Envoyer pour vérification ». Aucun état sans suite : un refus
 * montre le motif, un conseil et un nouveau code ; un code expiré est
 * remplacé ; après trois refus, la date de reprise est écrite.
 */
export type VerifyApi = Pick<typeof api, 'lireStatut' | 'tirerCode' | 'envoyerSelfie' | 'marquerVu'>;

type Refus = Extract<StatutVerification, { statut: 'refusee' }>;

type Etape =
  | { nom: 'chargement' }
  | { nom: 'intro' }
  | { nom: 'code'; code: Code }
  | { nom: 'apercu'; code: Code; fichier: File; url: string }
  | { nom: 'examen' }
  | { nom: 'refus'; refus: Refus; code: Code | null; reessaiAt: string | null }
  | { nom: 'validee' };

function dateLongue(iso: string): string {
  return new Date(iso).toLocaleString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' });
}

export default function VerifyFlow({ client = api, onRetour }: { client?: VerifyApi; onRetour: () => void }) {
  const [etape, setEtape] = useState<Etape>({ nom: 'chargement' });
  const [occupe, setOccupe] = useState(false);
  const [erreur, setErreur] = useState('');
  const apercu = useRef<string | null>(null);

  // L'URL `blob:` de l'aperçu naît au choix du fichier et meurt en quittant
  // l'aperçu : la créer dans un effet la ferait révoquer par le double
  // montage du mode strict, et l'image disparaîtrait.
  const aller = useCallback((suivante: Etape) => {
    if (apercu.current) URL.revokeObjectURL(apercu.current);
    apercu.current = suivante.nom === 'apercu' ? suivante.url : null;
    setEtape(suivante);
  }, []);

  /** Un refus s'affiche avec son nouveau code déjà tiré, sauf pendant l'attente de 24 h. */
  const montrerRefus = useCallback(async (refus: Refus) => {
    void client.marquerVu();
    if (refus.reessaiAt) {
      aller({ nom: 'refus', refus, code: null, reessaiAt: refus.reessaiAt });
      return;
    }
    const r = await client.tirerCode();
    if (r.ok) aller({ nom: 'refus', refus, code: r.valeur, reessaiAt: null });
    else {
      aller({ nom: 'refus', refus, code: null, reessaiAt: r.reessaiAt ?? null });
      if (!r.reessaiAt) setErreur(r.erreur);
    }
  }, [aller, client]);

  useEffect(() => {
    let actif = true;
    void client.lireStatut().then(async (r) => {
      if (!actif) return;
      if (!r.ok) { setErreur(r.erreur); aller({ nom: 'intro' }); return; }
      const s = r.valeur;
      if (s.statut === 'refusee') await montrerRefus(s);
      else if (s.statut === 'en_cours') aller({ nom: 'examen' });
      else if (s.statut === 'validee') { void client.marquerVu(); aller({ nom: 'validee' }); }
      else aller({ nom: 'intro' });
    });
    return () => { actif = false; };
  }, [aller, client, montrerRefus]);

  async function tirer() {
    setErreur('');
    setOccupe(true);
    const r = await client.tirerCode();
    setOccupe(false);
    if (r.ok) aller({ nom: 'code', code: r.valeur });
    else setErreur(r.reessaiAt ? `${r.erreur} ${dateLongue(r.reessaiAt)}.` : r.erreur);
  }

  async function envoyer(code: Code, fichier: File) {
    setErreur('');
    setOccupe(true);
    const r = await client.envoyerSelfie(fichier, code.code);
    if (r.ok) { setOccupe(false); aller({ nom: 'examen' }); return; }
    if (r.nouveauCode) {
      // Code expiré ou remplacé : on en tire un autre, la photo est à refaire
      // puisqu'elle montre l'ancien.
      const n = await client.tirerCode();
      setOccupe(false);
      if (n.ok) {
        aller({ nom: 'code', code: n.valeur });
        setErreur('Ton code avait expiré. Voici un nouveau code : écris-le et reprends la photo.');
      } else setErreur(n.erreur);
      return;
    }
    setOccupe(false);
    setErreur(r.erreur);
  }

  const alerte = erreur ? <p role="alert" className="mt-4 text-sm text-error">{erreur}</p> : null;

  switch (etape.nom) {
    case 'chargement':
      return <p className="text-sm text-muted">Chargement…</p>;

    case 'intro':
      return (
        <Ecran eyebrow="Badge vérifié" titre="Montre que c'est bien toi">
          <p className="mb-5 text-[15px] leading-relaxed text-muted">
            Le badge dit aux autres que tes photos sont les tiennes. Il suffit d&apos;un selfie avec un code que tu écris à la main.
          </p>
          <ol className="grid gap-3.5">
            <Etape n={1} titre="On te donne un code">Quatre chiffres, valables 30 minutes.</Etape>
            <Etape n={2} titre="Tu l'écris et tu prends un selfie">Sur une feuille, tenue près de ton visage ou posée à côté de toi.</Etape>
            <Etape n={3} titre="Une personne de l'équipe compare">Ton selfie et les photos de ton profil. Tu vois le résultat ici.</Etape>
          </ol>
          <Confidentialite />
          {alerte}
          <Actions>
            <Button type="button" onClick={() => void tirer()} loading={occupe}>Recevoir mon code</Button>
            <Button type="button" variant="ghost" onClick={onRetour}>Plus tard</Button>
          </Actions>
        </Ecran>
      );

    case 'code':
      return (
        <Ecran eyebrow="Étape 2 sur 3" titre="Montre-nous que c'est bien toi">
          <GrandCode code={etape.code.code} legende="Ton code, valable 30 minutes" />
          <Consignes />
          <PriseSelfie onFichier={(fichier) => { setErreur(''); aller({ nom: 'apercu', code: etape.code, fichier, url: URL.createObjectURL(fichier) }); }} />
          {alerte}
        </Ecran>
      );

    case 'apercu':
      return (
        <Ecran eyebrow="Étape 3 sur 3" titre="On l'envoie ?">
          <Apercu url={etape.url} code={etape.code.code} />
          <p className="mt-3.5 text-sm text-muted">Vérifie que ton visage et le code se lisent bien.</p>
          {alerte}
          <Actions>
            <Button type="button" onClick={() => void envoyer(etape.code, etape.fichier)} loading={occupe}>
              Envoyer pour vérification
            </Button>
            <Button type="button" variant="secondary" disabled={occupe} onClick={() => aller({ nom: 'code', code: etape.code })}>
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

    case 'refus': {
      const { refus, code, reessaiAt } = etape;
      return (
        <Ecran eyebrow="Badge vérifié" titre="Ton selfie n'a pas pu être validé">
          <div className="grid gap-2.5 rounded-2xl border border-hairline bg-surface p-4">
            <span><Tag variant="refused">Non validé</Tag></span>
            {refus.motif && (
              <div className="rounded-r-xl border-l-4 border-error bg-red-50 px-3 py-2.5 text-sm text-content dark:bg-red-900/30">
                <span className="block text-xs font-semibold text-red-700 dark:text-red-300">Motif</span>
                {refus.motif.texte}
              </div>
            )}
            {refus.motif && <p className="text-sm text-content"><b className="font-semibold">Conseil :</b> {refus.motif.conseil}</p>}
          </div>
          {reessaiAt ? (
            <p className="mt-4 text-[15px] leading-relaxed text-content">
              Après trois refus, la tentative suivante s&apos;ouvre 24 heures plus tard. Tu pourras refaire ton selfie à partir du {dateLongue(reessaiAt)}.
            </p>
          ) : code ? (
            <div className="mt-4">
              <GrandCode code={code.code} legende="Ton nouveau code, valable 30 minutes" />
            </div>
          ) : null}
          {alerte}
          <Actions>
            {code && <Button type="button" onClick={() => aller({ nom: 'code', code })}>Refaire mon selfie</Button>}
            {!code && !reessaiAt && <Button type="button" onClick={() => void tirer()} loading={occupe}>Recevoir un nouveau code</Button>}
            <Button type="button" variant="ghost" onClick={onRetour}>Plus tard</Button>
          </Actions>
          {!reessaiAt && (
            <p className="mt-3 text-xs text-muted">Tu peux réessayer autant de fois qu&apos;il le faut. Après trois refus, la tentative suivante s&apos;ouvre 24 heures plus tard.</p>
          )}
        </Ecran>
      );
    }

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

/** « LIBRE 7358 » en grand : ce que le membre recopie sur sa feuille. */
function GrandCode({ code, legende }: { code: string; legende: string }) {
  return (
    <div className="rounded-[20px] border border-hairline bg-surface px-4 py-5 text-center">
      {/* `div` et non `p` : la marge globale des paragraphes écarterait la légende. */}
      <div className="font-mono text-[34px] font-bold leading-none tracking-[0.14em] text-content" aria-label={`Libre ${code.split('').join(' ')}`}>
        LIBRE {code}
      </div>
      <div className="mt-2 text-sm text-muted">{legende}</div>
    </div>
  );
}

function Consignes() {
  return (
    <>
      <ol className="mt-4 grid list-decimal gap-2 pl-5 text-[15px] leading-relaxed text-content">
        <li>Écris « Libre » et ce code à la main sur une feuille.</li>
        <li>Prends un selfie en tenant la feuille près de ton visage. Si tu ne peux pas la tenir, pose-la à côté de toi, bien visible.</li>
        <li>Vérifie que ton visage et le code se lisent bien, puis envoie la photo.</li>
      </ol>
      <p className="mt-3 text-sm text-muted">Quelqu&apos;un peut écrire le code pour toi. Ce selfie n&apos;apparaît jamais sur ton profil.</p>
    </>
  );
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
      <p className="text-sm text-muted">Prends la photo maintenant, la feuille bien visible.</p>
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

function Apercu({ url, code }: { url: string; code: string }) {
  return (
    <div className="relative aspect-[4/5] max-w-full overflow-hidden rounded-card bg-sunken">
      {/* eslint-disable-next-line @next/next/no-img-element -- aperçu local (blob:), rien à optimiser */}
      <img src={url} alt="Aperçu de ton selfie" className="h-full w-full object-cover" />
      <p className="absolute inset-x-3 bottom-3 rounded-xl bg-ink/60 px-3 py-2 text-xs font-medium leading-snug text-white backdrop-blur-sm">
        <b className="font-semibold">Ton code :</b> LIBRE {code}
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
