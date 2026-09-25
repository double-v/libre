'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import SiteShell from '@/components/ui/SiteShell';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import HeartMark from '@/components/ui/HeartMark';
import { PSEUDO_HINT, PSEUDO_MAX } from '@/lib/pseudo';
import { savePseudo } from '@/lib/pseudo-client';

/**
 * Choisir un nouveau pseudo (#459). La migration `pseudo_regle` a retiré les
 * pseudos hors règle (souvent une adresse e-mail) ; leur propriétaire arrive
 * ici depuis la garde de Découvrir. Écran **non passable** : tant qu'il n'a pas
 * de pseudo, les autres le voient comme « Membre ». Le texte explique sans
 * accuser (copie validée au prototype du 2026-09-25).
 */
export default function PseudoPage() {
  const router = useRouter();
  const [ready, setReady] = useState(false);
  const [value, setValue] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch('/api/users/profile');
        const data = res.ok ? await res.json() : null;
        if (cancelled) return;
        if (!data?.mustRenameDisplayName) {
          router.replace('/discover');
          return;
        }
      } catch {
        // Lecture impossible : on laisse choisir, l'écriture tranchera.
      }
      if (!cancelled) setReady(true);
    })();
    return () => {
      cancelled = true;
    };
    // Une seule lecture au montage.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function submit() {
    setSaving(true);
    setError('');
    const r = await savePseudo(value);
    setSaving(false);
    if (r.ok) router.replace('/discover');
    else setError(r.error);
  }

  if (!ready) return null;

  return (
    <SiteShell as="section" width="app" className="py-6 md:pt-11">
      <div className="mb-5 grid h-[104px] place-items-center rounded-card bg-sunken">
        <HeartMark className="h-11 w-11 text-coral" aria-hidden="true" />
      </div>
      <h1 className="mb-2 text-2xl font-bold leading-tight text-content">Choisis un nouveau pseudo</h1>
      <p className="mb-5 text-[15px] leading-relaxed text-muted">
        Ton pseudo contenait une adresse, un lien ou un signe réservé. Pour te protéger, il n’est plus
        affiché. Choisis celui que les autres verront.
      </p>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          void submit();
        }}
      >
        <Input
          label="Pseudo"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          maxLength={PSEUDO_MAX}
          autoComplete="nickname"
          hint={error ? undefined : PSEUDO_HINT}
          error={error || undefined}
        />
        <div className="mt-6">
          <Button type="submit" variant="primary" fullWidth loading={saving} disabled={value.trim() === ''}>
            Enregistrer
          </Button>
        </div>
      </form>
    </SiteShell>
  );
}
