/**
 * AdminPhotoSearch — « Rechercher cette image » sous une photo, côté admin
 * (spec 006 · US1, #442 ; variante A du prototype T008).
 *
 * C'est le geste qui a démasqué le compte banni le 2026-09-24 : une photo volée
 * se retrouve en un clic chez Lens, Yandex ou TinEye. Les liens visent la
 * route journalisée, jamais le moteur ni R2 directement — sinon la trace
 * `SEARCH_PHOTO` serait contournable et une URL signée traînerait dans la page.
 *
 * `<details>` natif : ouvrable au clavier sans JavaScript, et le coral le
 * distingue des gestes de sanction (Classer, Retirer) posés juste au-dessus.
 */
const MOTEURS = [
  { id: 'lens', nom: 'Google Lens' },
  { id: 'yandex', nom: 'Yandex' },
  { id: 'tineye', nom: 'TinEye' },
] as const;

export default function AdminPhotoSearch({ cle }: { cle: string }) {
  return (
    <details className="group relative mt-1">
      <summary
        aria-label="Rechercher cette image sur un moteur"
        className="flex min-h-11 cursor-pointer list-none items-center justify-center gap-1.5 rounded-md border border-coral px-2 py-1 text-xs font-semibold text-coral focus:outline-none focus-visible:ring-2 focus-visible:ring-coral dark:border-coral-light dark:text-coral-light [&::-webkit-details-marker]:hidden"
      >
        Rechercher cette image
        <span aria-hidden="true" className="transition-transform group-open:rotate-180 motion-reduce:transition-none">▾</span>
      </summary>
      <ul className="absolute inset-x-0 z-10 mt-1 rounded-lg border border-hairline-strong bg-surface p-1 shadow-soft">
        {MOTEURS.map(({ id, nom }) => (
          <li key={id}>
            <a
              href={`/api/admin/photos/recherche?${new URLSearchParams({ cle, moteur: id })}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex min-h-11 items-center justify-between rounded-md px-2.5 text-sm font-medium text-content hover:bg-fill-subtle focus:outline-none focus-visible:ring-2 focus-visible:ring-coral"
            >
              {nom}
              <span aria-hidden="true" className="text-xs text-muted">↗</span>
            </a>
          </li>
        ))}
      </ul>
    </details>
  );
}
