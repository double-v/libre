/**
 * Garde-fous éditoriaux (spec 007, US3) — le contrôle que le serveur rejoue à
 * chaque publication.
 *
 * Le jeu de référence (SC-004) porte un exemple qui doit déclencher et un qui
 * ne doit pas, pour chaque motif. Les trois premières publications prévues
 * (SC-007) doivent passer sans alerte bloquante.
 */
import { describe, it, expect } from 'vitest';
import { controler, verifierPublication } from '../garde-fous';

const REFERENCE: Array<[motif: string, declenche: string, passe: string]> = [
  ['vocabulaire-detection', 'Nous avons ajusté le seuil de détection.', 'On a renforcé la lutte contre les faux profils.'],
  ['faiblesse', 'Une faille permettait de voir les photos.', 'Vos photos sont mieux protégées.'],
  ['chemin-technique', 'Voir /api/users/photos pour le détail.', 'Voir la page /manifesto.'],
  ['nom-de-fichier', 'Le fichier garde-fous.ts a changé.', 'Un fichier de photo est plus léger.'],
  ['version', 'Passage en v2.4.1 cette semaine.', 'Deuxième version du profil, cette semaine.'],
  ['dependance', 'Nous utilisons Prisma et Vercel.', 'Nous utilisons des outils libres.'],
  ['chiffre-moderation', '12 comptes ont été bannis ce mois-ci.', 'Chaque signalement est lu par une personne.'],
  ['courriel', 'Écris-nous à contact@exemple.fr.', 'Écris-nous depuis la page de contact.'],
  ['telephone', 'Appelle le 06 12 34 56 78.', 'Appelle un proche en cas de doute.'],
  ['identifiant', 'Méfie-toi de @lola_privee75.', 'Méfie-toi des profils trop parfaits.'],
  ['lien-externe', 'Lis [cet article](https://presse.example/arnaques).', 'Lis [le manifeste](https://www.getlibre.fr/manifesto).'],
  ['cote-detection', 'Nous bloquons les messages suspects.', 'Personne de sincère ne te demandera d’argent.'],
  ['chiffre-exact', 'Nous sommes 103 inscrits !', 'Nous sommes plus de 100 inscrits !'],
];

describe('controler — jeu de référence (SC-004)', () => {
  it.each(REFERENCE)('%s : déclenche sur l’exemple, pas sur la reformulation', (motif, declenche, passe) => {
    expect(controler('Titre', declenche).map((a) => a.motif)).toContain(motif);
    expect(controler('Titre', passe).map((a) => a.motif)).not.toContain(motif);
  });

  it('le titre est contrôlé comme le corps', () => {
    expect(controler('Écris à contact@exemple.fr', 'Rien.').map((a) => a.motif)).toContain('courriel');
  });

  it('une alerte porte extrait, règle, motif, caractère bloquant et empreinte stable', () => {
    const [a] = controler('Titre', 'Écris-nous à contact@exemple.fr.');
    expect(a).toMatchObject({ regle: 'r5', motif: 'courriel', extrait: 'contact@exemple.fr', bloquante: true });
    expect(a.empreinte).toMatch(/^[0-9a-f]{16}$/);
    expect(controler('Autre titre', 'Encore contact@exemple.fr')[0].empreinte).toBe(a.empreinte);
  });

  it('un même extrait répété ne donne qu’une alerte', () => {
    expect(controler('T', '@lola et encore @lola').filter((a) => a.motif === 'identifiant')).toHaveLength(1);
  });

  it('un e-mail n’est pas aussi signalé comme @identifiant', () => {
    expect(controler('T', 'contact@exemple.fr').map((a) => a.motif)).toEqual(['courriel']);
  });
});

describe('verifierPublication', () => {
  const corps = 'Voir /api/journal et @lola_privee.';
  const alertes = controler('T', corps);

  it('refuse tant qu’une alerte levable n’est pas levée', () => {
    const r = verifierPublication({ titre: 'T', corps, levees: [alertes[0].empreinte], reglesRelues: true });
    expect(r).toMatchObject({ ok: false, motif: 'non-levee' });
  });

  it('accepte quand tout est levé et les règles relues ; rend les règles levées', () => {
    const r = verifierPublication({ titre: 'T', corps, levees: alertes.map((a) => a.empreinte), reglesRelues: true });
    expect(r).toEqual({ ok: true, reglesLevees: ['r3', 'r5'] });
  });

  it('exige la case « règles relues » même sans alerte (FR-018)', () => {
    expect(verifierPublication({ titre: 'T', corps: 'Bonne nouvelle.', levees: [], reglesRelues: false }))
      .toMatchObject({ ok: false, motif: 'regles-non-relues' });
  });

  it('une alerte bloquante ne se lève pas, même avec son empreinte (FR-016)', () => {
    const c = 'Écris-nous à contact@exemple.fr.';
    const levees = controler('T', c).map((a) => a.empreinte);
    expect(verifierPublication({ titre: 'T', corps: c, levees, reglesRelues: true })).toMatchObject({ ok: false, motif: 'bloquante' });
  });

  it('modifier l’extrait levé rejoue l’alerte (FR-019)', () => {
    const levees = alertes.map((a) => a.empreinte);
    const r = verifierPublication({ titre: 'T', corps: 'Voir /api/admin et @lola_privee.', levees, reglesRelues: true });
    expect(r).toMatchObject({ ok: false, motif: 'non-levee' });
  });
});

describe('les trois premières publications prévues (SC-007)', () => {
  const PUBLICATIONS: Array<[string, string]> = [
    [
      'Du nouveau pour vos photos et votre confiance',
      'Deux changements sont en ligne.\n\n- Vos photos sont désormais nettoyées de leurs informations cachées avant d’être partagées.\n- Tu peux obtenir un badge vérifié en prenant un selfie : il montre aux autres que ton profil est bien le tien.\n\nMerci pour vos retours, ils guident chaque étape.',
    ],
    [
      'Rencontrer sans se faire arnaquer',
      'Des faux profils circulent sur toutes les apps de rencontre. Quelques signes ne trompent pas :\n\n- on te propose très vite de continuer la conversation ailleurs ;\n- on te demande de l’argent, ou de payer en coupons prépayés achetés en bureau de tabac ;\n- on t’envoie un lien à ouvrir.\n\nPersonne de sincère ne te demandera de payer pour une rencontre. En cas de doute, **ne paie rien** et utilise le bouton Signaler : une personne de l’équipe lira ton signalement.',
    ],
    [
      'Plus de 100 inscrit·es : merci !',
      'Libre a passé le cap des 100 inscrit·es. C’est encore une petite communauté, et c’est ce qui la rend précieuse.\n\nMerci d’être là dès le début. Parle de Libre autour de toi si le projet te plaît : chaque nouvelle personne rend les rencontres plus riches.',
    ],
  ];

  it.each(PUBLICATIONS)('« %s » : aucune alerte bloquante', (titre, corps) => {
    expect(controler(titre, corps).filter((a) => a.bloquante)).toEqual([]);
  });
});
