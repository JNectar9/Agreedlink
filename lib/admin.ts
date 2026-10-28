/** Platform owners are listed in the server-only ADMIN_EMAILS variable (comma separated). */
export function adminEmails(env: string = process.env.ADMIN_EMAILS ?? ''): string[] {
  return env.split(',').map((e) => e.trim().toLowerCase()).filter(Boolean);
}

export function isOwnerEmail(email: string | null | undefined, env?: string): boolean {
  if (!email) return false;
  return adminEmails(env).includes(email.trim().toLowerCase());
}
