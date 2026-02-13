/**
 * Test account email addresses allowed to use admin/test features
 */
export const TEST_ACCOUNT_EMAILS = [
  "driver@mcmaster.ca",
  "rider@mcmaster.ca",
] as const;

// Define a type representing only the allowed test emails
type TestAccountEmail = (typeof TEST_ACCOUNT_EMAILS)[number];

/**
 * Check if the current user is a test account
 * This is a Type Guard: if it returns true, TS knows 'email' is a TestAccountEmail
 */
export function isTestAccount(
  email?: string | null
): email is TestAccountEmail {
  if (!email) return false;

  // Casting to readonly string[] allows the .includes check to run safely
  // without losing the "Readonly" protection of the original array.
  return (TEST_ACCOUNT_EMAILS as readonly string[]).includes(email);
}
