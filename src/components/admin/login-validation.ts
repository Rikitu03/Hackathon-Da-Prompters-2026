/** Client-side guidance only: server authentication and role checks remain authoritative. */
export function validateAdminEmail(value: string): string {
  const email = value.trim();
  if (!email) return "Enter your email address.";
  if (email.length > 254) return "Email address must be 254 characters or fewer.";
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return "Enter a valid email address.";
  return "";
}

export function validateAdminPassword(value: string): string {
  if (!value) return "Enter your password.";
  if (value.length > 1024) return "Password is too long.";
  // No arbitrary password-length rule: existing valid admin credentials must still work.
  return "";
}