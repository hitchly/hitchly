/**
 * Test account email addresses allowed to use admin/test features
 */
export const TEST_ACCOUNT_EMAILS = [
  "driver@mcmaster.ca",
  "rider@mcmaster.ca",
] as const;

/**
 * Check if the current user is a test account
 */
export function isTestAccount(email?: string | null): boolean {
  if (!email) return false;
  return TEST_ACCOUNT_EMAILS.includes(email as any);
}
