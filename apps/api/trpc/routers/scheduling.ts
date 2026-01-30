import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { protectedProcedure, router } from "../trpc";

export const MAX_RECURRING_YEARS = 1;
export const VALID_DAYS = [
  "Mon",
  "Tue",
  "Wed",
  "Thu",
  "Fri",
  "Sat",
  "Sun",
] as const;

const scheduleDataSchema = z
  .object({
    userId: z.string().min(1),
    departureTime: z.coerce.date().optional(),
    daysOfWeek: z.array(z.enum(VALID_DAYS)).optional(),
    timeOfDay: z.string().optional(),
    recurrence: z.unknown().optional(),
  })
  .passthrough();

const scheduleIdSchema = z.object({ scheduleId: z.string().min(1) });
const userIdSchema = z.object({ userId: z.string().min(1) });

export type ScheduleData = z.infer<typeof scheduleDataSchema>;

export type ScheduleRecord = {
  id: string;
  userId: string;
  status: "active" | "cancelled";
  scheduleData: ScheduleData;
  createdAt: Date;
  updatedAt: Date;
};

export type ScheduleList = ScheduleRecord[];

export type Confirmation = {
  success: boolean;
  scheduleId: string;
  message?: string;
};

export type TripRecord = {
  id: string;
  scheduleId: string;
  plannedTime: Date;
  generatedAt: Date;
  metadata?: Record<string, unknown>;
};

export type TripList = TripRecord[];

const scheduleStore = new Map<string, ScheduleRecord>();
const scheduleTrips = new Map<string, TripRecord[]>();

function validateScheduleInput(input: ScheduleData) {
  if (!input.userId) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "ValidationError: userId is required",
    });
  }

  if (input.departureTime && input.departureTime.getTime() < Date.now()) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "ValidationError: departureTime must be in the future",
    });
  }
}

/**
 * Scheduling Router (Minimal)
 * Implements MIS Scheduling Module access programs with in-memory storage only.
 */
export const schedulingRouter = router({
  /**
   * createSchedule(scheduleData) -> ScheduleRecord
   */
  createSchedule: protectedProcedure
    .input(scheduleDataSchema)
    .mutation(async ({ ctx, input }) => {
      if (ctx.userId && input.userId !== ctx.userId) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "ValidationError: user mismatch",
        });
      }

      validateScheduleInput(input);

      const id = crypto.randomUUID();
      const now = new Date();
      const record: ScheduleRecord = {
        id,
        userId: input.userId,
        status: "active",
        scheduleData: input,
        createdAt: now,
        updatedAt: now,
      };

      scheduleStore.set(id, record);

      // Assumption: recurrence rules are stored as metadata only (no expansion).
      scheduleTrips.set(id, []);

      return record;
    }),

  /**
   * getUserSchedules(userId) -> ScheduleList
   */
  getUserSchedules: protectedProcedure
    .input(userIdSchema)
    .query(async ({ input }) => {
      const schedules = Array.from(scheduleStore.values()).filter(
        (schedule) => schedule.userId === input.userId
      );

      if (schedules.length === 0) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "NotFoundError: no schedules for user",
        });
      }

      return schedules;
    }),

  /**
   * cancelSchedule(scheduleId) -> Confirmation
   */
  cancelSchedule: protectedProcedure
    .input(scheduleIdSchema)
    .mutation(async ({ ctx, input }) => {
      const record = scheduleStore.get(input.scheduleId);
      if (!record || (ctx.userId && record.userId !== ctx.userId)) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "UnauthorizedError: schedule not accessible",
        });
      }

      scheduleStore.delete(input.scheduleId);
      scheduleTrips.delete(input.scheduleId);

      return {
        success: true,
        scheduleId: input.scheduleId,
        message: "Schedule cancelled",
      };
    }),

  /**
   * generateFutureTrips(scheduleId) -> TripList
   */
  generateFutureTrips: protectedProcedure
    .input(scheduleIdSchema)
    .mutation(async ({ input }) => {
      const record = scheduleStore.get(input.scheduleId);
      if (!record) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "AlgorithmError: schedule not found",
        });
      }

      const existing = scheduleTrips.get(input.scheduleId);
      if (existing && existing.length > 0) {
        return existing;
      }

      // Assumption: recurrence is not expanded; we return a single placeholder trip.
      // Assumption: overlapping schedules are allowed (not specified in MIS).
      const plannedTime =
        record.scheduleData.departureTime ?? new Date(Date.now() + 3600000);

      const trip: TripRecord = {
        id: crypto.randomUUID(),
        scheduleId: input.scheduleId,
        plannedTime,
        generatedAt: new Date(),
        metadata: {
          recurrence: record.scheduleData.recurrence,
          daysOfWeek: record.scheduleData.daysOfWeek,
          timeOfDay: record.scheduleData.timeOfDay,
        },
      };

      const trips = [trip];
      scheduleTrips.set(input.scheduleId, trips);

      return trips;
    }),
});

/**
 * Usage example (minimal):
 * const schedule = await trpc.scheduling.createSchedule.mutate({
 *   userId,
 *   daysOfWeek: ["Mon", "Wed"],
 *   timeOfDay: "08:30",
 * });
 * const schedules = await trpc.scheduling.getUserSchedules.query({ userId });
 */
