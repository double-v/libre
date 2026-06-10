'use client';

import { useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';

interface VersionInfo {
  sha: string;
  buildTime: string;
}

const POLL_INTERVAL_MS = 60_000; // 1 minute — cheap, no-store endpoint
// Only show "new version available" banner after the user has been on the page
// long enough that a refresh isn't disruptive (e.g. mid-form-fill).
const MIN_DWELL_MS = 5_000;

/**
 * Watches /api/version and triggers a soft refresh when the build SHA changes
 * (new deploy). Skips the check for the first poll so we don't refresh on mount
 * if the build hasn't actually changed.
 *
 * Imported as a plain Client Component from the home page (Server Component).
 * No `next/dynamic` wrapper needed: this file already has 'use client', so
 * Next.js handles the boundary at the import site.
 */
export default function VersionWatcher({
  initialSha,
}: {
  initialSha: string;
}) {
  const router = useRouter();
  const mountedAt = useRef(Date.now());
  const lastSeenSha = useRef(initialSha);

  useEffect(() => {
    // Skip the very first poll — we already know initialSha.
    let isFirstPoll = true;

    const check = async () => {
      try {
        const res = await fetch('/api/version', { cache: 'no-store' });
        if (!res.ok) return;
        const data = (await res.json()) as VersionInfo;

        if (isFirstPoll) {
          isFirstPoll = false;
          lastSeenSha.current = data.sha;
          return;
        }

        if (data.sha && data.sha !== lastSeenSha.current) {
          // New deploy detected. Don't blow away a user mid-form.
          const dwell = Date.now() - mountedAt.current;
          if (dwell < MIN_DWELL_MS) return;
          // Soft refresh: re-fetch the RSC payload, no full reload, preserves
          // scroll + form state for the most part. If that's not enough, the
          // versioned asset hashes in the new HTML will force a hard reload
          // when the user navigates.
          router.refresh();
          lastSeenSha.current = data.sha;
        }
      } catch {
        // Network blip, ignore — next tick will retry.
      }
    };

    const id = setInterval(check, POLL_INTERVAL_MS);
    return () => clearInterval(id);
  }, [router]);

  return null;
}
