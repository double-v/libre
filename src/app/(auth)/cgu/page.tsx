import Link from 'next/link';

export default function CGUPage() {
  return (
    <div className="mx-auto max-w-2xl space-y-8 py-8">
      <div className="text-center">
        <h1 className="text-2xl font-bold">Conditions g&eacute;n&eacute;rales d&apos;utilisation</h1>
        <p className="mt-1 text-sm text-gray-500">Derni&egrave;re mise &agrave; jour : mai 2026</p>
      </div>

      <Link href="/" className="inline-block text-sm font-medium text-indigo-600 hover:text-indigo-500">
        &larr; Retour &agrave; l&apos;accueil
      </Link>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">1. Objet</h2>
        <p className="text-sm text-gray-700">
          PeterlGame est une application de rencontre gratuite, non commerciale, fond&eacute;e sur le
          matching g&eacute;olocalis&eacute; et le chiffrement de bout en bout des conversations. Le service
          est fourni sans aucun frais et sans abonnement.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">2. Inscription</h2>
        <p className="text-sm text-gray-700">
          L&apos;inscription est gratuite et ouverte &agrave; toute personne &acirc;g&eacute;e de 18 ans ou plus.
          Vous devez fournir des informations exactes lors de votre inscription. Toute fausse
          d&eacute;claration entra&icirc;nera la suspension du compte.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">3. Donn&eacute;es personnelles</h2>
        <ul className="list-disc space-y-1 pl-5 text-sm text-gray-700">
          <li>Aucune donn&eacute;e n&apos;est revendue &agrave; des tiers.</li>
          <li>Les messages sont chiffr&eacute;s de bout en bout ; seuls les interlocuteurs peuvent les lire.</li>
          <li>La suppression de votre compte entra&icirc;ne l&apos;effacement complet de toutes vos donn&eacute;es (conform&eacute;ment au RGPD).</li>
          <li>Les donn&eacute;es de g&eacute;olocalisation sont flout&eacute;es &agrave; environ 100 m&egrave;tres afin de prot&eacute;ger votre vie priv&eacute;e.</li>
        </ul>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">4. Responsabilit&eacute;</h2>
        <p className="text-sm text-gray-700">
          Le service est fourni en l&apos;&eacute;tat, sans garantie de disponibilit&eacute; ou de performance.
          PeterlGame &eacute;tant un projet non commercial, aucune obligation de r&eacute;sultat ni de moyen
          ne s&apos;applique. L&apos;&eacute;quipe ne saurait &ecirc;tre tenue responsable des rencontres
          r&eacute;alis&eacute;es via la plateforme.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">5. Mod&eacute;ration</h2>
        <ul className="list-disc space-y-1 pl-5 text-sm text-gray-700">
          <li>La mod&eacute;ration est communautaire : tout utilisateur peut signaler un comportement inappropri&eacute;.</li>
          <li>Un syst&egrave;me de signalement permet de rapporter tout abus.</li>
          <li>Un badge de v&eacute;rification est disponible pour les profils authentifi&eacute;s.</li>
        </ul>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">6. Comportement</h2>
        <ul className="list-disc space-y-1 pl-5 text-sm text-gray-700">
          <li>Le respect mutuel est obligatoire.</li>
          <li>Tout harc&egrave;lement, spam ou faux profil sera sanctionn&eacute; par la suspension du compte.</li>
          <li>Un quota de 50 likes par jour est appliqu&eacute; pour pr&eacute;venir les usages abusifs.</li>
        </ul>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">7. R&eacute;siliation</h2>
        <p className="text-sm text-gray-700">
          Vous pouvez supprimer votre compte &agrave; tout moment depuis la page Profil. La suppression
          entra&icirc;ne l&apos;effacement int&eacute;gral de vos donn&eacute;es conform&eacute;ment au RGPD.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">8. Propri&eacute;t&eacute; intellectuelle</h2>
        <p className="text-sm text-gray-700">
          Le code source de PeterlGame est distribu&eacute; sous licence
          PolyForm Noncommercial 1.5.0. Toute utilisation commerciale du code est interdite sans
          autorisation expresse.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">9. Droit applicable</h2>
        <p className="text-sm text-gray-700">
          Les pr&eacute;sentes conditions sont r&eacute;gies par le droit fran&ccedil;ais. Tout litige sera soumis
          aux tribunaux comp&eacute;tents de France.
        </p>
      </section>

      <div className="border-t border-gray-200 pt-6 text-center">
        <Link href="/" className="text-sm font-medium text-indigo-600 hover:text-indigo-500">
          &larr; Retour &agrave; l&apos;accueil
        </Link>
      </div>
    </div>
  );
}