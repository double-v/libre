import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: "PeterlGame — Notre but, c'est que vous quittiez l'appli",
  description: 'Application de rencontre gratuite, open source, sans abonnement ni revente de données.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr">
      <body className="antialiased">{children}</body>
    </html>
  );
}