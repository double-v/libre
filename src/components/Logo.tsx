import Link from 'next/link';

export default function Logo({ className = '' }: { className?: string }) {
  return (
    <Link
      href="/"
      className={`inline-flex items-center gap-2 text-coral focus:outline-none focus:ring-2 focus:ring-coral focus:ring-offset-2 rounded-sm ${className}`}
      aria-label="Libre — Retour à l'accueil"
    >
      <svg viewBox="76 36 360 360" className="h-8 w-8" fill="currentColor" aria-hidden="true">
        <rect x="236" y="42" width="40" height="120" rx="20" transform="rotate(-60 256 188)"/>
        <rect x="236" y="42" width="40" height="120" rx="20" transform="rotate(-30 256 188)"/>
        <rect x="236" y="42" width="40" height="120" rx="20"/>
        <rect x="236" y="42" width="40" height="120" rx="20" transform="rotate(30 256 188)"/>
        <rect x="236" y="42" width="40" height="120" rx="20" transform="rotate(60 256 188)"/>
        <path d="M256,195 C256,170 218,130 180,130 C130,130 105,175 105,215 C105,300 256,375 256,390 C256,375 407,300 407,215 C407,175 382,130 332,130 C294,130 256,170 256,195 Z"/>
      </svg>
      <span className="text-2xl font-bold tracking-tight">Libre</span>
    </Link>
  );
}