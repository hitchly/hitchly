import { TRPCError } from "@trpc/server";
import { db } from "@hitchly/db/client";
import { users } from "@hitchly/db/schema";
import { eq } from "@hitchly/db/client";
/**
 * Test account email addresses allowed to use admin/test features
 */
export const TEST_ACCOUNT_EMAILS = ["driver@mcmaster.ca", "rider@mcmaster.ca"];
/**
 * Check if a user email is a test account
 */
export function isTestAccountEmail(email) {
  return TEST_ACCOUNT_EMAILS.includes(email);
}
/**
 * Verify that the current user is a test account
 * Throws TRPCError if not authorized
 */
export async function requireTestAccount(userId) {
  const [user] = await db
    .select({ email: users.email })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);
  if (!user || !isTestAccountEmail(user.email)) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "This feature is only available to test accounts",
    });
  }
}
