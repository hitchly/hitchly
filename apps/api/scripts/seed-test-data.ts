// TODO: Fix linter warnings and ensure all TypeScript types are properly defined.
/* eslint-disable */
import { db } from "@hitchly/db/client";
import {
  preferences,
  profiles,
  tripRequests,
  trips,
  users,
  vehicles,
} from "@hitchly/db/schema";
import "dotenv/config";
import { eq } from "drizzle-orm";

// McMaster University coordinates
const MCMASTER_COORDS = {
  lat: 43.2609,
  lng: -79.9192,
};

// 1503 Main St W, Hamilton coordinates (approximate)
const MAIN_ST_COORDS = {
  lat: 43.2535,
  lng: -79.8889,
};

// Test driver emails (from seed-dev-accounts.ts)
const TEST_DRIVERS = [
  "driver@mcmaster.ca",
  "burhan.test@mcmaster.ca",
  "sarim.test@mcmaster.ca",
  "hamzah.test@mcmaster.ca",
  "aidan.test@mcmaster.ca",
];

// Test rider emails
const TEST_RIDERS = ["rider@mcmaster.ca", "swesan.test@mcmaster.ca"];

const TEST_PASSWORD = "test1234";

// Test scenarios configuration
const SCENARIOS = {
  pending: {
    tripStatus: "pending" as const,
    requests: [{ status: "pending" as const }],
  },
  active: {
    tripStatus: "active" as const,
    requests: [
      { status: "accepted" as const },
      { status: "accepted" as const },
    ],
  },
  in_progress: {
    tripStatus: "in_progress" as const,
    requests: [{ status: "on_trip" as const }, { status: "accepted" as const }],
  },
  completed: {
    tripStatus: "completed" as const,
    requests: [{ status: "completed" as const }],
  },
};

async function ensureRiderAccount(email: string, name: string) {
  const [existing] = await db
    .select()
    .from(users)
    .where(eq(users.email, email))
    .limit(1);

  if (existing) {
    // Ensure verified
    if (!existing.emailVerified) {
      await db
        .update(users)
        .set({ emailVerified: true, updatedAt: new Date() })
        .where(eq(users.id, existing.id));
    }
    return existing;
  }

  // Create new rider account
  try {
    const API_URL = process.env.API_URL || "http://localhost:3000";
    const response = await fetch(`${API_URL}/api/auth/sign-up/email`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email,
        password: TEST_PASSWORD,
        name,
      }),
    });

    const result = (await response.json()) as {
      error?: { code?: string; message?: string };
    };

    if (!response.ok && result.error?.code !== "USER_ALREADY_EXISTS") {
      throw new Error(result.error?.message || "Signup failed");
    }

    const [createdUser] = await db
      .select()
      .from(users)
      .where(eq(users.email, email))
      .limit(1);

    if (createdUser) {
      await db
        .update(users)
        .set({ emailVerified: true, updatedAt: new Date() })
        .where(eq(users.id, createdUser.id));

      // Create rider profile
      const [existingProfile] = await db
        .select()
        .from(profiles)
        .where(eq(profiles.userId, createdUser.id))
        .limit(1);

      if (!existingProfile) {
        await db.insert(profiles).values({
          userId: createdUser.id,
          universityRole: "student",
          appRole: "rider",
          defaultAddress: "McMaster University",
          defaultLat: MCMASTER_COORDS.lat,
          defaultLong: MCMASTER_COORDS.lng,
        });
      }
    }

    return createdUser;
  } catch (error: any) {
    if (
      error.message?.includes("already exists") ||
      error.message?.includes("User already exists")
    ) {
      const [existingUser] = await db
        .select()
        .from(users)
        .where(eq(users.email, email))
        .limit(1);

      if (existingUser) {
        await db
          .update(users)
          .set({ emailVerified: true, updatedAt: new Date() })
          .where(eq(users.id, existingUser.id));
      }
      return existingUser;
    }
    throw error;
  }
}

