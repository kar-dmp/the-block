import { defineConfig } from "prisma/config";

process.env.DATABASE_URL ??= "file:./dev.db";

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    seed: "node --import tsx scripts/seed.ts",
  },
});
