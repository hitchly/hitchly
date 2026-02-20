/* eslint-disable no-console */
import { db } from "@hitchly/db/client";
import * as schema from "@hitchly/db/schema";
import { inArray } from "drizzle-orm";

async function seed() {
  console.log("🌱 Starting Mega Seed...");

  const MY_EMAIL = "froggata@mcmaster.ca";
  const me = await db.query.users.findFirst({
    where: (users, { eq }) => eq(users.email, MY_EMAIL),
  });

  if (!me) {
    console.error("❌ Hero user not found! Please sign in once first.");
    return;
  }
  const myId = me.id;

  const testUserIds = ["user-pilot", "user-sarah", "user-prof", "user-dummy"];

  // 1. CLEANUP: Remove old test data to prevent FK conflicts
  console.log("🧹 Cleaning up old test data...");
  await db.delete(schema.users).where(inArray(schema.users.id, testUserIds));

  // 2. ATOMIC INSERT: Use a transaction to ensure Users exist before Profiles
  console.log("👥 Creating test users and profiles...");
  await db.transaction(async (tx) => {
    for (const id of testUserIds) {
      const name = id.split("-")[1]?.toUpperCase();

      await tx.insert(schema.users).values({
        id,
        name: `${name ?? "No name"} TEST`,
        email: `${id}@mcmaster.ca`,
      });

      await tx.insert(schema.profiles).values({
        userId: id,
        universityRole: id === "user-prof" ? "professor" : "student",
        defaultAddress: "Hamilton, ON",
        defaultLat: 43.2557,
        defaultLong: -79.8711,
      });
    }
  });

  // 3. YOUR ROLE SETUP
  console.log("🚗 Ensuring your driver status...");
  await db
    .insert(schema.profiles)
    .values({
      userId: myId,
      appRole: "driver",
      defaultAddress: "Burlington, ON",
      defaultLat: 43.3248,
      defaultLong: -79.8144,
    })
    .onConflictDoUpdate({
      target: schema.profiles.userId,
      set: { appRole: "driver" },
    });

  await db
    .insert(schema.vehicles)
    .values({
      userId: myId,
      make: "Tesla",
      model: "Model 3",
      color: "Midnight Silver",
      plate: "HITCH-1",
      seats: 4,
    })
    .onConflictDoNothing();

  // 4. SCENARIOS
  console.log("🏁 Setting up scenarios...");

  // Trip you are driving
  const tripLiveId = "trip-live-driver";
  await db
    .insert(schema.trips)
    .values({
      id: tripLiveId,
      driverId: myId,
      origin: "1280 Main St W, Hamilton",
      destination: "Burlington, ON",
      departureTime: new Date(),
      maxSeats: 4,
      status: "in_progress",
    })
    .onConflictDoNothing();

  await db
    .insert(schema.tripRequests)
    .values({
      id: "req-live-pickup",
      tripId: tripLiveId,
      riderId: "user-sarah",
      pickupLat: 43.258,
      pickupLng: -79.91,
      status: "accepted",
    })
    .onConflictDoNothing();

  // Trip you are riding in
  const tripRiderLive = "trip-rider-live";
  await db
    .insert(schema.trips)
    .values({
      id: tripRiderLive,
      driverId: "user-prof",
      origin: "Ancaster",
      destination: "McMaster",
      departureTime: new Date(),
      maxSeats: 2,
      status: "in_progress",
    })
    .onConflictDoNothing();

  await db
    .insert(schema.tripRequests)
    .values({
      id: "req-my-live-ride",
      tripId: tripRiderLive,
      riderId: myId,
      pickupLat: 43.22,
      pickupLng: -79.94,
      status: "on_trip",
    })
    .onConflictDoNothing();

  console.log("✅ Mega Seed Complete!");
}

seed()
  .catch(console.error)
  .finally(() => process.exit());
