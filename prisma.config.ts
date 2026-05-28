import "dotenv/config";
import { defineConfig, env } from "prisma/config";

export default defineConfig({
  schema: "prisma/schema.prisma",
  datasource: {
    url: env("DATABASE_URL") ?? "postgresql://placeholder:5432/placeholder",
    ...process.env.DATABASE_URL_UNPOOLED ? { directUrl: env("DATABASE_URL_UNPOOLED") } : {},
  },
});