/**
 * Backfill `departure_minutes` on recurring_trip_schedules from existing trip rows.
 * Use after bad data was written with server-local/UTC time extraction instead of schedule_timezone.
 *
 * Run: pnpm --filter @hitchly/api run repair:recurring-minutes
 * Requires DB_HOST, DB_PORT, DB_USER, DB_PASSWORD, DB_NAME in .env (see apps/api/.env.example).
 * For remote Postgres (Neon, etc.): set DB_SSL=true or PGSSLMODE=require or the driver will error with
 * "connection is insecure (try using sslmode=require)".
 */
/* eslint-disable no-console */
import "dotenv/config";

import { db } from "@hitchly/db/client";
import { recurringTripSchedules, trips } from "@hitchly/db/schema";
import { and, asc, eq, ne } from "drizzle-orm";

import { getDepartureMinutesInTimezone } from "../lib/recurring-schedule-time";

async function main(): Promise<void> {
  const schedules = await db.select().from(recurringTripSchedules);

  let updated = 0;
  let skippedNoTrip = 0;
  let unchanged = 0;

  for (const schedule of schedules) {
    const [sample] = await db
      .select({ departureTime: trips.departureTime })
      .from(trips)
      .where(
        and(
          eq(trips.recurringScheduleId, schedule.id),
          ne(trips.status, "cancelled")
        )
      )
      .orderBy(asc(trips.departureTime))
      .limit(1);

    if (!sample?.departureTime) {
      skippedNoTrip += 1;
      console.warn(
        `Skip schedule ${schedule.id}: no non-cancelled trip to infer time from`
      );
      continue;
    }

    const dt =
      sample.departureTime instanceof Date
        ? sample.departureTime
        : new Date(sample.departureTime);

    const fixed = getDepartureMinutesInTimezone(dt, schedule.scheduleTimezone);

    if (fixed === schedule.departureMinutes) {
      unchanged += 1;
      continue;
    }

    await db
      .update(recurringTripSchedules)
      .set({ departureMinutes: fixed, updatedAt: new Date() })
      .where(eq(recurringTripSchedules.id, schedule.id));

    console.log(
      `Updated ${schedule.id}: departure_minutes ${String(schedule.departureMinutes)} -> ${String(fixed)} (from trip @ ${dt.toISOString()})`
    );
    updated += 1;
  }

  console.log(
    `\nDone. updated=${String(updated)} unchanged=${String(unchanged)} skippedNoTrip=${String(
      skippedNoTrip
    )}`
  );
}

main().catch((err: unknown) => {
  console.error(err);
  process.exit(1);
});
