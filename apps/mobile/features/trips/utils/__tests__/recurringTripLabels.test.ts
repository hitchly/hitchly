import { describe, expect, it } from "vitest";

import {
  formatNextTripLine,
  formatRecurringDaysLabel,
  formatWeeklyCommuteLabel,
  isTripRecurring,
} from "../recurringTripLabels";

describe("recurringTripLabels", () => {
  it("detects recurring trips from recurringScheduleId", () => {
    expect(isTripRecurring({ recurringScheduleId: "sched-1" })).toBe(true);
    expect(isTripRecurring({ recurringScheduleId: null })).toBe(false);
    expect(isTripRecurring({})).toBe(false);
  });

  it("formats weekly commute label from Date", () => {
    const date = new Date("2025-04-07T08:00:00Z"); // Monday in many timezones
    const meta = formatWeeklyCommuteLabel(date);
    expect(meta?.title).toBe("Weekly commute");
    expect(meta?.subtitle).toContain("Occurs every");
  });

  it("returns null for invalid dates", () => {
    expect(formatWeeklyCommuteLabel(undefined)).toBeNull();
    expect(formatWeeklyCommuteLabel(null)).toBeNull();
  });

  it("formats recurring days label from schedule day array", () => {
    expect(formatRecurringDaysLabel([1, 5])).toBe("Occurs every Mon, Fri");
    expect(formatRecurringDaysLabel([5, 1, 5])).toBe("Occurs every Mon, Fri");
    expect(formatRecurringDaysLabel([])).toBeNull();
  });

  it("formats next trip line with weekday and ordinal day in Toronto", () => {
    // April 11, 2025 11:20 PM EDT → April 12, 2025 03:20 UTC
    const line = formatNextTripLine(new Date("2025-04-12T03:20:00.000Z"));
    expect(line).toContain("Next trip is");
    expect(line).toContain("Friday");
    expect(line).toContain("April");
    expect(line).toMatch(/\b\d{1,2}(st|nd|rd|th)\b/i);
  });
});
