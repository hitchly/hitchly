import { describe, expect, it } from "vitest";

import {
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
});
