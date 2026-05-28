import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Messages',
  description: 'Vos conversations sur Libre. Chat chiffré de bout en bout.',
  robots: { index: false, follow: true },
};

export default function ChatLayout({ children }: { children: React.ReactNode }) {
  return children;
}