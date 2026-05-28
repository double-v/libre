import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Croisements',
  description: 'Les personnes que vous avez croisées dans la journée. Likez, si c\'est mutuel le chat s\'ouvre.',
  alternates: { canonical: '/crossings' },
};

export default function CrossingsLayout({ children }: { children: React.ReactNode }) {
  return children;
}