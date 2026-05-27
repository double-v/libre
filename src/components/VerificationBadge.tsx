export default function VerificationBadge({ isVerified }: { isVerified: boolean }) {
  if (!isVerified) return null;
  return (
    <span className="inline-flex items-center rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-800" title="Profil vérifié">
      ✓ Vérifié
    </span>
  );
}