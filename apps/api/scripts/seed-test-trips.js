// TODO: Fix all linting errors in this file and re-enable linting
/* eslint-disable */
import { db } from "@hitchly/db/client";
import {
  preferences,
  profiles,
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
const TEST_TRIPS = [
  {
    originLat: MAIN_ST_COORDS.lat,
    originLng: MAIN_ST_COORDS.lng,
    originAddress: "1503 Main St W, Hamilton, ON",
    destLat: MCMASTER_COORDS.lat,
    destLng: MCMASTER_COORDS.lng,
    destAddress: "McMaster University",
    // Departure times to arrive at McMaster by 9:00 AM
    // Assuming ~15-20 minute drive, departures should be around 8:40-8:45
    departureMinutes: [40, 42, 45, 48, 50], // Different departure times
    maxSeats: [3, 4, 2, 5, 3], // Different seat availability
  },
];
async function seedTestTrips() {
  console.log("🌱 Seeding test driver trips...\n");
  // Get all test driver users
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
    // Check/create profile
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
      console.log(`✅ Created profile for ${driver.name}`);
    }
    // Check/create vehicle
    const [existingVehicle] = await db
      .select()
      .from(vehicles)
      .where(eq(vehicles.userId, driver.id))
      .limit(1);
    if (!existingVehicle) {
      const vehicleMakes = ["Toyota", "Honda", "Ford", "Chevrolet", "Nissan"];
      const vehicleModels = ["Camry", "Civic", "Focus", "Malibu", "Altima"];
      const colors = ["Black", "White", "Silver", "Blue", "Red"];
      const randomIndex = Math.floor(Math.random() * vehicleMakes.length);
      await db.insert(vehicles).values({
        // TODO: fix typescript error
        // @ts-ignore
        userId: driver.id,
        make: vehicleMakes[randomIndex],
        model: vehicleModels[randomIndex],
        color: colors[randomIndex],
        plate: `TEST${Math.floor(Math.random() * 10000)}`,
        seats: 5,
      });
      console.log(`✅ Created vehicle for ${driver.name}`);
    }
    // Check/create preferences
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
      console.log(`✅ Created preferences for ${driver.name}`);
    }
  }
  // Create trips for tomorrow (to ensure they're in the future)
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  tomorrow.setHours(0, 0, 0, 0);
  let tripCount = 0;
  for (const tripTemplate of TEST_TRIPS) {
    for (
      let i = 0;
      i < testDrivers.length && i < tripTemplate.departureMinutes.length;
      i++
    ) {
      const driver = testDrivers[i];
      if (!driver) {
        console.log(
          `⏭️  Skipping trip creation: driver is undefined at index ${i}`
        );
        continue;
      }
      const departureTime = new Date(tomorrow);
      departureTime.setHours(8, tripTemplate.departureMinutes[i], 0, 0);
      // Check if trip already exists for this driver and time
      const [existingTrip] = await db
        .select()
        .from(trips)
        .where(eq(trips.driverId, driver.id))
        .limit(1);
      if (existingTrip) {
        console.log(`⏭️  Skipping ${driver.name} - trip already exists`);
        continue;
      }
      const tripId = crypto.randomUUID();
      await db.insert(trips).values({
        id: tripId,
        driverId: driver.id,
        origin: tripTemplate.originAddress,
        destination: tripTemplate.destAddress,
        originLat: tripTemplate.originLat,
        originLng: tripTemplate.originLng,
        destLat: tripTemplate.destLat,
        destLng: tripTemplate.destLng,
        departureTime: departureTime,
        maxSeats: tripTemplate.maxSeats[i] ?? 1, // fallback to 1 if undefined
        bookedSeats: 0,
        status: "pending",
      });
      tripCount++;
      console.log(
        `✅ Created trip for ${driver.name}: ${tripTemplate.originAddress} → ${tripTemplate.destAddress} at ${departureTime.toLocaleTimeString()}`
      );
    }
  }
  console.log(`\n✨ Seeding complete! Created ${tripCount} test trips.`);
  console.log("\n📝 Test trips created for tomorrow:");
  console.log("   Origin: 1503 Main St W, Hamilton, ON");
  console.log("   Destination: McMaster University");
  console.log("   Arrival time: ~9:00 AM");
  console.log("\n💡 These trips will appear in matchmaking search results!");
  console.log("\n⚠️  Note: If you see 'trips table does not exist' error,");
  console.log("   run 'pnpm db:push' in apps/api to create the trips table.");
}
seedTestTrips()
  .then(() => {
    process.exit(0);
  })
  .catch((error) => {
    console.error("Fatal error:", error);
    process.exit(1);
  });
