import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Matches',
  description: 'Vos matchs sur Libre. Chat chiffré de bout en bout.',
  alternates: { canonical: '/matches' },
};

export default function MatchesLayout({ children }: { children: React.ReactNode }) {
  return children;
}