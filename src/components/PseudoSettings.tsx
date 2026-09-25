'use client';

import { useState } from 'react';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import { PSEUDO_HINT, PSEUDO_MAX } from '@/lib/pseudo';
import { savePseudo } from '@/lib/pseudo-client';

/**
 * Section « Pseudo » des Paramètres (#459). Le pseudo n'était modifiable nulle
 * part après l'inscription ; même règle et mêmes messages que l'écran
 * `/pseudo` (copie validée au prototype du 2026-09-25).
 */
export default function PseudoSettings({ initial }: { initial: string }) {
  const [current, setCurrent] = useState(initial);
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(initial);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  async function submit() {
    setSaving(true);
    setError('');
    const r = await savePseudo(value);
    setSaving(false);
    if (!r.ok) {
      setError(r.error);
      return;
    }
    setCurrent(r.displayName);
    setEditing(false);
    setSaved(true);
  }

  return (
    <section className="rounded-xl border border-hairline bg-surface p-4 sm:p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-content">Pseudo</h2>
          <p className="mt-1 text-sm text-muted">C’est le nom que les autres voient.</p>
        </div>
        {!editing && (
          <Button
            type="button"
            variant="ghost"
            onClick={() => {
              setValue(current);
              setError('');
              setSaved(false);
              setEditing(true);
            }}
          >
            Modifier
          </Button>
        )}
      </div>

      {editing ? (
        <form
          className="mt-3"
          onSubmit={(e) => {
            e.preventDefault();
            void submit();
          }}
        >
          <Input
            label="Nouveau pseudo"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            maxLength={PSEUDO_MAX}
            autoComplete="nickname"
            hint={error ? undefined : PSEUDO_HINT}
            error={error || undefined}
          />
          <div className="mt-3 flex gap-2">
            <Button type="button" variant="secondary" onClick={() => setEditing(false)}>
              Annuler
            </Button>
            <Button type="submit" variant="primary" loading={saving} disabled={value.trim() === ''}>
              Enregistrer
            </Button>
          </div>
        </form>
      ) : (
        <>
          <p className="mt-2 text-base font-semibold text-content">{current}</p>
          {saved && (
            <p role="status" className="mt-2 text-sm text-success">
              Pseudo enregistré.
            </p>
          )}
        </>
      )}
    </section>
  );
}
