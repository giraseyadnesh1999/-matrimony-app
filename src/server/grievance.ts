import "server-only";
import { blindIndex, encrypt, referenceCode } from "@/lib/crypto";
import { db } from "@/lib/db";
import { GRIEVANCE_ACK_HOURS, GRIEVANCE_RESOLVE_DAYS } from "@/config/site";
import { audit } from "./audit";
import { sendNotice } from "./messaging";
import { humanWait, rateLimitAll } from "./rate-limit";

/**
 * Grievance redressal. Indian rules require a named officer, acknowledgement within 24 hours and
 * resolution within 15 days (IT Rules 2021, r.3(2)); the DPDP Act adds a right to readily available
 * grievance redressal before approaching the Data Protection Board.
 */
export async function fileGrievance(input: {
  userId: string | null;
  name: string;
  contact: { kind: "email" | "phone"; value: string };
  category: string;
  message: string;
  ipHash: string | null;
}) {
  const contactHash = blindIndex(input.contact.kind === "email" ? "email" : "phone", input.contact.value);
  const limited = await rateLimitAll([
    { key: `grievance:c:${contactHash}`, limit: 5, windowSec: 86_400 },
    input.ipHash ? { key: `grievance:ip:${input.ipHash}`, limit: 10, windowSec: 86_400 } : null,
  ]);
  if (!limited.ok) {
    return { ok: false as const, error: `You've sent several requests today. Please try again in ${humanWait(limited.retryAfterSec)}.` };
  }

  const now = new Date();
  const ticket = await db.grievanceTicket.create({
    data: {
      reference: referenceCode("GR"),
      userId: input.userId,
      name: input.name,
      contactEnc: encrypt(input.contact.value),
      category: input.category,
      message: input.message,
      acknowledgeBy: new Date(now.getTime() + GRIEVANCE_ACK_HOURS * 3_600_000),
      resolveBy: new Date(now.getTime() + GRIEVANCE_RESOLVE_DAYS * 86_400_000),
    },
  });
  await audit("grievance.filed", { userId: input.userId, ipHash: input.ipHash, meta: { category: input.category, reference: ticket.reference } });

  // Immediate written acknowledgement by email when we have an address.
  if (input.contact.kind === "email") {
    try {
      await sendNotice(
        "EMAIL",
        input.contact.value,
        `We received your request (${ticket.reference})`,
        `Hello ${input.name},\n\nWe have received your request. Your reference is ${ticket.reference}.\nWe will acknowledge it within ${GRIEVANCE_ACK_HOURS} hours and resolve it within ${GRIEVANCE_RESOLVE_DAYS} days.\n\nSaathi Grievance Officer`,
      );
    } catch (err) {
      console.error("grievance acknowledgement email failed:", err instanceof Error ? err.message : "unknown");
    }
  }
  return { ok: true as const, reference: ticket.reference, acknowledgeBy: ticket.acknowledgeBy, resolveBy: ticket.resolveBy };
}
