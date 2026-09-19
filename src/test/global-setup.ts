import { execSync } from "node:child_process";
import { rmSync } from "node:fs";
import path from "node:path";

/** Builds a fresh SQLite test database from the real migrations before the suite runs. */
export default function setup() {
  const dir = path.resolve(process.cwd(), "prisma");
  for (const f of ["test.db", "test.db-journal"]) rmSync(path.join(dir, f), { force: true });
  execSync("npx prisma migrate deploy", {
    stdio: "pipe",
    env: { ...process.env, DATABASE_URL: "file:./test.db" },
  });
}
