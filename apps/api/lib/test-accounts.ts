import { db, eq } from "@hitchly/db/client";
import { users } from "@hitchly/db/schema";
import { TRPCError } from "@trpc/server";

/**
 * Test account email addresses allowed to use admin/test features
 */
export const TEST_ACCOUNT_EMAILS = [
  "driver@mcmaster.ca",
  "rider@mcmaster.ca",
] as const;

// Create a type based on the array values
type TestAccountEmail = (typeof TEST_ACCOUNT_EMAILS)[number];

/**
 * Check if a user email is a test account
 */
export function isTestAccountEmail(email: string): email is TestAccountEmail {
  return (TEST_ACCOUNT_EMAILS as readonly string[]).includes(email);
}

/**
 * Verify that the current user is a test account
 * Throws TRPCError if not authorized
 */
export async function requireTestAccount(userId: string): Promise<void> {
  const [user] = await db
    .select({ email: users.email })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);

  // user.email is checked against the type guard
  if (!user || !isTestAccountEmail(user.email)) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "This feature is only available to test accounts",
    });
  }
}
