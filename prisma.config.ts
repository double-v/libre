import "dotenv/config";
import { defineConfig } from "prisma/config";

import { urlDeMigration } from "./prisma/migration-url";

/**
 * Config du CLI Prisma. Le runtime n'y touche pas : `src/lib/db.ts` ouvre son
 * propre `pg.Pool` sur `DATABASE_URL`, donc l'application garde le pooler —
 * ce qui est exactement ce qu'on veut pour elle.
 *
 * La version précédente passait `directUrl` ici. **Prisma 7 ne connaît pas
 * cette clé** : son type `Datasource` n'accepte que `url` et
 * `shadowDatabaseUrl`, et le spread conditionnel qui la posait empêchait
 * TypeScript de le signaler. Elle était donc ignorée en silence, et toutes les
 * migrations partaient sur `DATABASE_URL`, pooler compris (#363).
 */
export default defineConfig({
  schema: "prisma/schema.prisma",
  datasource: {
    url: urlDeMigration(),
  },
});
