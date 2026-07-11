import Image from 'next/image';

/**
 * Section « Humains » de la landing lobby (#249, épic #243).
 *
 * Titre + chapô + 3 cartes récit (photo + légende). Le ton « tu » et la copy
 * suivent PRODUCT.md ; les visuels sont **inclusifs et divers**. Styles
 * `.lobby-humans*` / `.lobby-story*` (tokens `--lobby-*`, zéro hex inline).
 *
 * ⚠️ needs-design : les photos sont des **placeholders** repris de l'ancienne
 * home (`/images/moment-*.jpg`). À re-sourcer avec droits/consentement (cf. AC
 * #249). Les `alt` décrivent honnêtement le placeholder (composition), sans
 * asserter une identité non vérifiable visuellement ; la légende porte le récit.
 */
const STORIES = [
  {
    src: '/images/moment-3.jpg',
    alt: 'Un couple enlacé dans la lumière chaude du soir',
    lead: 'Duo hétéro',
    detail: 'rencontré il y a 4 mois',
  },
  {
    src: '/images/moment-1.jpg',
    alt: 'Deux femmes enlacées, complices, dans leur cuisine',
    lead: 'Duo de femmes',
    detail: 'en couple',
  },
  {
    src: '/images/moment-2.jpg',
    alt: 'Deux personnes qui rient, l’une enlaçant l’autre',
    lead: 'Duo non-binaire',
    detail: 'premier rendez-vous',
  },
];

export default function LobbyHumans() {
  return (
    <section className="lobby-section lobby-humans">
      <div className="lobby-section__inner lobby-humans__inner">
        <h2 className="lobby-section__title">Des humains, pas des profils.</h2>
        <p className="lobby-section__lead">
          De vraies personnes, à leur rythme, en confiance. Des histoires qui
          commencent ici, chacune à sa façon — et c’est toi qui choisis qui tu
          rencontres, et comment.
        </p>

        <ul className="lobby-humans__grid">
          {STORIES.map((story) => (
            <li key={story.src} className="lobby-story">
              <div className="lobby-story__media">
                <Image
                  src={story.src}
                  alt={story.alt}
                  fill
                  sizes="(max-width: 720px) 90vw, 340px"
                  className="lobby-story__img"
                />
              </div>
              <p className="lobby-story__caption">
                {story.lead}
                <span aria-hidden="true"> · </span>
                <span className="lobby-story__detail">{story.detail}</span>
              </p>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
