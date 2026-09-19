import { NextResponse } from "next/server";
import { audit } from "@/server/audit";
import { exportUserData } from "@/server/privacy";
import { rateLimit } from "@/server/rate-limit";
import { getSession } from "@/server/session";

/** DPDP Act s.11 right of access: a machine-readable copy of everything held about the signed-in person. */
export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Not signed in" }, { status: 401 });

  const limited = await rateLimit(`export:${session.user.id}`, 5, 86_400);
  if (!limited.ok) {
    return NextResponse.json(
      { error: "You've downloaded your data several times today. Please try again tomorrow." },
      { status: 429, headers: { "Retry-After": String(limited.retryAfterSec) } },
    );
  }

  const data = await exportUserData(session.user.id);
  await audit("data.exported", { userId: session.user.id });

  const day = new Date().toISOString().slice(0, 10);
  return new NextResponse(JSON.stringify(data, null, 2), {
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Content-Disposition": `attachment; filename="saathi-my-data-${day}.json"`,
      "Cache-Control": "no-store",
    },
  });
}
