import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'path';
import dotenv from 'dotenv';
import { neutraliserBaseDistante } from './tests/garde-base';

dotenv.config({ path: path.resolve(process.cwd(), '.env') });

// #548 : aucun test ne doit atteindre une base partagée (Neon), quel que soit
// le `.env`. Les workers héritent de l'environnement neutralisé.
const neutralisees = neutraliserBaseDistante(process.env);
if (neutralisees.length > 0) {
  console.info(`[tests] ${neutralisees.join(', ')} pointait hors de la machine : neutralisée (#548).`);
}

// Les tests d'intégration exigent une base jetable, migrée et remplie de
// données factices (`npm run test:db` en local, conteneur de service en CI).
// En CI, leur absence est une erreur : un vert sans eux ne prouverait rien.
const avecBase = process.env.BASE_DE_TEST === '1';
if (process.env.CI && !avecBase) {
  throw new Error('[tests] En CI, BASE_DE_TEST=1 est obligatoire : les tests d’intégration ne doivent pas être sautés (#548).');
}
if (!avecBase) {
  console.info('[tests] Tests d’intégration non lancés : utilise `npm run test:db` pour les inclure.');
}

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./tests/setup.ts'],
    globalSetup: avecBase ? ['./tests/integration/global-setup.ts'] : [],
    exclude: ['tests/e2e/**', 'node_modules/**', ...(avecBase ? [] : ['tests/integration/**'])],
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
});
