'use client';

import { useEffect, useState, useCallback } from 'react';
import OnlineIndicator from '@/components/OnlineIndicator';
import VerificationBadge from '@/components/VerificationBadge';
import { isOnline, formatLastSeen } from '@/lib/time';

interface PublicProfile {
  id: string;
  displayName: string;
  isVerified: boolean;
  lastActive: string;
  bio?: string | null;
  birthDate?: string | null;
  genderIdentity?: string | null;
  orientation?: string | null;
  interests?: string[];
  practices?: string[];
  photos?: string[];
  relationshipType?: string | null;
  publicKey?: string | null;
}

interface ProfileModalProps {
  userId: string;
  open: boolean;
  onClose: () => void;
}

function calculateAge(birthDate: string): number {
  const today = new Date();
  const birth = new Date(birthDate);
  let age = today.getFullYear() - birth.getFullYear();
  const monthDiff = today.getMonth() - birth.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
    age--;
  }
  return age;
}

function Spinner() {
  return (
    <div className="flex h-48 items-center justify-center">
      <div className="h-8 w-8 animate-spin rounded-full border-2 border-gray-300 border-t-coral" />
    </div>
  );
}

export default function ProfileModal({ userId, open, onClose }: ProfileModalProps) {
  const [profile, setProfile] = useState<PublicProfile | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedPhoto, setSelectedPhoto] = useState(0);

  useEffect(() => {
    if (!open) {
      setProfile(null);
      setError(null);
      setSelectedPhoto(0);
      return;
    }

    let cancelled = false;
    setLoading(true);
    setError(null);

    fetch(`/api/users/${userId}`)
      .then((res) => {
        if (!res.ok) {
          if (res.status === 404) throw new Error('Utilisateur introuvable');
          throw new Error('Une erreur est survenue');
        }
        return res.json();
      })
      .then((data) => {
        if (!cancelled) {
          setProfile(data);
          setLoading(false);
        }
      })
      .catch((err) => {
        if (!cancelled) {
          setError(err.message);
          setLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [open, userId]);

  // Close on Escape
  useEffect(() => {
    if (!open) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [open, onClose]);

  // Prevent body scroll when modal is open
  useEffect(() => {
    if (open) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [open]);

  const handleBackdropClick = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      if (e.target === e.currentTarget) onClose();
    },
    [onClose],
  );

  if (!open) return null;

  const online = profile ? isOnline(new Date(profile.lastActive)) : false;
  const lastSeenText = profile ? formatLastSeen(new Date(profile.lastActive)) : '';
  const age = profile?.birthDate ? calculateAge(profile.birthDate) : null;
  const photos = profile?.photos ?? [];
  const mainPhoto = photos[selectedPhoto] ?? null;
  const initials = profile?.displayName?.charAt(0).toUpperCase() ?? '?';

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm"
      onClick={handleBackdropClick}
    >
      <div className="mx-4 w-full max-w-md max-h-[85vh] overflow-y-auto rounded-2xl bg-white shadow-xl dark:bg-gray-900">
        {/* Close button */}
        <button
          type="button"
          onClick={onClose}
          className="absolute right-4 top-4 z-10 flex h-8 w-8 items-center justify-center rounded-full bg-black/30 text-white transition-colors hover:bg-black/50"
          aria-label="Fermer"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
          </svg>
        </button>

        {loading && <Spinner />}

        {error && (
          <div className="flex flex-col items-center justify-center px-6 py-12">
            <div className="mb-3 text-4xl">😕</div>
            <p className="text-center text-gray-600 dark:text-gray-400">{error}</p>
            <button
              type="button"
              onClick={onClose}
              className="mt-4 rounded-full bg-coral px-6 py-2 text-sm font-medium text-white transition-colors hover:bg-coral-dark"
            >
              Fermer
            </button>
          </div>
        )}

        {profile && !loading && !error && (
          <div>
            {/* Photo section */}
            <div className="relative">
              {mainPhoto ? (
                <img
                  src={mainPhoto}
                  alt={profile.displayName}
                  className="h-72 w-full rounded-t-2xl object-cover"
                />
              ) : (
                <div className="flex h-72 w-full items-center justify-center rounded-t-2xl bg-gradient-to-br from-blush to-coral/20">
                  <span className="text-7xl font-bold text-coral">{initials}</span>
                </div>
              )}

              {/* Online indicator overlay */}
              <div className="absolute bottom-3 left-3 flex items-center gap-1.5 rounded-full bg-black/40 px-2.5 py-1 text-xs text-white">
                <OnlineIndicator online={online} />
                <span>{lastSeenText}</span>
              </div>
            </div>

            {/* Photo thumbnails */}
            {photos.length > 1 && (
              <div className="flex gap-2 overflow-x-auto px-4 py-2">
                {photos.map((photo, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => setSelectedPhoto(i)}
                    className={`h-14 w-14 flex-shrink-0 overflow-hidden rounded-lg border-2 transition-colors ${
                      i === selectedPhoto
                        ? 'border-coral'
                        : 'border-transparent hover:border-gray-300 dark:hover:border-gray-600'
                    }`}
                  >
                    <img src={photo} alt="" className="h-full w-full object-cover" />
                  </button>
                ))}
              </div>
            )}

            {/* Name, age, verified */}
            <div className="px-4 pt-3 pb-2">
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">
                  {profile.displayName}
                </h2>
                {age !== null && (
                  <span className="text-gray-500 dark:text-gray-400">{age}</span>
                )}
                <VerificationBadge isVerified={profile.isVerified} />
              </div>

              {profile.relationshipType && (
                <p className="mt-0.5 text-sm text-gray-500 dark:text-gray-400">
                  {profile.relationshipType}
                </p>
              )}
            </div>

            {/* Bio */}
            {profile.bio && (
              <div className="px-4 pb-3">
                <p className="whitespace-pre-line text-sm text-gray-700 dark:text-gray-300">
                  {profile.bio}
                </p>
              </div>
            )}

            {/* Tags */}
            <div className="px-4 pb-6">
              {profile.genderIdentity && (
                <div className="mb-3">
                  <h3 className="mb-1.5 text-xs font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500">
                    Genre
                  </h3>
                  <div className="flex flex-wrap gap-1.5">
                    <span className="inline-block rounded-full bg-blue-100 px-3 py-1 text-xs font-medium text-blue-800 dark:bg-blue-900/40 dark:text-blue-300">
                      {profile.genderIdentity}
                    </span>
                  </div>
                </div>
              )}

              {profile.orientation && (
                <div className="mb-3">
                  <h3 className="mb-1.5 text-xs font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500">
                    Orientation
                  </h3>
                  <div className="flex flex-wrap gap-1.5">
                    <span className="inline-block rounded-full bg-pink-100 px-3 py-1 text-xs font-medium text-pink-800 dark:bg-pink-900/40 dark:text-pink-300">
                      {profile.orientation}
                    </span>
                  </div>
                </div>
              )}

              {profile.interests && profile.interests.length > 0 && (
                <div className="mb-3">
                  <h3 className="mb-1.5 text-xs font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500">
                    Centres d&apos;intérêt
                  </h3>
                  <div className="flex flex-wrap gap-1.5">
                    {profile.interests.map((interest) => (
                      <span
                        key={interest}
                        className="inline-block rounded-full bg-gray-100 px-3 py-1 text-xs font-medium text-gray-700 dark:bg-gray-800 dark:text-gray-300"
                      >
                        {interest}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {profile.practices && profile.practices.length > 0 && (
                <div className="mb-3">
                  <h3 className="mb-1.5 text-xs font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500">
                    Pratiques
                  </h3>
                  <div className="flex flex-wrap gap-1.5">
                    {profile.practices.map((practice) => (
                      <span
                        key={practice}
                        className="inline-block rounded-full bg-purple-100 px-3 py-1 text-xs font-medium text-purple-800 dark:bg-purple-900/40 dark:text-purple-300"
                      >
                        {practice}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}