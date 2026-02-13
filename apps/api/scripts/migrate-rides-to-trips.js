import "dotenv/config";
import { db } from "@hitchly/db/client";
import { trips, tripRequests } from "@hitchly/db/schema";
import { geocodeAddress } from "../services/googlemaps";
import { eq } from "drizzle-orm";
import { Pool } from "pg";
/**
 * Migration script to merge rides table into trips table
 * This script:
 * 1. Copies all rides records to trips table
 * 2. Geocodes existing trips that only have addresses
 * 3. Migrates rideRequests to tripRequests
 */
async function migrateRidesToTrips() {
  console.log("🔄 Starting migration: rides → trips\n");
  // Create a direct pool connection for raw SQL queries
  const pool = new Pool({
    host: process.env.DB_HOST,
    port: Number(process.env.DB_PORT),
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
  });
  try {
    // Step 1: Check if rides table exists and has data
    // Note: We're using raw SQL here because the rides table won't exist in the new schema
    const ridesCheck = await pool.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'rides'
      );
    `);
    const ridesTableExists = ridesCheck.rows[0]?.exists;
    if (!ridesTableExists) {
      console.log("ℹ️  Rides table does not exist. Skipping rides migration.");
    } else {
      // Get all rides
      const ridesResult = await pool.query(`
          SELECT * FROM rides;
        `);
      const rides = ridesResult.rows;
      if (rides.length === 0) {
        console.log("ℹ️  No rides found to migrate.");
      } else {
        console.log(`📦 Found ${rides.length} rides to migrate...`);
        let migratedCount = 0;
        let skippedCount = 0;
        for (const ride of rides) {
          // Check if trip already exists (idempotent check)
          const existingTrip = await db
            .select()
            .from(trips)
            .where(eq(trips.id, ride.id))
            .limit(1);
          if (existingTrip.length > 0) {
            console.log(`⏭️  Skipping ride ${ride.id} - already migrated`);
            skippedCount++;
            continue;
          }
          // Map ride to trip format
          await db.insert(trips).values({
            id: ride.id,
            driverId: ride.driver_id,
            origin: ride.origin_address || "Unknown",
            destination: ride.dest_address || "Unknown",
            originLat: ride.origin_lat,
            originLng: ride.origin_lng,
            destLat: ride.dest_lat,
            destLng: ride.dest_lng,
            departureTime: ride.start_time,
            maxSeats: ride.max_seats,
            bookedSeats: ride.booked_seats || 0,
            status: ride.status === "scheduled" ? "scheduled" : "pending",
            createdAt: ride.created_at,
            updatedAt: ride.created_at || new Date(),
          });
          migratedCount++;
          console.log(`✅ Migrated ride ${ride.id}`);
        }
        console.log(
          `\n✨ Migrated ${migratedCount} rides (${skippedCount} skipped)`
        );
      }
      // Step 2: Migrate rideRequests to tripRequests
      const requestsCheck = await pool.query(`
        SELECT EXISTS (
          SELECT FROM information_schema.tables 
          WHERE table_schema = 'public' 
          AND table_name = 'ride_requests'
        );
      `);
      const requestsTableExists = requestsCheck.rows[0]?.exists;
      if (requestsTableExists) {
        const requestsResult = await pool.query(`
          SELECT * FROM ride_requests;
        `);
        const rideRequests = requestsResult.rows;
        if (rideRequests.length > 0) {
          console.log(
            `\n📦 Found ${rideRequests.length} ride requests to migrate...`
          );
          let migratedRequestsCount = 0;
          let skippedRequestsCount = 0;
          for (const request of rideRequests) {
            // Check if trip request already exists
            const existingRequest = await db
              .select()
              .from(tripRequests)
              .where(eq(tripRequests.id, request.id))
              .limit(1);
            if (existingRequest.length > 0) {
              console.log(
                `⏭️  Skipping request ${request.id} - already migrated`
              );
              skippedRequestsCount++;
              continue;
            }
            // Verify the trip exists (should have been migrated above)
            const tripExists = await db
              .select()
              .from(trips)
              .where(eq(trips.id, request.ride_id))
              .limit(1);
            if (tripExists.length === 0) {
              console.log(
                `⚠️  Skipping request ${request.id} - trip ${request.ride_id} not found`
              );
              skippedRequestsCount++;
              continue;
            }
            await db.insert(tripRequests).values({
              id: request.id,
              tripId: request.ride_id,
              riderId: request.rider_id,
              pickupLat: request.pickup_lat,
              pickupLng: request.pickup_lng,
              status: request.status,
              createdAt: request.created_at,
              updatedAt: request.updated_at || request.created_at || new Date(),
            });
            migratedRequestsCount++;
            console.log(`✅ Migrated request ${request.id}`);
          }
          console.log(
            `\n✨ Migrated ${migratedRequestsCount} requests (${skippedRequestsCount} skipped)`
          );
        }
      }
    }
    // Step 3: Geocode existing trips that only have addresses
    console.log("\n🌍 Geocoding trips with addresses only...");
    // Use raw SQL to find trips without coordinates
    const tripsToGeocodeResult = await pool.query(`
      SELECT * FROM trips 
      WHERE origin_lat IS NULL OR origin_lng IS NULL OR dest_lat IS NULL OR dest_lng IS NULL
      LIMIT 100;
    `);
    const tripsToGeocode = tripsToGeocodeResult.rows;
    if (tripsToGeocode.length === 0) {
      console.log("ℹ️  No trips need geocoding.");
    } else {
      console.log(`📦 Found ${tripsToGeocode.length} trips to geocode...`);
      let geocodedCount = 0;
      let failedCount = 0;
      for (const trip of tripsToGeocode) {
        try {
          const [originCoords, destCoords] = await Promise.all([
            geocodeAddress(trip.origin),
            geocodeAddress(trip.destination),
          ]);
          if (originCoords && destCoords) {
            await db
              .update(trips)
              .set({
                originLat: originCoords.lat,
                originLng: originCoords.lng,
                destLat: destCoords.lat,
                destLng: destCoords.lng,
                updatedAt: new Date(),
              })
              .where(eq(trips.id, trip.id));
            geocodedCount++;
            console.log(`✅ Geocoded trip ${trip.id}`);
          } else {
            console.warn(
              `⚠️  Failed to geocode trip ${trip.id} - origin: ${originCoords ? "✓" : "✗"}, dest: ${destCoords ? "✓" : "✗"}`
            );
            failedCount++;
          }
        } catch (error) {
          console.error(`❌ Error geocoding trip ${trip.id}:`, error);
          failedCount++;
        }
        // Small delay to avoid rate limiting
        await new Promise((resolve) => setTimeout(resolve, 100));
      }
      console.log(
        `\n✨ Geocoded ${geocodedCount} trips (${failedCount} failed)`
      );
    }
    console.log("\n✅ Migration complete!");
    console.log("\n📝 Next steps:");
    console.log("   1. Verify data in trips and trip_requests tables");
    console.log("   2. Test matchmaking functionality");
    console.log(
      "   3. Once verified, you can drop the old rides and ride_requests tables"
    );
  } catch (error) {
    console.error("❌ Migration failed:", error);
    throw error;
  } finally {
    await pool.end();
  }
}
migrateRidesToTrips()
  .then(() => {
    process.exit(0);
  })
  .catch((error) => {
    console.error("Fatal error:", error);
    process.exit(1);
  });
