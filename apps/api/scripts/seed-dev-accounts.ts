import "dotenv/config";
import { db } from "@hitchly/db/client";
import { users, profiles, vehicles } from "@hitchly/db/schema";
import { eq } from "drizzle-orm";

const TEST_PASSWORD = "test1234"; // Change this in production! (min 8 chars for Better Auth)

const devAccounts = [
  {
    name: "Test Driver",
    email: "driver@mcmaster.ca",
    password: TEST_PASSWORD,
    appRole: "driver" as const,
  },
  {
    name: "Test Rider",
    email: "rider@mcmaster.ca",
    password: TEST_PASSWORD,
    appRole: "rider" as const,
  },
];

async function seedDevAccounts() {
  console.log("🌱 Seeding developer test accounts...\n");

  for (const account of devAccounts) {
    try {
      // Check if user already exists and delete if it does (to recreate with correct format)
      const [existing] = await db
        .select()
        .from(users)
        .where(eq(users.email, account.email))
        .limit(1);

      if (existing) {
        console.log(`🔄 Recreating account: ${account.email}`);
        // Delete existing account and user (cascade will handle accounts table)
        await db.delete(users).where(eq(users.id, existing.id));
      }

      // Use Better Auth's signup API via HTTP to create user with correct password hashing
      // Then mark as verified to bypass email verification
      try {
        const API_URL = process.env.API_URL || "http://localhost:3000";

        // Call Better Auth's signup endpoint
        const response = await fetch(`${API_URL}/api/auth/sign-up/email`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Origin: API_URL,
          },
          body: JSON.stringify({
            email: account.email,
            password: account.password,
            name: account.name,
          }),
        });

        const result = (await response.json()) as {
          error?: { code?: string; message?: string };
        };

        if (!response.ok) {
          const errorMsg =
            result.error?.message ||
            `HTTP ${response.status}: ${response.statusText}`;
          console.error(`   Signup API error: ${errorMsg}`);
          console.error(`   Response:`, JSON.stringify(result, null, 2));
          if (result.error?.code !== "USER_ALREADY_EXISTS") {
            throw new Error(errorMsg);
          }
        }

        // Mark user as verified (bypass email verification)
        const [createdUser] = await db
          .select()
          .from(users)
          .where(eq(users.email, account.email))
          .limit(1);

        if (createdUser) {
          await db
            .update(users)
            .set({
              emailVerified: true,
              updatedAt: new Date(),
            })
            .where(eq(users.id, createdUser.id));

          // Create or update profile with correct appRole
          const [existingProfile] = await db
            .select()
            .from(profiles)
            .where(eq(profiles.userId, createdUser.id))
            .limit(1);

          if (existingProfile) {
            await db
              .update(profiles)
              .set({ appRole: account.appRole })
              .where(eq(profiles.userId, createdUser.id));
          } else {
            await db.insert(profiles).values({
              userId: createdUser.id,
              appRole: account.appRole,
              universityRole: "student",
            });
          }

          // If driver, ensure they have a vehicle
          if (account.appRole === "driver") {
            const [existingVehicle] = await db
              .select()
              .from(vehicles)
              .where(eq(vehicles.userId, createdUser.id))
              .limit(1);

            if (!existingVehicle) {
              await db.insert(vehicles).values({
                userId: createdUser.id,
                make: "Toyota",
                model: "Camry",
                color: "Black",
                plate: "TEST001",
                seats: 4,
              });
            }
          }
        }
      } catch (apiError: any) {
        // If signup fails, the user might already exist - that's okay
        if (
          apiError.message?.includes("already exists") ||
          apiError.message?.includes("User already exists")
        ) {
          console.log(
            `   User ${account.email} already exists, marking as verified...`
          );
          // Just mark existing user as verified
          const [existingUser] = await db
            .select()
            .from(users)
            .where(eq(users.email, account.email))
            .limit(1);

          if (existingUser) {
            await db
              .update(users)
              .set({
                emailVerified: true,
                updatedAt: new Date(),
              })
              .where(eq(users.id, existingUser.id));
          }
        } else {
          throw apiError;
        }
      }

      console.log(`✅ Created account: ${account.name} (${account.email})`);
      console.log(`   Password: ${account.password}\n`);
    } catch (error) {
      console.error(`❌ Error creating account for ${account.email}:`, error);
    }
  }

  console.log("✨ Seeding complete!");
  console.log("\n📝 Test accounts created:");
  devAccounts.forEach((acc) => {
    console.log(`   ${acc.email} / ${acc.password}`);
  });
  console.log("\n⚠️  Remember to change TEST_PASSWORD in production!");
}

seedDevAccounts()
  .then(() => {
    process.exit(0);
  })
  .catch((error) => {
    console.error("Fatal error:", error);
    process.exit(1);
  });
