'use client';

import Link from 'next/link';

/**
 * Case de consentement art. 9 (#425) — orientation, identité de genre,
 * pratiques, et les préférences de recherche qui les révèlent.
 *
 * Distincte de la case CGU de l'inscription : le RGPD veut un consentement
 * séparé, explicite et informé pour ces données. Jamais pré-cochée. Même
 * forme que la case de l'inscription pour rester dans la charte.
 */
export const COPY_CONSENT_SENSIBLE = {
  label:
    'J’accepte que Libre enregistre mon orientation, mon identité de genre, mes pratiques et les personnes que je cherche, pour me proposer des profils qui me correspondent.',
  suite: 'Je peux retirer ce choix à tout moment dans Paramètres › Données sensibles : ces informations seront alors effacées.',
  requis: 'Coche la case pour enregistrer ces informations.',
};

export interface ConsentSensibleFieldProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  id?: string;
}

export default function ConsentSensibleField({ checked, onChange, id = 'consent-sensible' }: ConsentSensibleFieldProps) {
  return (
    <div className="flex items-start gap-2 rounded-md border border-hairline bg-fill-subtle p-3">
      <input
        id={id}
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="mt-0.5 h-4 w-4 shrink-0 rounded border-hairline-strong text-coral focus:ring-coral"
      />
      <label htmlFor={id} className="text-xs leading-snug text-muted">
        {COPY_CONSENT_SENSIBLE.label}{' '}
        {COPY_CONSENT_SENSIBLE.suite}{' '}
        <Link href="/confidentialite" className="text-coral hover:underline">En savoir plus</Link>
      </label>
    </div>
  );
}
