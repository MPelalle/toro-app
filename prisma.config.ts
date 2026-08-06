import "dotenv/config";
import { defineConfig, env } from "prisma/config";

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  // Use the direct Supabase connection here for migrations and Prisma Studio.
  datasource: {
    url: env("DIRECT_URL"),
  },
});
