/**
 * Test account email addresses allowed to use admin/test features
 */
export declare const TEST_ACCOUNT_EMAILS: readonly [
  "driver@mcmaster.ca",
  "rider@mcmaster.ca",
];
/**
 * Check if a user email is a test account
 */
export declare function isTestAccountEmail(email: string): boolean;
/**
 * Verify that the current user is a test account
 * Throws TRPCError if not authorized
 */
export declare function requireTestAccount(userId: string): Promise<void>;
//# sourceMappingURL=test-accounts.d.ts.map
