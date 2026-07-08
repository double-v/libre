'use client';

/**
 * /settings/trust — Page "Mon Cercle de Confiance"
 *
 * Cf. chantier 01 — Phase 3, tâche 3.4.
 *
 * 2 onglets :
 * - "Mon Cercle" : liste des contacts + ajout via bottom-sheet
 * - "Mon niveau" : TrustBadge + jauge 4 bands + liste des facteurs
 *
 * UX "ajouter un contact" : V1 = Libre-only, on sélectionne parmi nos
 * matches (cf. décision #43). Si 0 match → empty state dédié.
 */
import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { TrustBadge } from '@/components/TrustBadge';
import type { TrustBand } from '@/lib/trust/compute-level';

type Tab = 'cercle' | 'niveau';

interface TrustLevelResponse {
  band: TrustBand;
  score: number;
  factors: Array<{ label: string; delta: number; achieved: boolean }>;
}

interface Contact {
  id: string; // trustContact id
  contact: {
    id: string;
    displayName: string;
    isVerified: boolean;
    lastActive: string;
    avatarUrl: string | null;
  };
  createdAt: string;
}

interface MatchUser {
  id: string;
  displayName: string;
  isVerified: boolean;
  avatarUrl: string | null;
}

const BAND_LABEL: Record<TrustBand, string> = {
  newcomer: 'Nouveau',
  member: 'Membre',
  trusted: 'Fiable',
  anchor: 'Ancre',
};

const BAND_ORDER: TrustBand[] = ['newcomer', 'member', 'trusted', 'anchor'];

const NEXT_BAND_HINT: Record<TrustBand, string | null> = {
  newcomer:
    "Passe Membre en vérifiant ton email (+10) et en déclarant ton premier contact de Cercle (+10).",
  member:
    "Passe Fiable en complétant la vérification selfie (+20) — c'est le facteur le plus impactant.",
  trusted:
    "Passe Ancre avec un peu de patience : l'ancienneté et les interactions montent ton score naturellement.",
  anchor: null,
};

