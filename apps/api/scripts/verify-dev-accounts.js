import "dotenv/config";
import { db } from "@hitchly/db/client";
import { users } from "@hitchly/db/schema";
import { inArray } from "drizzle-orm";
const testEmails = ["driver@mcmaster.ca", "rider@mcmaster.ca"];
async function verifyDevAccounts() {
  console.log("🔐 Verifying developer test accounts...\n");
  try {
    // Update all test accounts to be verified
    const result = await db
      .update(users)
      .set({
        emailVerified: true,
        updatedAt: new Date(),
      })
      .where(inArray(users.email, testEmails))
      .returning();
    console.log(`✅ Verified ${result.length} accounts:\n`);
    result.forEach((user) => {
      console.log(`   ✓ ${user.email}`);
    });
    console.log("\n✨ All test accounts are now verified!");
  } catch (error) {
    console.error("❌ Error verifying accounts:", error);
    throw error;
  }
}
verifyDevAccounts()
  .then(() => {
    process.exit(0);
  })
  .catch((error) => {
    console.error("Fatal error:", error);
    process.exit(1);
  });
