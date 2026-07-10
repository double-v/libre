// Étapes du panneau latéral du hero, ton « tu » on-brand (PRODUCT.md). Reforme
// concise du « Comment ça marche » de l'ancienne home ; les détails (géoloc,
// chiffrement E2E, sans limite) sont conservés dans les sections bas (#249).
const STEPS = [
  { title: 'Crée ton profil', desc: 'Gratuit, sans carte bleue, vérifié par une vraie personne.' },
  { title: 'Discute librement', desc: 'À ton rythme, sans score ni classement.' },
  { title: 'Rencontre pour de vrai', desc: 'Toi, seul·e juge de la suite.' },
];

/**
 * Panneau « Comment ça marche » du hero (#247, épic #243).
 *
 * Note : le prototype **validé** `HomepageLobby.dc.html` a remplacé le roster
 * « présence live » (bloqué RGPD, cf. libellé d'origine du ticket) par ces 3
 * étapes. On implémente donc la version validée : aucun profil réel exposé, aucun
 * enjeu vie privée. Liste ordonnée (`<ol>`) pour la sémantique ; le numéro visuel
 * est décoratif. Styles `.lobby-steps*` (tokens `--lobby-*`).
 */
export default function LobbySteps() {
  return (
    <div className="lobby-steps">
      <h2 className="lobby-steps__header">Comment ça marche</h2>
      <ol className="lobby-steps__list">
        {STEPS.map((step, i) => (
          <li key={step.title} className="lobby-steps__card">
            <span className="lobby-steps__num" aria-hidden="true">
              {i + 1}
            </span>
            <div className="lobby-steps__body">
              <p className="lobby-steps__title">{step.title}</p>
              <p className="lobby-steps__desc">{step.desc}</p>
            </div>
          </li>
        ))}
      </ol>
    </div>
  );
}