export default function TrustSettingsPage() {
  const router = useRouter();
  const [tab, setTab] = useState<Tab>('cercle');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [trust, setTrust] = useState<TrustLevelResponse | null>(null);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [showAdd, setShowAdd] = useState(false);

  const fetchAll = useCallback(async () => {
    try {
      setError('');
      const [trustRes, contactsRes] = await Promise.all([
        fetch('/api/trust/level'),
        fetch('/api/circle/contacts'),
      ]);
      if (trustRes.status === 401 || contactsRes.status === 401) {
        router.push('/login');
        return;
      }
      if (!trustRes.ok || !contactsRes.ok) {
        throw new Error('Failed to load trust data');
      }
      setTrust(await trustRes.json());
      const contactsData = await contactsRes.json();
      setContacts(contactsData.contacts ?? []);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erreur de chargement');
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    // IIFE async → pas de setState synchrone dans le corps de l'effet
    // (react-hooks/set-state-in-effect, cf. #179/#193).
    void (async () => {
      await fetchAll();
    })();
  }, [fetchAll]);

  async function handleRemove(contactId: string) {
    if (!confirm('Retirer ce contact de ton Cercle ?')) return;
    try {
      const res = await fetch(`/api/circle/contacts/${contactId}`, {
        method: 'DELETE',
      });
      if (!res.ok) throw new Error('Failed to remove');
      setContacts((cs) => cs.filter((c) => c.id !== contactId));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erreur de suppression');
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-gray-600">Chargement…</p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-lg px-4 py-6">
      <div className="mb-4 flex items-center gap-3">
        <button
          type="button"
          onClick={() => router.back()}
          aria-label="Retour"
          className="rounded-full p-2 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-coral"
        >
          <svg
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            aria-hidden="true"
          >
            <path d="M19 12H5M12 19l-7-7 7-7" />
          </svg>
        </button>
        <h1 className="text-2xl font-bold text-gray-900">Mon Cercle</h1>
      </div>

      {error && (
        <div
          role="alert"
          className="mb-4 rounded-md bg-red-50 p-3 text-sm text-red-700"
        >
          {error}
        </div>
      )}

      {/* Onglets */}
      <div
        role="tablist"
        aria-label="Sections des paramètres de confiance"
        className="mb-4 flex rounded-xl border border-gray-200 bg-white p-1"
      >
        <TabButton
          active={tab === 'cercle'}
          onClick={() => setTab('cercle')}
          label="Mon Cercle"
        />
        <TabButton
          active={tab === 'niveau'}
          onClick={() => setTab('niveau')}
          label="Mon niveau"
        />
      </div>

      {tab === 'cercle' ? (
        <CercleTab
          contacts={contacts}
          onAddClick={() => setShowAdd(true)}
          onRemove={handleRemove}
        />
      ) : (
        <NiveauTab trust={trust} />
      )}

      {showAdd && (
        <AddContactSheet
          existingContactIds={new Set(contacts.map((c) => c.contact.id))}
          onClose={() => setShowAdd(false)}
          onAdded={(c) => {
            setContacts((cs) => [c, ...cs]);
            setShowAdd(false);
            // Le score a changé → re-fetch pour mettre à jour l'onglet niveau
            fetch('/api/trust/level')
              .then((r) => r.json())
              .then((d) => setTrust(d))
              .catch(() => undefined);
          }}
        />
      )}
    </div>
  );
}

function TabButton({
  active,
  onClick,
  label,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
}) {
  return (
    <button
      type="button"
      role="tab"
      aria-selected={active}
      onClick={onClick}
      className={`flex-1 rounded-lg px-3 py-2 text-sm font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-coral ${
        active
          ? 'bg-coral text-white'
          : 'text-gray-700 hover:bg-gray-50'
      }`}
    >
      {label}
    </button>
  );
}

// ────────────────────────────────────────────────────────────────────────────
// Onglet Mon Cercle
// ────────────────────────────────────────────────────────────────────────────

function CercleTab({
  contacts,
  onAddClick,
  onRemove,
}: {
  contacts: Contact[];
  onAddClick: () => void;
  onRemove: (id: string) => void;
}) {
  if (contacts.length === 0) {
    return (
      <section className="rounded-xl border border-gray-200 bg-white p-6 text-center">
        <div
          className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-coral/10"
          aria-hidden="true"
        >
          <span className="text-2xl">🤝</span>
        </div>
        <h2 className="mb-1 text-lg font-semibold text-gray-900">
          Tu n&apos;as pas encore de Cercle
        </h2>
        <p className="mb-4 text-sm text-gray-600">
          C&apos;est ton filet de sécurité pour tes futures rencontres.
        </p>
        <button
          type="button"
          onClick={onAddClick}
          className="rounded-md bg-coral px-4 py-2 text-sm font-medium text-white hover:bg-coral-dark focus:outline-none focus:ring-2 focus:ring-coral focus:ring-offset-2"
        >
          + Ajouter un contact
        </button>
      </section>
    );
  }

  return (
    <section className="space-y-3">
      <p className="text-sm text-gray-600">
        {contacts.length} contact{contacts.length > 1 ? 's' : ''} de confiance
      </p>
      <ul className="space-y-2">
        {contacts.map((c) => (
          <li
            key={c.id}
            className="flex items-center gap-3 rounded-xl border border-gray-200 bg-white p-3"
          >
            <Avatar url={c.contact.avatarUrl} name={c.contact.displayName} />
            <div className="flex-1">
              <p className="font-medium text-gray-900">
                {c.contact.displayName}
                {c.contact.isVerified && (
                  <span
                    aria-label="vérifié"
                    className="ml-1 text-coral"
                    title="Identité vérifiée"
                  >
                    ✓
                  </span>
                )}
              </p>
            </div>
            <button
              type="button"
              onClick={() => onRemove(c.id)}
              aria-label={`Retirer ${c.contact.displayName} du Cercle`}
              className="rounded-md p-1 text-gray-400 hover:bg-red-50 hover:text-red-600 focus:outline-none focus:ring-2 focus:ring-coral"
            >
              <svg
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                aria-hidden="true"
              >
                <path d="M3 6h18M8 6V4a2 2 0 012-2h4a2 2 0 012 2v2M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6" />
              </svg>
            </button>
          </li>
        ))}
      </ul>
      <button
        type="button"
        onClick={onAddClick}
        className="w-full rounded-xl border-2 border-dashed border-coral/40 bg-coral/5 px-4 py-3 text-sm font-medium text-coral hover:bg-coral/10 focus:outline-none focus:ring-2 focus:ring-coral"
      >
        + Ajouter un contact
      </button>
    </section>
  );
}

function Avatar({ url, name }: { url: string | null; name: string }) {
  if (url) {
    // eslint-disable-next-line @next/next/no-img-element
    return (
      <img
        src={url}
        alt={`Photo de ${name}`}
        className="h-10 w-10 rounded-full object-cover"
      />
    );
  }
  const initial = name.charAt(0).toUpperCase();
  return (
    <div
      aria-hidden="true"
      className="flex h-10 w-10 items-center justify-center rounded-full bg-coral/15 text-coral-dark"
    >
      <span className="font-semibold">{initial}</span>
    </div>
  );
}

// ────────────────────────────────────────────────────────────────────────────
// Onglet Mon niveau
// ────────────────────────────────────────────────────────────────────────────

function NiveauTab({ trust }: { trust: TrustLevelResponse | null }) {
  if (!trust) return null;
  const { band, score, factors } = trust;
  const currentIdx = BAND_ORDER.indexOf(band);
  const hint = NEXT_BAND_HINT[band];

  return (
    <section className="space-y-5">
      <div className="flex flex-col items-center rounded-xl border border-gray-200 bg-white p-6">
        <TrustBadge band={band} size="lg" showLabel />
        <p className="mt-3 text-sm text-gray-600">
          Score actuel : <span className="font-semibold text-coral-dark">{score}</span>
        </p>
      </div>

      {/* Jauge 4 étapes */}
      <ol
        aria-label="Progression du niveau de confiance"
        className="flex items-center justify-between"
      >
        {BAND_ORDER.map((b, i) => {
          const reached = i <= currentIdx;
          return (
            <li
              key={b}
              className="flex flex-1 flex-col items-center"
              aria-current={i === currentIdx ? 'step' : undefined}
            >
              <span
                className={`mb-1 h-3 w-3 rounded-full ${
                  reached
                    ? i === currentIdx
                      ? 'bg-coral ring-4 ring-coral/20'
                      : 'bg-coral'
                    : 'bg-gray-200'
                }`}
                aria-hidden="true"
              />
              <span
                className={`text-xs ${reached ? 'font-semibold text-coral-dark' : 'text-gray-500'}`}
              >
                {BAND_LABEL[b]}
              </span>
            </li>
          );
        })}
      </ol>

      {/* Facteurs */}
      <div className="rounded-xl border border-gray-200 bg-white p-4">
        <h2 className="mb-2 text-sm font-semibold text-gray-900">
          Comment ton score est calculé
        </h2>
        <ul className="space-y-2">
          {factors.map((f) => (
            <li
              key={f.label}
              className="flex items-center justify-between text-sm"
            >
              <span className="flex items-center gap-2 text-gray-700">
                <span
                  aria-hidden="true"
                  className={f.achieved ? 'text-coral' : 'text-gray-300'}
                >
                  {f.achieved ? '✓' : '○'}
                </span>
                {f.label}
              </span>
              <span
                className={`font-mono text-xs ${
                  f.delta > 0
                    ? 'text-coral-dark'
                    : f.delta < 0
                      ? 'text-red-600'
                      : 'text-gray-400'
                }`}
              >
                {f.delta > 0 ? `+${f.delta}` : f.delta}
              </span>
            </li>
          ))}
        </ul>
      </div>

      {/* CTA contextuel */}
      {hint && (
        <div className="rounded-xl border border-coral/20 bg-coral/5 p-4 text-sm text-coral-dark">
          {hint}
        </div>
      )}

      {/* Lien vers l'explication détaillée */}
      <a
        href="/trust/how-it-works"
        className="block text-center text-sm font-medium text-coral-dark underline decoration-coral/40 underline-offset-2 hover:decoration-coral"
      >
        Comment marche la confiance ?
      </a>
    </section>
  );
}

// ────────────────────────────────────────────────────────────────────────────
// Bottom-sheet d'ajout
// ────────────────────────────────────────────────────────────────────────────

function AddContactSheet({
  existingContactIds,
  onClose,
  onAdded,
}: {
  existingContactIds: Set<string>;
  onClose: () => void;
  onAdded: (c: Contact) => void;
}) {
  const [matches, setMatches] = useState<MatchUser[] | null>(null);
  const [loadingMatches, setLoadingMatches] = useState(true);
  const [addingId, setAddingId] = useState<string | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch('/api/matches');
        if (!res.ok) throw new Error('Failed to load matches');
        const data = await res.json();
        if (cancelled) return;
        // On aplatit en users (matches peuvent avoir userA/userB)
        const list: MatchUser[] = (data.matches ?? []).flatMap(
          (m: { userARel?: MatchUser; userBRel?: MatchUser }) => {
            const out: MatchUser[] = [];
            if (m.userARel) out.push(m.userARel);
            if (m.userBRel) out.push(m.userBRel);
            return out;
          },
        );
        // dédupe par id
        const seen = new Set<string>();
        setMatches(
          list.filter((u) => {
            if (seen.has(u.id)) return false;
            seen.add(u.id);
            return true;
          }),
        );
      } catch (e) {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : 'Erreur');
        }
      } finally {
        if (!cancelled) setLoadingMatches(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  async function handleAdd(contactId: string) {
    setAddingId(contactId);
    setError('');
    try {
      const res = await fetch('/api/circle/contacts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contactId }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'Erreur');
      }
      const data = await res.json();
      onAdded(data.contact);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erreur');
    } finally {
      setAddingId(null);
    }
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Ajouter un contact à mon Cercle"
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 sm:items-center"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-lg rounded-t-2xl bg-white p-5 shadow-lg sm:rounded-2xl"
      >
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900">
            Ajouter un contact
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Fermer"
            className="rounded-full p-1 text-gray-400 hover:bg-gray-100"
          >
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              aria-hidden="true"
            >
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>
        </div>

        <p className="mb-3 text-sm text-gray-600">
          Choisis parmi les utilisateurs avec qui tu as déjà matché.
        </p>

        {error && (
          <div role="alert" className="mb-3 rounded-md bg-red-50 p-2 text-sm text-red-700">
            {error}
          </div>
        )}

        {loadingMatches ? (
          <p className="py-6 text-center text-sm text-gray-500">Chargement…</p>
        ) : matches && matches.length > 0 ? (
          <ul className="max-h-80 space-y-2 overflow-y-auto">
            {matches.map((m) => {
              const already = existingContactIds.has(m.id);
              return (
                <li
                  key={m.id}
                  className="flex items-center gap-3 rounded-lg border border-gray-200 p-2"
                >
                  <Avatar url={m.avatarUrl} name={m.displayName} />
                  <span className="flex-1 font-medium text-gray-900">
                    {m.displayName}
                    {m.isVerified && (
                      <span className="ml-1 text-coral" title="vérifié">
                        ✓
                      </span>
                    )}
                  </span>
                  <button
                    type="button"
                    onClick={() => handleAdd(m.id)}
                    disabled={already || addingId === m.id}
                    className="rounded-md bg-coral px-3 py-1 text-sm font-medium text-white hover:bg-coral-dark focus:outline-none focus:ring-2 focus:ring-coral disabled:opacity-50"
                  >
                    {already
                      ? 'Déjà'
                      : addingId === m.id
                        ? '…'
                        : 'Ajouter'}
                  </button>
                </li>
              );
            })}
          </ul>
        ) : (
          <p className="py-6 text-center text-sm text-gray-500">
            Pas encore de match — fais tes premières rencontres pour pouvoir
            ajouter des contacts de confiance.
          </p>
        )}
      </div>
    </div>
  );
}
