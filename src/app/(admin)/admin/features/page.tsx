import FeatureSwitches from '@/components/admin/FeatureSwitches';

/** Interrupteurs de fonctionnalités (#418) — coupe-feu sans redéploiement. */
export default function AdminFeaturesPage() {
  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="mb-2 text-2xl font-bold text-content">Fonctionnalités</h1>
      <p className="mb-6 text-sm text-muted">
        Coupe ou remet une partie de Libre, avec effet immédiat pour tout le monde. Les membres voient
        « en pause », jamais « désactivé ». Chaque changement est journalisé.
      </p>
      <FeatureSwitches />
    </div>
  );
}
