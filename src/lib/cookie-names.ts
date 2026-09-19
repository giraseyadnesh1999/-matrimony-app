/** Kept dependency-free so proxy.ts can import it without pulling server-only code. */
const prod = process.env.NODE_ENV === "production";

export const SESSION_COOKIE = prod ? "__Host-saathi_session" : "saathi_session";
export const OAUTH_STATE_COOKIE = prod ? "__Host-saathi_oauth_state" : "saathi_oauth_state";
export const OAUTH_VERIFIER_COOKIE = prod ? "__Host-saathi_oauth_verifier" : "saathi_oauth_verifier";
export const OAUTH_CONTEXT_COOKIE = prod ? "__Host-saathi_oauth_ctx" : "saathi_oauth_ctx";
