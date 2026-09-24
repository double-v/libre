import PhotoMetadataPanel from '@/components/admin/PhotoMetadataPanel';
import RetentionPanel from '@/components/admin/RetentionPanel';

/**
 * Purge de rétention (#427) — état, bilan, lancement manuel ; et rattrapage
 * des métadonnées photo (#441), même famille : des données personnelles
 * qu'on ne garde plus.
 */
export default function AdminRetentionPage() {
  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="mb-2 text-2xl font-bold text-content">Rétention</h1>
      <p className="mb-6 text-sm text-muted">
        Les durées de conservation de la politique de confidentialité, appliquées par une purge
        quotidienne déclenchée par le trafic. Sans visite, rien ne tourne : cette page le dit, et
        permet de lancer à la main. Chaque lancement manuel est journalisé.
      </p>
      <RetentionPanel />
      <div className="mt-6">
        <PhotoMetadataPanel />
      </div>
    </div>
  );
}
