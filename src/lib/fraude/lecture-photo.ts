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
const DELAI_MAX_MS = 15_000;

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
    // Le moteur n'aime pas les formats qu'il ne connaît pas : un tampon qui
    // n'est pas une image s'arrête ici, sans réveiller le worker.
    await sharp(image).metadata();
    const w = await obtenirWorker();
    const lecture = w.recognize(image).then((r) => r.data.text ?? '');
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
