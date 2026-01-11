import { eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import * as schema from "../schema";
import { profiles, users } from "../schema";

// 1. Setup a specific connection for testing
const TEST_DB_URL =
  process.env.DATABASE_URL ||
  "postgresql://postgres:postgres@localhost:5432/hitchly_db";

describe("Database Integration", () => {
  let pool: Pool;
  let db: ReturnType<typeof drizzle<typeof schema>>;

  beforeAll(async () => {
    pool = new Pool({ connectionString: TEST_DB_URL });
    db = drizzle(pool, { schema });

    // cleanup: remove test user if exists
    await db.delete(users).where(eq(users.email, "test@mcmaster.ca"));
  });

  afterAll(async () => {
    // cleanup
    await db.delete(users).where(eq(users.email, "test@mcmaster.ca"));
    await pool.end();
  });

  it("should create a user with defaults", async () => {
    const newUser = await db
      .insert(users)
      .values({
        id: "test-user-id",
        name: "Test User",
        email: "test@mcmaster.ca",
      })
      .returning();

    expect(newUser[0].email).toBe("test@mcmaster.ca");
    expect(newUser[0].emailVerified).toBe(false); // Check default value
    expect(newUser[0].createdAt).toBeDefined();
  });

  it("should enforce profile foreign key constraints", async () => {
    // Attempt to create a profile for a non-existent user
    const attempt = db.insert(profiles).values({
      userId: "non-existent-id",
      universityRole: "student",
    });

    // We expect this to fail due to Foreign Key constraint
    await expect(attempt).rejects.toThrow();
  });

  it("should create a profile linked to the user", async () => {
    const newProfile = await db
      .insert(profiles)
      .values({
        userId: "test-user-id",
        bio: "I am a test user",
        universityRole: "student",
        appRole: "rider",
      })
      .returning();

    expect(newProfile[0].userId).toBe("test-user-id");
    expect(newProfile[0].bio).toBe("I am a test user");
  });

  it("should auto-generate UUIDs for profiles", async () => {
    const profile = await db.query.profiles.findFirst({
      where: eq(profiles.userId, "test-user-id"),
    });

    expect(profile).toBeDefined();
    expect(profile?.id).toHaveLength(36); // UUID length
  });
});
