import "server-only";
import { z } from "zod";

/**
 * Validated, lazily-parsed environment. Parsing is lazy so `next build` can run without secrets,
 * but the first real request in a misconfigured deployment fails loudly instead of silently
 * weakening security (e.g. a missing encryption key).
 */
const bool = z
  .string()
  .optional()
  .transform((v) => v === "1" || v === "true");

const schema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  DATABASE_URL: z.string().min(1),
  APP_URL: z.url().default("http://localhost:3000"),

  DATA_ENCRYPTION_KEY: z
    .string()
    .refine((v) => Buffer.from(v, "base64").length === 32, "must be 32 random bytes, base64 encoded"),
  HASH_PEPPER: z.string().min(32, "must be at least 32 characters"),
  CRON_SECRET: z.string().min(24).optional(),

  SMS_PROVIDER: z.enum(["console", "msg91"]).default("console"),
  EMAIL_PROVIDER: z.enum(["console", "smtp"]).default("console"),
  TRUST_PROXY: bool,

  MSG91_AUTH_KEY: z.string().optional(),
  MSG91_OTP_TEMPLATE_ID: z.string().optional(),
  SMS_DAILY_CAP: z.coerce.number().int().min(0).default(2000),

  SMTP_HOST: z.string().optional(),
  SMTP_PORT: z.coerce.number().int().default(587),
  SMTP_USER: z.string().optional(),
  SMTP_PASS: z.string().optional(),
  EMAIL_FROM: z.string().default("Saathi <no-reply@example.com>"),

  GOOGLE_CLIENT_ID: z.string().optional(),
  GOOGLE_CLIENT_SECRET: z.string().optional(),
  FACEBOOK_CLIENT_ID: z.string().optional(),
  FACEBOOK_CLIENT_SECRET: z.string().optional(),

  LEGAL_ENTITY_NAME: z.string().default("Your Company Pvt. Ltd."),
  LEGAL_ENTITY_ADDRESS: z.string().default("Registered office address, City, State, PIN"),
  GRIEVANCE_OFFICER_NAME: z.string().default("Name of Grievance Officer"),
  GRIEVANCE_OFFICER_EMAIL: z.string().default("grievance@example.com"),
  DPO_EMAIL: z.string().default("privacy@example.com"),
});

export type Env = z.infer<typeof schema>;

let cached: Env | undefined;

export function env(): Env {
  if (cached) return cached;

  // Treat empty strings (as in .env.example) as "not set".
  const raw = Object.fromEntries(
    Object.entries(process.env).filter(([, v]) => v !== undefined && v !== ""),
  );
  const parsed = schema.safeParse(raw);
  if (!parsed.success) {
    const issues = parsed.error.issues.map((i) => `  - ${i.path.join(".")}: ${i.message}`).join("\n");
    throw new Error(`Invalid environment configuration:\n${issues}`);
  }

  const e = parsed.data;
  if (e.NODE_ENV === "production") {
    if (e.SMS_PROVIDER === "console" || e.EMAIL_PROVIDER === "console") {
      throw new Error("SMS_PROVIDER/EMAIL_PROVIDER=console is not allowed in production (OTPs would be logged).");
    }
    if (!e.APP_URL.startsWith("https://")) {
      throw new Error("APP_URL must be https in production.");
    }
    if (!e.CRON_SECRET) {
      throw new Error("CRON_SECRET is required in production (data-retention job).");
    }
  }
  cached = e;
  return e;
}

export const isProd = () => process.env.NODE_ENV === "production";

/** Which social providers are configured. Safe to expose to the UI. */
export function enabledOAuthProviders(): Array<"google" | "facebook"> {
  const e = env();
  const list: Array<"google" | "facebook"> = [];
  if (e.GOOGLE_CLIENT_ID && e.GOOGLE_CLIENT_SECRET) list.push("google");
  if (e.FACEBOOK_CLIENT_ID && e.FACEBOOK_CLIENT_SECRET) list.push("facebook");
  return list;
}
