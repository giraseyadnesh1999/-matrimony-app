// Vercel build: the local schema uses SQLite, production uses PostgreSQL (Neon).
// This derives a Postgres schema from prisma/schema.prisma (single source of truth), applies the Postgres
// migrations in prisma/postgres/migrations, then builds Next.js. Do not run it locally: it regenerates the
// Prisma client for Postgres.
import { readFileSync, writeFileSync } from "node:fs";
import { execSync } from "node:child_process";

const schema = readFileSync("prisma/schema.prisma", "utf8");
const datasource = /datasource db \{[^}]*\}/;
if (!datasource.test(schema)) throw new Error("datasource block not found in prisma/schema.prisma");

const pgSchema = schema.replace(
  datasource,
  `datasource db {
  provider  = "postgresql"
  url       = env("DATABASE_URL")
  directUrl = env("DATABASE_URL_UNPOOLED")
}`,
);
writeFileSync("prisma/postgres/schema.prisma", pgSchema);

const run = (cmd) => execSync(cmd, { stdio: "inherit" });
run("npx prisma generate --schema prisma/postgres/schema.prisma");
run("npx prisma migrate deploy --schema prisma/postgres/schema.prisma");
run("npx next build");
