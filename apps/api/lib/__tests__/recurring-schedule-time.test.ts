import { strict as assert } from "node:assert";

import { DateTime } from "luxon";
import { describe, expect, it } from "vitest";

import {
  findNextEnabledDepartureTime,
  getDepartureMinutesInTimezone,
  startOfDayInTimezone,
} from "../recurring-schedule-time";

const TZ = "America/Toronto";

describe("recurring-schedule-time", () => {
  it("uses Toronto wall clock for departure minutes, not UTC components", () => {
    const torontoFriday = DateTime.fromObject(
      { year: 2025, month: 4, day: 4, hour: 23, minute: 20 },
      { zone: TZ }
    );
    const instant = torontoFriday.toJSDate();
    expect(getDepartureMinutesInTimezone(instant, TZ)).toBe(23 * 60 + 20);
  });

  it("startOfDayInTimezone uses Toronto calendar day, not server TZ", () => {
    const instant = new Date("2025-04-03T03:20:00.000Z");
    const start = startOfDayInTimezone(instant, TZ);
    const local = DateTime.fromJSDate(start, { zone: TZ });
    expect(local.year).toBe(2025);
    expect(local.month).toBe(4);
    expect(local.day).toBe(2);
    expect(local.hour).toBe(0);
    expect(local.minute).toBe(0);
  });

  it("next Friday 11:20 PM Toronto matches schedule weekday in Toronto", () => {
    const schedule = {
      sunday: false,
      monday: false,
      tuesday: false,
      wednesday: false,
      thursday: false,
      friday: true,
      saturday: false,
      departureMinutes: 23 * 60 + 20,
      effectiveFrom: new Date("2025-01-01T05:00:00.000Z"),
      effectiveTo: null,
    };

    const after = DateTime.fromObject(
      { year: 2025, month: 4, day: 4, hour: 10, minute: 0 },
      { zone: TZ }
    ).toJSDate();

    const next = findNextEnabledDepartureTime(schedule, after, TZ, 14);
    expect(next).not.toBeNull();
    assert(next !== null);

    const inToronto = DateTime.fromJSDate(next, { zone: TZ });
    expect(inToronto.weekday).toBe(5);
    expect(inToronto.hour).toBe(23);
    expect(inToronto.minute).toBe(20);
  });
});
