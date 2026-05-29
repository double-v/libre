import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'La Place',
  description: 'Place publique anonyme sur Libre',
  alternates: { canonical: '/square' },
};

export default function SquareLayout({ children }: { children: React.ReactNode }) {
  return children;
}