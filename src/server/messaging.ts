import "server-only";
import { env } from "@/lib/env";

/**
 * Outbound OTP delivery. Providers:
 *  - console: prints the code in the server log. Development only; env() refuses it in production.
 *  - msg91:   SMS through MSG91. Indian SMS must use a TRAI DLT-registered sender ID and template.
 *  - smtp:    email through any SMTP relay (AWS SES ap-south-1, Zoho, Postmark, ...).
 *
 * Delivery errors are thrown so the caller can show a neutral "couldn't send" message. The code
 * itself is never logged outside the console provider.
 */
export type Channel = "SMS" | "EMAIL";

export async function sendOtp(channel: Channel, to: string, code: string): Promise<void> {
  const e = env();

  if (channel === "SMS") {
    if (e.SMS_PROVIDER === "console") return consoleOut("SMS", to, code);
    return sendMsg91(to, code);
  }
  if (e.EMAIL_PROVIDER === "console") return consoleOut("EMAIL", to, code);
  return sendSmtp(to, code);
}

/** Non-OTP notices (deletion reminders etc.). Best-effort; failures are logged without content. */
export async function sendNotice(channel: Channel, to: string, subject: string, text: string): Promise<void> {
  const e = env();
  if (channel === "EMAIL") {
    if (e.EMAIL_PROVIDER === "console") return consoleOut("EMAIL", to, `${subject} — ${text}`);
    return smtpSend(to, subject, text);
  }
  // Promotional/transactional SMS other than OTP needs its own DLT template; log-only until registered.
  if (e.SMS_PROVIDER === "console") consoleOut("SMS", to, `${subject} — ${text}`);
}

function consoleOut(channel: Channel, to: string, body: string) {
  console.log(`\n[dev ${channel}] to=${to}  ${body}\n`);
}

async function sendMsg91(e164: string, code: string) {
  const { MSG91_AUTH_KEY, MSG91_OTP_TEMPLATE_ID } = env();
  if (!MSG91_AUTH_KEY || !MSG91_OTP_TEMPLATE_ID) throw new Error("MSG91 is not configured");

  // MSG91 wants the number as digits with country code and no "+".
  // NOTE: verify parameter names against your MSG91 dashboard; this follows their v5 "Send OTP" API.
  const url = new URL("https://control.msg91.com/api/v5/otp");
  url.searchParams.set("template_id", MSG91_OTP_TEMPLATE_ID);
  url.searchParams.set("mobile", e164.replace(/^\+/, ""));
  url.searchParams.set("otp", code);
  url.searchParams.set("otp_expiry", "5");

  const res = await fetch(url, {
    method: "POST",
    headers: { authkey: MSG91_AUTH_KEY, "content-type": "application/json" },
    body: "{}",
    signal: AbortSignal.timeout(8000),
    cache: "no-store",
  });
  const json = (await res.json().catch(() => ({}))) as { type?: string };
  if (!res.ok || json.type === "error") throw new Error(`MSG91 rejected the request (${res.status})`);
}

async function sendSmtp(to: string, code: string) {
  await smtpSend(
    to,
    `${code} is your Saathi code`,
    `Your Saathi verification code is ${code}.\n\nIt expires in 5 minutes. Never share it with anyone, including Saathi staff.\nIf you didn't request this, you can ignore this email.`,
  );
}

async function smtpSend(to: string, subject: string, text: string) {
  const { SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, EMAIL_FROM } = env();
  if (!SMTP_HOST) throw new Error("SMTP is not configured");
  const nodemailer = await import("nodemailer");
  const transport = nodemailer.createTransport({
    host: SMTP_HOST,
    port: SMTP_PORT,
    secure: SMTP_PORT === 465,
    auth: SMTP_USER ? { user: SMTP_USER, pass: SMTP_PASS } : undefined,
    connectionTimeout: 8000,
    socketTimeout: 8000,
  });
  await transport.sendMail({ from: EMAIL_FROM, to, subject, text });
}
