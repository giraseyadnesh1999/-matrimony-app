/** Friendly text for the `?error=` codes set by the OAuth routes. Unknown codes show nothing. */
export const AUTH_ERRORS: Record<string, string> = {
  consent_required: "Please accept the Terms and Privacy Notice, then try again.",
  rate_limited: "Too many attempts. Please wait a few minutes and try again.",
  provider_disabled: "That sign-in option isn't available right now.",
  oauth_cancelled: "Sign-in was cancelled. You can try again whenever you're ready.",
  oauth_state: "That sign-in link expired. Please try again.",
  oauth_failed: "We couldn't complete sign-in. Please try again.",
  no_email:
    "That account didn't share an email address, which we need to set up your profile. Please use your mobile number instead.",
  email_unverified:
    "That email address isn't verified with the provider. Please verify it there, or sign up with your mobile number.",
  no_account: "We couldn't find an account for that sign-in. Create a profile to continue.",
  account_exists:
    "An account with this email already exists. Log in with an emailed code or with Google instead.",
  suspended: "This account is unavailable. Please contact support.",
};

export const first = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);
