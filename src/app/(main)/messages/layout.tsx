import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Messages',
  description: 'Vos matchs et conversations sur Libre. Chat chiffré de bout en bout.',
  alternates: { canonical: '/messages' },
};

export default function MessagesLayout({ children }: { children: React.ReactNode }) {
  return children;
}
