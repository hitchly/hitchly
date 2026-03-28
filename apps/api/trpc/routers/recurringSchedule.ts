import {
  MAX_SEATS,
  TIME_WINDOW_MIN,
  recurringTripSchedules,
  trips,
  users,
} from "@hitchly/db/schema";
import { TRPCError } from "@trpc/server";
import { and, eq, gte, gt, isNull, lte, ne, or, sql } from "drizzle-orm";
import { z } from "zod";

import {
  findNextEnabledDepartureTime,
  getDepartureMinutesInTimezone,
  listDepartureTimesInWindow,
  parseDepartureInstant,
  startOfDayInTimezone,
} from "../../lib/recurring-schedule-time";
import { geocodeAddress } from "../../services/googlemaps";
import { router, protectedProcedure } from "../trpc";

const APP_TIMEZONE = "America/Toronto";

// Helper: minutes from midnight in schedule timezone, ensuring TIME_WINDOW_MIN
function validateScheduleTime(departureTime: Date) {
  const instant = parseDepartureInstant(departureTime);
  const now = new Date();
  // Users pick times at minute precision; align the "15 minutes ahead" rule
  // to minute granularity to avoid surprising rejections due to seconds/ms.
  const minDepartureTime = new Date(now);
  minDepartureTime.setSeconds(0, 0);
  minDepartureTime.setMinutes(minDepartureTime.getMinutes() + TIME_WINDOW_MIN);

  if (instant < minDepartureTime) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: `Departure time must be at least ${String(TIME_WINDOW_MIN)} minutes in the future`,
    });
  }

  return getDepartureMinutesInTimezone(instant, APP_TIMEZONE);
}

const createScheduleInputSchema = z.object({
  origin: z.string().min(1, "Origin is required"),
  destination: z.string().min(1, "Destination is required"),
  // ISO string (preferred) or Date from client — unambiguous instant
  departureTime: z
    .union([z.string(), z.number(), z.date()])
    .transform((v) => parseDepartureInstant(v)),
  maxSeats: z.number().int().min(1).max(MAX_SEATS),
  daysOfWeek: z
    .array(z.number().int().min(0).max(6))
    .min(1, "Select at least one day"),
  effectiveFrom: z
    .union([z.string(), z.number(), z.date()])
    .transform((v) => parseDepartureInstant(v))
    .optional(), // defaults to today on server
  effectiveTo: z
    .union([z.string(), z.number(), z.date()])
    .transform((v) => parseDepartureInstant(v))
    .optional(),
});

const updateScheduleInputSchema = createScheduleInputSchema
  .omit({ origin: true, destination: true, departureTime: true })
  .partial()
  .extend({
    id: z.string(),
    origin: z.string().min(1).optional(),
    destination: z.string().min(1).optional(),
    departureTime: z
      .union([z.string(), z.number(), z.date()])
      .transform((v) => parseDepartureInstant(v))
      .optional(),
  });

