import { DateTime } from "luxon";

/** Default matches `APP_TIMEZONE` in recurring schedule router and mobile Toronto helpers. */
export const DEFAULT_SCHEDULE_TIMEZONE = "America/Toronto";

/**
 * Normalize client/tRPC payloads (Date, ISO string, ms) to a single UTC instant.
 * Prefer ISO strings with offset/Z from the client so the instant is unambiguous.
 */
export function parseDepartureInstant(input: unknown): Date {
  if (input instanceof Date) {
    if (Number.isNaN(input.getTime())) {
      throw new Error("Invalid Date");
    }
    return input;
  }
  if (typeof input === "number") {
    const d = new Date(input);
    if (Number.isNaN(d.getTime())) {
      throw new Error("Invalid timestamp");
    }
    return d;
  }
  if (typeof input === "string") {
    const dt = DateTime.fromISO(input, { setZone: true });
    if (dt.isValid) {
      return dt.toJSDate();
    }
    const d = new Date(input);
    if (Number.isNaN(d.getTime())) {
      throw new Error("Invalid departure time string");
    }
    return d;
  }
  throw new Error("Invalid departure instant");
}

export interface RecurringScheduleWeekdayFields {
  sunday: boolean;
  monday: boolean;
  tuesday: boolean;
  wednesday: boolean;
  thursday: boolean;
  friday: boolean;
  saturday: boolean;
  departureMinutes: number;
  effectiveFrom: Date;
  effectiveTo: Date | null;
}

function isScheduleEnabledForJsWeekday(
  schedule: RecurringScheduleWeekdayFields,
  jsWeekday: number
): boolean {
  return (
    (jsWeekday === 0 && schedule.sunday) ||
    (jsWeekday === 1 && schedule.monday) ||
    (jsWeekday === 2 && schedule.tuesday) ||
    (jsWeekday === 3 && schedule.wednesday) ||
    (jsWeekday === 4 && schedule.thursday) ||
    (jsWeekday === 5 && schedule.friday) ||
    (jsWeekday === 6 && schedule.saturday)
  );
}

/**
 * Minutes from midnight in `timeZone` for this instant (matches stored `departure_minutes`).
 */
export function getDepartureMinutesInTimezone(
  departureTime: Date,
  timeZone: string
): number {
  const dt = DateTime.fromMillis(departureTime.getTime(), { zone: timeZone });
  if (!dt.isValid) {
    throw new Error(`Invalid departure time for timezone ${timeZone}`);
  }
  return dt.hour * 60 + dt.minute;
}

/**
 * Start of calendar day in `timeZone` for this instant (for schedule effectiveFrom windows).
 */
export function startOfDayInTimezone(instant: Date, timeZone: string): Date {
  const dt = DateTime.fromMillis(instant.getTime(), { zone: timeZone });
  if (!dt.isValid) {
    throw new Error(`Invalid instant for timezone ${timeZone}`);
  }
  return dt.startOf("day").toJSDate();
}

/**
 * Next occurrence strictly after `after`, using wall clock and weekday flags in `timeZone`.
 */
export function findNextEnabledDepartureTime(
  schedule: RecurringScheduleWeekdayFields,
  after: Date,
  timeZone: string,
  daysAhead = 60
): Date | null {
  const zone = timeZone || DEFAULT_SCHEDULE_TIMEZONE;
  const afterDt = DateTime.fromMillis(after.getTime(), { zone });
  if (!afterDt.isValid) {
    return null;
  }

  const startDay = afterDt.startOf("day");

  for (let i = 0; i <= daysAhead; i++) {
    const day = startDay.plus({ days: i });
    // Luxon: Mon=1 … Sun=7 — JS Sun=0, Mon=1 … Sat=6
    const jsWeekday = day.weekday % 7;

    if (!isScheduleEnabledForJsWeekday(schedule, jsWeekday)) continue;

    const hour = Math.floor(schedule.departureMinutes / 60);
    const minute = schedule.departureMinutes % 60;

    const departure = day.set({
      hour,
      minute,
      second: 0,
      millisecond: 0,
    });

    const departureJs = departure.toJSDate();

    if (departureJs < schedule.effectiveFrom) continue;
    if (schedule.effectiveTo && departureJs > schedule.effectiveTo) continue;
    if (departureJs <= after) continue;

    return departureJs;
  }
  return null;
}

/**
 * Enumerate scheduled departure instants in `[windowStart, windowStart + daysAhead]` (calendar days in `timeZone`),
 * each at least `minDepartureAfter`.
 */
export function listDepartureTimesInWindow(
  schedule: RecurringScheduleWeekdayFields,
  windowStart: Date,
  timeZone: string,
  daysAhead: number,
  minDepartureAfter: Date
): Date[] {
  const zone = timeZone || DEFAULT_SCHEDULE_TIMEZONE;
  const tzStart = DateTime.fromMillis(windowStart.getTime(), { zone }).startOf(
    "day"
  );
  const out: Date[] = [];

  for (let i = 0; i <= daysAhead; i++) {
    const day = tzStart.plus({ days: i });
    const jsWeekday = day.weekday % 7;

    if (!isScheduleEnabledForJsWeekday(schedule, jsWeekday)) continue;

    const hour = Math.floor(schedule.departureMinutes / 60);
    const minute = schedule.departureMinutes % 60;

    const departure = day.set({
      hour,
      minute,
      second: 0,
      millisecond: 0,
    });

    const departureJs = departure.toJSDate();

    if (departureJs < schedule.effectiveFrom) continue;
    if (schedule.effectiveTo && departureJs > schedule.effectiveTo) continue;
    if (departureJs < minDepartureAfter) continue;

    out.push(departureJs);
  }

  return out;
}
