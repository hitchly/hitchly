// TODO: Fix linting errors in this file and re-enable eslint
/* eslint-disable */
import { db } from "@hitchly/db/client";
import { tripRequests, trips, users } from "@hitchly/db/schema";
import "dotenv/config";
import { eq, sql } from "drizzle-orm";

/**
 * Fix trips that are stuck in "pending" status but have accepted riders
 * This fixes trips that got stuck due to bugs in the accept request logic
 */
async function fixStuckTrips() {
  console.log("🔍 Finding stuck trips...");

  // Find all trips that are "pending" but have accepted riders
  const stuckTrips = await db
    .select({
      trip: trips,
      acceptedCount: sql<number>`cast(count(${tripRequests.id}) filter (where ${tripRequests.status} = 'accepted') as int)`,
    })
    .from(trips)
    .leftJoin(tripRequests, eq(trips.id, tripRequests.tripId))
    .where(eq(trips.status, "pending"))
    .groupBy(trips.id)
    .having(
      sql`cast(count(${tripRequests.id}) filter (where ${tripRequests.status} = 'accepted') as int) > 0`
    );

  console.log(`Found ${stuckTrips.length} stuck trip(s)`);

  if (stuckTrips.length === 0) {
    console.log("✅ No stuck trips found!");
    return;
  }

  // Fix each stuck trip
  for (const { trip, acceptedCount } of stuckTrips) {
    console.log(`\n📋 Trip ID: ${trip.id}`);
    console.log(`   Driver ID: ${trip.driverId}`);
    console.log(`   Current Status: ${trip.status}`);
    console.log(`   Accepted Riders: ${acceptedCount}`);
    console.log(`   Booked Seats: ${trip.bookedSeats}`);

    // Get driver email for logging
    const driver = await db.query.users.findFirst({
      where: eq(users.id, trip.driverId),
    });

    console.log(`   Driver Email: ${driver?.email || "Unknown"}`);

    // Update trip status to "active"
    await db
      .update(trips)
      .set({
        status: "active",
        updatedAt: new Date(),
      })
      .where(eq(trips.id, trip.id));

    console.log(`   ✅ Fixed! Status changed to "active"`);
  }

  console.log(`\n✅ Successfully fixed ${stuckTrips.length} trip(s)!`);
}

// Run the fix
fixStuckTrips()
  .then(() => {
    console.log("\n✨ Done!");
    process.exit(0);
  })
  .catch((error) => {
    console.error("❌ Error fixing stuck trips:", error);
    process.exit(1);
  });
