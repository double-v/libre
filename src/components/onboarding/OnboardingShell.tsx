'use client';

import type { ReactNode } from 'react';
import SiteShell from '@/components/ui/SiteShell';
import Button from '@/components/ui/Button';
import { ONBOARDING_STEPS } from '@/lib/onboarding';

/**
 * Cadre commun des écrans du parcours d'accueil (spec 005, DESIGN.md
 * « Parcours d'accueil »). La progression est trois segments fins, sans
 * chiffre : elle se sent, elle ne se compte pas. « Plus tard » est toujours
 * là, jamais désactivé — aucune étape ne bloque (FR-006).
 */
export interface OnboardingShellProps {
  /** Index de l'étape (0..2) ; absent sur l'écran push, qui n'en est pas une. */
  step?: number;
  eyebrow?: string;
  title: string;
  lead: string;
  children: ReactNode;
  primary?: { label: string; onClick: () => void; loading?: boolean; disabled?: boolean };
  onLater: () => void;
  laterLabel?: string;
}

export default function OnboardingShell({
  step,
  eyebrow,
  title,
  lead,
  children,
  primary,
  onLater,
  laterLabel = 'Plus tard',
}: OnboardingShellProps) {
  return (
    <SiteShell as="section" width="app" className="py-6 md:pt-11">
      {step !== undefined && (
        <div data-testid="onboarding-progress" aria-hidden="true" className="mb-5 flex gap-1.5">
          {ONBOARDING_STEPS.map((name, i) => {
            const state = i < step ? 'done' : i === step ? 'on' : 'todo';
            return (
              <i
                key={name}
                data-state={state}
                className={`h-[3px] flex-1 rounded-full ${
                  state === 'on' ? 'bg-coral' : state === 'done' ? 'bg-coral-light' : 'bg-fill-subtle'
                }`}
              />
            );
          })}
        </div>
      )}
      {eyebrow && (
        <p className="mb-1.5 text-xs font-semibold uppercase tracking-wider text-muted">{eyebrow}</p>
      )}
      <h1 className="mb-2 text-2xl font-bold leading-tight text-content">{title}</h1>
      <p className="mb-5 text-[15px] leading-relaxed text-muted">{lead}</p>

      {children}

      <div className="mt-6 flex flex-col gap-2">
        {primary && (
          <Button
            type="button"
            variant="primary"
            fullWidth
            onClick={primary.onClick}
            loading={primary.loading}
            disabled={primary.disabled}
          >
            {primary.label}
          </Button>
        )}
        <Button type="button" variant="ghost" fullWidth onClick={onLater}>
          {laterLabel}
        </Button>
      </div>
    </SiteShell>
  );
}