export const recurringScheduleRouter = router({
  listMine: protectedProcedure.query(async ({ ctx }) => {
    const schedules = await ctx.db
      .select()
      .from(recurringTripSchedules)
      .where(eq(recurringTripSchedules.userId, ctx.userId));

    return schedules;
  }),

  getById: protectedProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      const [schedule] = await ctx.db
        .select()
        .from(recurringTripSchedules)
        .where(
          and(
            eq(recurringTripSchedules.id, input.id),
            eq(recurringTripSchedules.userId, ctx.userId)
          )
        );

      if (!schedule) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Schedule not found",
        });
      }

      return schedule;
    }),

  create: protectedProcedure
    .input(createScheduleInputSchema)
    .mutation(async ({ ctx, input }) => {
      const [user] = await ctx.db
        .select()
        .from(users)
        .where(eq(users.id, ctx.userId));

      if (!user) {
        throw new TRPCError({
          code: "UNAUTHORIZED",
          message: "User not found",
        });
      }

      const now = new Date();
      const effectiveFromRaw = input.effectiveFrom ?? now;
      // Start of calendar day in schedule TZ (not server local midnight).
      const effectiveFrom = startOfDayInTimezone(
        effectiveFromRaw,
        APP_TIMEZONE
      );

      const departureMinutes = validateScheduleTime(input.departureTime);

      const [originCoords, destCoords] = await Promise.all([
        geocodeAddress(input.origin),
        geocodeAddress(input.destination),
      ]);

      if (!originCoords || !destCoords) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message:
            "Failed to geocode addresses. Please check your origin and destination.",
        });
      }

      const [schedule] = await ctx.db
        .insert(recurringTripSchedules)
        .values({
          userId: ctx.userId,
          role: "driver",
          origin: input.origin,
          destination: input.destination,
          originLat: originCoords.lat,
          originLng: originCoords.lng,
          destLat: destCoords.lat,
          destLng: destCoords.lng,
          departureMinutes,
          scheduleTimezone: APP_TIMEZONE,
          maxSeats: input.maxSeats,
          effectiveFrom,
          effectiveTo: input.effectiveTo,
          sunday: input.daysOfWeek.includes(0),
          monday: input.daysOfWeek.includes(1),
          tuesday: input.daysOfWeek.includes(2),
          wednesday: input.daysOfWeek.includes(3),
          thursday: input.daysOfWeek.includes(4),
          friday: input.daysOfWeek.includes(5),
          saturday: input.daysOfWeek.includes(6),
        })
        .returning();

      return schedule;
    }),

  generateNextTripForSchedule: protectedProcedure
    .input(
      z.object({
        recurringScheduleId: z.string(),
        after: z.coerce.date(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const schedulesResult = (await ctx.db
        .select()
        .from(recurringTripSchedules)
        .where(
          and(
            eq(recurringTripSchedules.id, input.recurringScheduleId),
            eq(recurringTripSchedules.userId, ctx.userId)
          )
        )
        .limit(1)) as (typeof recurringTripSchedules.$inferSelect)[];
      const schedule = schedulesResult[0];

      if (!schedule) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Schedule not found",
        });
      }
      if (!schedule.isActive) {
        return { created: false, trip: null };
      }

      const nextDepartureTime = findNextEnabledDepartureTime(
        schedule,
        input.after,
        schedule.scheduleTimezone,
        60
      );
      if (!nextDepartureTime) {
        return { created: false, trip: null };
      }

      const existing = await ctx.db
        .select({ id: trips.id })
        .from(trips)
        .where(
          and(
            eq(trips.driverId, schedule.userId),
            eq(trips.recurringScheduleId, schedule.id),
            eq(trips.departureTime, nextDepartureTime),
            ne(trips.status, "cancelled")
          )
        )
        .limit(1);

      if (existing.length > 0) {
        const id = existing[0]?.id;
        return {
          created: false,
          trip: id ? { id, departureTime: nextDepartureTime } : null,
        };
      }

      const [trip] = await ctx.db
        .insert(trips)
        .values({
          id: crypto.randomUUID(),
          driverId: schedule.userId,
          origin: schedule.origin,
          destination: schedule.destination,
          originLat: schedule.originLat,
          originLng: schedule.originLng,
          destLat: schedule.destLat,
          destLng: schedule.destLng,
          departureTime: nextDepartureTime,
          maxSeats: schedule.maxSeats,
          bookedSeats: 0,
          status: "pending",
          recurringScheduleId: schedule.id,
        })
        .returning({ id: trips.id, departureTime: trips.departureTime });

      return { created: true, trip };
    }),

  generateUpcomingTripsForUser: protectedProcedure
    .input(
      z
        .object({
          daysAhead: z.number().int().min(1).max(60).default(28),
        })
        .optional()
    )
    .mutation(async ({ ctx, input }) => {
      const daysAhead = input?.daysAhead ?? 28;
      const now = new Date();
      const end = new Date(now.getTime() + daysAhead * 24 * 60 * 60 * 1000);

      const schedules = await ctx.db
        .select()
        .from(recurringTripSchedules)
        .where(
          and(
            eq(recurringTripSchedules.userId, ctx.userId),
            eq(recurringTripSchedules.isActive, true),
            lte(recurringTripSchedules.effectiveFrom, end),
            or(
              isNull(recurringTripSchedules.effectiveTo),
              gte(recurringTripSchedules.effectiveTo, now)
            )
          )
        );
      const typedSchedules =
        schedules as (typeof recurringTripSchedules.$inferSelect)[];

      const createdTrips: { id: string }[] = [];

      for (const schedule of typedSchedules) {
        const minDepartureTime = new Date(
          now.getTime() + TIME_WINDOW_MIN * 60 * 1000
        );
        const departureCandidates = listDepartureTimesInWindow(
          schedule,
          now,
          schedule.scheduleTimezone,
          daysAhead,
          minDepartureTime
        );

        for (const departureTime of departureCandidates) {
          const existing = await ctx.db
            .select({ id: trips.id })
            .from(trips)
            .where(
              and(
                eq(trips.driverId, schedule.userId),
                eq(trips.origin, schedule.origin),
                eq(trips.destination, schedule.destination),
                eq(trips.departureTime, departureTime)
              )
            );

          if (existing.length > 0) continue;

          const [_trip] = await ctx.db
            .insert(trips)
            .values({
              id: crypto.randomUUID(),
              driverId: schedule.userId,
              origin: schedule.origin,
              destination: schedule.destination,
              originLat: schedule.originLat,
              originLng: schedule.originLng,
              destLat: schedule.destLat,
              destLng: schedule.destLng,
              departureTime,
              maxSeats: schedule.maxSeats,
              bookedSeats: 0,
              status: "pending",
              recurringScheduleId: schedule.id,
            })
            .returning({ id: trips.id });

          createdTrips.push({ id: _trip?.id ?? schedule.id });
        }
      }

      return { createdCount: createdTrips.length, trips: createdTrips };
    }),

  getNextTripOccurrence: protectedProcedure
    .input(
      z.object({
        recurringScheduleId: z.string(),
        after: z.coerce.date(),
        targetWeekday: z.number().int().min(0).max(6).optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      const whereConditions = [
        eq(trips.recurringScheduleId, input.recurringScheduleId),
        gt(trips.departureTime, input.after),
        ne(trips.status, "cancelled"),
      ];

      if (input.targetWeekday !== undefined) {
        whereConditions.push(
          sql`extract(dow from (${trips.departureTime} AT TIME ZONE 'America/Toronto')) = ${input.targetWeekday}`
        );
      }

      const [nextTrip] = await ctx.db
        .select({
          id: trips.id,
          departureTime: trips.departureTime,
          origin: trips.origin,
          destination: trips.destination,
        })
        .from(trips)
        .where(and(...whereConditions))
        .orderBy(trips.departureTime)
        .limit(1);

      return nextTrip ?? null;
    }),

  update: protectedProcedure
    .input(updateScheduleInputSchema)
    .mutation(async ({ ctx, input }) => {
      const existingRows = (await ctx.db
        .select()
        .from(recurringTripSchedules)
        .where(
          eq(recurringTripSchedules.id, input.id)
        )) as (typeof recurringTripSchedules.$inferSelect)[];
      const existing = existingRows[0];

      if (existing?.userId !== ctx.userId) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Schedule not found",
        });
      }

      const updates: Partial<typeof recurringTripSchedules.$inferInsert> = {};

      if (typeof input.maxSeats === "number") {
        if (input.maxSeats < 1 || input.maxSeats > MAX_SEATS) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: `Max seats must be between 1 and ${String(MAX_SEATS)}`,
          });
        }
        updates.maxSeats = input.maxSeats;
      }

      if (input.effectiveFrom) {
        updates.effectiveFrom = startOfDayInTimezone(
          input.effectiveFrom,
          existing.scheduleTimezone
        );
      }
      if (input.effectiveTo) updates.effectiveTo = input.effectiveTo;

      if (input.daysOfWeek) {
        updates.sunday = input.daysOfWeek.includes(0);
        updates.monday = input.daysOfWeek.includes(1);
        updates.tuesday = input.daysOfWeek.includes(2);
        updates.wednesday = input.daysOfWeek.includes(3);
        updates.thursday = input.daysOfWeek.includes(4);
        updates.friday = input.daysOfWeek.includes(5);
        updates.saturday = input.daysOfWeek.includes(6);
      }

      if (input.departureTime) {
        updates.departureMinutes = getDepartureMinutesInTimezone(
          input.departureTime,
          existing.scheduleTimezone
        );
      }

      if (input.origin || input.destination) {
        const origin = input.origin ?? existing.origin;
        const destination = input.destination ?? existing.destination;

        const [originCoords, destCoords] = await Promise.all([
          geocodeAddress(origin),
          geocodeAddress(destination),
        ]);

        if (!originCoords || !destCoords) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message:
              "Failed to geocode addresses. Please check your origin and destination.",
          });
        }

        updates.origin = origin;
        updates.destination = destination;
        updates.originLat = originCoords.lat;
        updates.originLng = originCoords.lng;
        updates.destLat = destCoords.lat;
        updates.destLng = destCoords.lng;
      }

      const [updated] = await ctx.db
        .update(recurringTripSchedules)
        .set(updates)
        .where(eq(recurringTripSchedules.id, input.id))
        .returning();

      return updated;
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const existingRows = (await ctx.db
        .select()
        .from(recurringTripSchedules)
        .where(
          eq(recurringTripSchedules.id, input.id)
        )) as (typeof recurringTripSchedules.$inferSelect)[];
      const existing = existingRows[0];

      if (existing?.userId !== ctx.userId) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Schedule not found",
        });
      }

      await ctx.db
        .update(recurringTripSchedules)
        .set({ isActive: false })
        .where(eq(recurringTripSchedules.id, input.id));

      return { success: true };
    }),
});
