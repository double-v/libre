'use client';

import { useState } from 'react';

interface EmptyStateCardsProps {
  /** Context label, e.g. "à proximité" or "en ligne" */
  context: string;
}

const placeholderProfiles = [
  { name: 'Quelqu\'un de sympa ?', bio: 'En attente de quelqu\'un comme toi…' },
  { name: 'Ton prochain match ?', bio: 'Pas encore de profil à afficher.' },
  { name: 'Une personne géniale', bio: 'Reviens bientôt pour découvrir !' },
];

export default function EmptyStateCards({ context }: EmptyStateCardsProps) {
  const [copied, setCopied] = useState(false);

  const handleShare = async () => {
    const url = `${window.location.origin}/register?ref=empty`;
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      const input = document.createElement('input');
      input.value = url;
      document.body.appendChild(input);
      input.select();
      document.execCommand('copy');
      document.body.removeChild(input);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="mx-auto max-w-lg px-4 py-6">
      <p className="mb-6 text-center text-gray-500 dark:text-gray-400">
        Personne {context} pour le moment
      </p>

      <div className="space-y-4">
        {placeholderProfiles.map((profile, i) => (
          <div
            key={i}
            className="animate-fade-in rounded-xl border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-700 dark:bg-gray-900"
            style={{ animationDelay: `${i * 100}ms` }}
          >
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gray-100 dark:bg-gray-800">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-gray-400">
                  <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2" />
                  <circle cx="12" cy="7" r="4" />
                </svg>
              </div>
              <div>
                <p className="font-medium text-gray-400 dark:text-gray-500">{profile.name}</p>
                <p className="text-sm text-gray-300 dark:text-gray-600">{profile.bio}</p>
              </div>
            </div>
          </div>
        ))}

        {/* CTA card */}
        <div className="animate-fade-in rounded-xl border-2 border-dashed border-coral/40 bg-blush p-4 dark:border-coral/30 dark:bg-coral/5" style={{ animationDelay: '300ms' }}>
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-coral/10">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-coral">
                <path d="M4 12v8a2 2 0 002 2h12a2 2 0 002-2v-8" />
                <polyline points="16 6 12 2 8 6" />
                <line x1="12" y1="2" x2="12" y2="15" />
              </svg>
            </div>
            <div className="flex-1">
              <p className="font-medium text-coral dark:text-coral-light">Invite quelqu&apos;un sur Libre</p>
              <p className="text-sm text-gray-500 dark:text-gray-400">Partage le lien et agrandis la communauté</p>
            </div>
            <button
              onClick={handleShare}
              className="rounded-full bg-coral px-4 py-2 text-sm font-medium text-white hover:bg-coral-dark dark:bg-terracotta dark:hover:bg-coral"
            >
              {copied ? '✓ Copié !' : 'Copier le lien'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}