async function seedTestData() {
  console.log("🌱 Seeding comprehensive test data...\n");

  // Get test driver users
  const driverUsers = await db
    .select()
    .from(users)
    .where(eq(users.emailVerified, true));

  const testDrivers = driverUsers.filter((user) =>
    TEST_DRIVERS.includes(user.email)
  );

  if (testDrivers.length === 0) {
    console.log(
      "⚠️  No verified test drivers found. Run seed-dev-accounts.ts first."
    );
    return;
  }

  console.log(`Found ${testDrivers.length} test drivers\n`);

  // Ensure drivers have profiles, vehicles, and preferences
  for (const driver of testDrivers) {
    const [existingProfile] = await db
      .select()
      .from(profiles)
      .where(eq(profiles.userId, driver.id))
      .limit(1);

    if (!existingProfile) {
      await db.insert(profiles).values({
        userId: driver.id,
        universityRole: "student",
        appRole: "driver",
        defaultAddress: "1503 Main St W, Hamilton, ON",
        defaultLat: MAIN_ST_COORDS.lat,
        defaultLong: MAIN_ST_COORDS.lng,
      });
    }

    const [existingVehicle] = await db
      .select()
      .from(vehicles)
      .where(eq(vehicles.userId, driver.id))
      .limit(1);

    if (!existingVehicle) {
      await db.insert(vehicles).values({
        userId: driver.id,
        make: "Toyota",
        model: "Camry",
        color: "Black",
        plate: `TEST${Math.floor(Math.random() * 10000)}`,
        seats: 5,
      });
    }

    const [existingPrefs] = await db
      .select()
      .from(preferences)
      .where(eq(preferences.userId, driver.id))
      .limit(1);

    if (!existingPrefs) {
      await db.insert(preferences).values({
        userId: driver.id,
        music: true,
        chatty: true,
        smoking: false,
        pets: false,
      });
    }
  }

  // Ensure test riders exist
  console.log("Ensuring test riders exist...\n");
  const testRiders = [];
  for (const riderEmail of TEST_RIDERS) {
    const riderName =
      riderEmail.split("@")[0]?.replace(/\./g, " ") ?? "Test Rider";
    const rider = await ensureRiderAccount(riderEmail, riderName);
    if (rider) {
      testRiders.push(rider);
      console.log(`✅ Rider account ready: ${riderEmail}`);
    }
  }

  if (testRiders.length === 0) {
    console.log("⚠️  No test riders available. Creating additional riders...");
    // Create a few more test riders
    for (let i = 1; i <= 3; i++) {
      const email = `testrider${i}@mcmaster.ca`;
      const rider = await ensureRiderAccount(email, `Test Rider ${i}`);
      if (rider) testRiders.push(rider);
    }
  }

  console.log(`\nFound ${testRiders.length} test riders\n`);

  // Create trips with different scenarios
  const now = new Date();
  const tomorrow = new Date(now);
  tomorrow.setDate(tomorrow.getDate() + 1);
  tomorrow.setHours(8, 0, 0, 0);

  const scenarioKeys = Object.keys(SCENARIOS) as Array<keyof typeof SCENARIOS>;
  let tripCount = 0;
  let requestCount = 0;

  for (let i = 0; i < scenarioKeys.length && i < testDrivers.length; i++) {
    const scenarioKey = scenarioKeys[i];
    if (!scenarioKey) continue;
    const scenario = SCENARIOS[scenarioKey];
    const driver = testDrivers[i];

    if (!driver) {
      console.log(`⚠️  No driver found for scenario ${scenarioKey}, skipping.`);
      continue;
    }

    // Check if trip already exists for this driver
    const [existingTrip] = await db
      .select()
      .from(trips)
      .where(eq(trips.driverId, driver.id))
      .limit(1);

    if (existingTrip) {
      console.log(
        `⏭️  Skipping ${driver.name} - trip already exists (${existingTrip.status})`
      );
      continue;
    }

    const departureTime = new Date(tomorrow);
    departureTime.setMinutes(departureTime.getMinutes() + i * 15); // Stagger departure times

    const tripId = crypto.randomUUID();

    // Calculate booked seats based on accepted requests
    const bookedSeats = scenario.requests.filter(
      (r) =>
        r.status === "accepted" ||
        r.status === "on_trip" ||
        r.status === "completed"
    ).length;

    // Create trip
    await db.insert(trips).values({
      id: tripId,
      driverId: driver.id,
      origin: "1503 Main St W, Hamilton, ON",
      destination: "McMaster University",
      originLat: MAIN_ST_COORDS.lat,
      originLng: MAIN_ST_COORDS.lng,
      destLat: MCMASTER_COORDS.lat,
      destLng: MCMASTER_COORDS.lng,
      departureTime,
      maxSeats: 4,
      bookedSeats,
      status: scenario.tripStatus,
    });

    tripCount++;
    console.log(
      `✅ Created ${scenarioKey} trip for ${driver.name} (${scenario.tripStatus})`
    );

    // Create trip requests (passengers)
    for (
      let j = 0;
      j < scenario.requests.length && j < testRiders.length;
      j++
    ) {
      const requestConfig = scenario.requests[j];
      const rider = testRiders[j];

      if (!rider) {
        console.warn(`⚠️  No rider found for request index ${j}, skipping.`);
        continue;
      }

      if (!requestConfig) {
        console.warn(`⚠️  No status defined for request index ${j}, skipping.`);
        continue;
      }

      const requestId = crypto.randomUUID();

      await db.insert(tripRequests).values({
        id: requestId,
        tripId,
        riderId: rider.id,
        pickupLat: MAIN_ST_COORDS.lat + (Math.random() - 0.5) * 0.01, // Slight variation
        pickupLng: MAIN_ST_COORDS.lng + (Math.random() - 0.5) * 0.01,
        dropoffLat: MCMASTER_COORDS.lat,
        dropoffLng: MCMASTER_COORDS.lng,
        status: requestConfig.status,
      });

      requestCount++;
      console.log(
        `   └─ Added passenger ${rider.name} (${requestConfig.status})`
      );
    }
  }

  console.log(`\n✨ Seeding complete!`);
  console.log(`   Created ${tripCount} trips`);
  console.log(`   Created ${requestCount} trip requests`);
  console.log(`\n📝 Test scenarios created:`);
  scenarioKeys.forEach((key, i) => {
    if (i < testDrivers.length) {
      console.log(
        `   - ${key}: Trip with ${SCENARIOS[key].requests.length} passenger(s)`
      );
    }
  });
  console.log(
    `\n💡 You can now test driver functionality with various trip states!`
  );
}

seedTestData()
  .then(() => {
    process.exit(0);
  })
  .catch((error) => {
    console.error("Fatal error:", error);
    process.exit(1);
  });
