import { SiteNavView } from '@/components/ui/SiteNav';

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col bg-background">
      {/* Navbar unifiée du site (#281, épic #273) : variante guest, comme partout
          ailleurs (marque + Manifesto + Se connecter / Créer un compte). Aucun
          sélecteur de thème — auth est un contexte invité, le thème est celui par
          défaut du site (comme la landing). Remplace le ThemeMenu + le logo
          centré recodés. La marque de la navbar tient lieu de logo. */}
      <SiteNavView variant="guest" />
      <div className="flex flex-1 flex-col items-center justify-center px-4 py-8">
        <div className="w-full max-w-md rounded-card bg-surface p-8 shadow-soft ring-1 ring-hairline">{children}</div>
      </div>
    </div>
  );
}
