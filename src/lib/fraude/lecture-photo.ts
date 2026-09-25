import path from 'node:path';
import { createRequire } from 'node:module';
import sharp from 'sharp';
import { createWorker, type Worker } from 'tesseract.js';

/**
 * Lire le texte incrusté sur une photo, chez nous (spec 006, research R1) :
 * `tesseract.js` en WASM, modèle `eng` embarqué par le paquet npm — aucun
 * appel réseau, aucun sous-traitant ne voit les photos des membres.
 *
 * Un seul worker, créé à la première lecture et gardé tant que l'instance
 * vit : l'initialisation coûte ≈ 0,4 s, une lecture ≈ 0,3 s. Tout échec rend
 * une chaîne vide — l'analyse est un indice, jamais une condition.
 */
const DELAI_MAX_MS = 10_000;

/**
 * Largeur de lecture. Mesuré (free tier Vercel, chaque seconde de CPU
 * compte) : une photo de téléphone 3024×4032 lue telle quelle dépasse 15 s
 * sans rien lire ; réduite à 1000 px en niveaux de gris, ≈ 0,4 s en tout et
 * le texte incrusté est lu. Un texte écrit pour être lu sur un écran de
 * téléphone reste lisible à cette taille.
 */
const LARGEUR_LECTURE = 1000;

/** Orientation EXIF appliquée, réduction, niveaux de gris ; PNG peu compressé (rapide). */
function preparer(image: Buffer): Promise<Buffer> {
  return sharp(image)
    .rotate()
    .resize({ width: LARGEUR_LECTURE, withoutEnlargement: true })
    .greyscale()
    .png({ compressionLevel: 1 })
    .toBuffer();
}

let worker: Promise<Worker> | null = null;

const require = createRequire(import.meta.url);

function cheminModele(): string {
  // `4.0.0_best_int` : le modèle LSTM seul, celui du mode par défaut.
  return path.join(path.dirname(require.resolve('@tesseract.js-data/eng/package.json')), '4.0.0_best_int');
}

/** Chemin absolu du script du worker : un bundler casse le chemin relatif par défaut. */
function cheminWorker(): string {
  return require.resolve('tesseract.js/src/worker-script/node/index.js');
}

function obtenirWorker(): Promise<Worker> {
  if (!worker) {
    worker = createWorker('eng', undefined, {
      langPath: cheminModele(),
      workerPath: cheminWorker(),
      // Pas de cache disque : le système de fichiers d'une fonction est en
      // lecture seule, et le modèle est déjà local.
      cacheMethod: 'none',
      // Une erreur du worker est déjà rendue par `recognize` : sans ce
      // gestionnaire, tesseract la relance aussi en erreur non gérée.
      errorHandler: () => {},
    }).catch((err) => {
      worker = null;
      throw err;
    });
  }
  return worker;
}

export async function lireTexte(image: Buffer): Promise<string> {
  let minuteur: ReturnType<typeof setTimeout> | undefined;
  try {
    // Préparée avant tout : un tampon qui n'est pas une image s'arrête ici,
    // sans réveiller le worker.
    const pret = await preparer(image);
    const w = await obtenirWorker();
    const lecture = w.recognize(pret).then((r) => r.data.text ?? '');
    const delai = new Promise<never>((_, rejeter) => {
      minuteur = setTimeout(() => rejeter(new Error('delai')), DELAI_MAX_MS);
    });
    return await Promise.race([lecture, delai]);
  } catch (err) {
    console.warn('fraude.lecture.failed', { message: (err as Error)?.message?.slice(0, 80) });
    // Un worker bloqué ne doit pas bloquer les lectures suivantes.
    if ((err as Error)?.message === 'delai') await arreterLecture();
    return '';
  } finally {
    clearTimeout(minuteur);
  }
}

/** Libère le worker (tests, ou après un délai dépassé). */
export async function arreterLecture(): Promise<void> {
  const w = worker;
  worker = null;
  if (w) await w.then((x) => x.terminate()).catch(() => {});
}
