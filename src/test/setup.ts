import { randomBytes } from "node:crypto";

// Deterministic-enough secrets for tests. A dedicated SQLite file keeps tests away from dev data.
process.env.DATA_ENCRYPTION_KEY ??= randomBytes(32).toString("base64");
process.env.HASH_PEPPER ??= randomBytes(32).toString("base64");
process.env.DATABASE_URL = "file:./test.db";
process.env.APP_URL = "http://localhost:3000";
process.env.SMS_PROVIDER = "console";
process.env.EMAIL_PROVIDER = "console";
