import Link from 'next/link';
import HeartMark from '@/components/ui/HeartMark';

export default function Logo({ className = '' }: { className?: string }) {
  return (
    <Link
      href="/"
      className={`inline-flex items-center gap-2 text-coral focus:outline-none focus:ring-2 focus:ring-coral focus:ring-offset-2 rounded-sm ${className}`}
      aria-label="Libre — Retour à l'accueil"
    >
      {/* Logo de référence unique (#294) : le cœur de la marque (HeartMark). */}
      <HeartMark className="h-8 w-8" />
      <span className="text-2xl font-bold tracking-tight">Libre</span>
    </Link>
  );
}