import { tripRequests, trips, users } from "@hitchly/db/schema";
import { desc, eq, gt, or } from "drizzle-orm";
import { z } from "zod";

import { protectedProcedure, router } from "../../trpc";

export const operationsRouter = router({
  metrics: protectedProcedure
    .output(
      z.object({
        kpis: z.object({
          activeRides: z.number(),
          avgDetour: z.number(), // in minutes
          seatUtilization: z.number(), // percentage
          totalRequests: z.number(),
        }),
        throughput: z.array(
          z.object({
            time: z.string(),
            active: z.number(),
          })
        ),
        hotspots: z.array(
          z.object({
            name: z.string(),
            count: z.number(),
            percentage: z.string(),
          })
        ),
        recentTrips: z.array(
          z.object({
            id: z.string(),
            driver: z.string(),
            origin: z.string(),
            destination: z.string(),
            status: z.string(),
            createdAt: z.date(),
          })
        ),
      })
    )
    .query(async ({ ctx }) => {
      // 1. KPI: Active Rides
      const activeTrips = await ctx.db
        .select()
        .from(trips)
        .where(or(eq(trips.status, "active"), eq(trips.status, "in_progress")));

      // 2. KPI: Avg Detour & Seat Util
      // We fetch raw data and aggregate in JS to ensure strict type safety without 'sql' casting
      const allRequests = await ctx.db
        .select({
          detour: tripRequests.estimatedDetourSec,
        })
        .from(tripRequests);

      const totalDetour = allRequests.reduce(
        (acc, req) => acc + (req.detour ?? 0),
        0
      );
      const avgDetourMin =
        allRequests.length > 0
          ? Math.round(totalDetour / allRequests.length / 60)
          : 0;

      // Seat Util (Active trips only)
      let totalCapacity = 0;
      let totalBooked = 0;
      activeTrips.forEach((t) => {
        totalCapacity += t.maxSeats;
        totalBooked += t.bookedSeats;
      });
      const seatUtil =
        totalCapacity > 0 ? Math.round((totalBooked / totalCapacity) * 100) : 0;

      // 3. Chart: Throughput (Last 24h)
      const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
      const recentActivity = await ctx.db
        .select({ time: trips.departureTime })
        .from(trips)
        .where(gt(trips.departureTime, oneDayAgo));

      const throughputMap = new Map<string, number>();
      // Initialize buckets with 0
      for (let i = 0; i < 24; i += 2) {
        const h = i.toString().padStart(2, "0") + ":00";
        throughputMap.set(h, 0);
      }
      // Fill data
      recentActivity.forEach((t) => {
        const hour = t.time.getHours();
        // Bucket into 2-hour intervals for cleaner charts
        const bucket =
          (hour % 2 === 0 ? hour : hour - 1).toString().padStart(2, "0") +
          ":00";
        throughputMap.set(bucket, (throughputMap.get(bucket) ?? 0) + 1);
      });

      const throughput = Array.from(throughputMap.entries())
        .map(([time, active]) => ({ time, active }))
        .sort((a, b) => a.time.localeCompare(b.time));

      // 4. Hotspots (Top Destinations)
      const allDestinations = await ctx.db
        .select({ name: trips.destination })
        .from(trips);

      const destCounts: Record<string, number> = {};
      allDestinations.forEach((t) => {
        destCounts[t.name] = (destCounts[t.name] ?? 0) + 1;
      });

      const totalDestTrips = allDestinations.length || 1;
      const hotspots = Object.entries(destCounts)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 3)
        .map(([name, count]) => ({
          name,
          count,
          // FIX: Explicit String() cast to satisfy strict template literal rules
          percentage: `${String(Math.round((count / totalDestTrips) * 100))}%`,
        }));

      // 5. Recent Logs (Trips + Driver Name)
      const recentLogs = await ctx.db
        .select({
          id: trips.id,
          origin: trips.origin,
          destination: trips.destination,
          status: trips.status,
          createdAt: trips.createdAt,
          driverName: users.name,
        })
        .from(trips)
        .innerJoin(users, eq(trips.driverId, users.id))
        .orderBy(desc(trips.createdAt))
        .limit(6);

      return {
        kpis: {
          activeRides: activeTrips.length,
          avgDetour: avgDetourMin,
          seatUtilization: seatUtil,
          totalRequests: allRequests.length,
        },
        throughput,
        hotspots,
        recentTrips: recentLogs.map((t) => ({
          id: t.id,
          driver: t.driverName,
          origin: t.origin,
          destination: t.destination,
          status: t.status,
          createdAt: t.createdAt,
        })),
      };
    }),
});
