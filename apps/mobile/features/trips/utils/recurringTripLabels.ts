export const isTripRecurring = (trip: {
  recurringScheduleId?: string | null;
}) => Boolean(trip.recurringScheduleId);

/** Aligns with API recurring schedules (`schedule_timezone`) and mobile weekday helpers. */
const TRIP_DISPLAY_TIMEZONE = "America/Toronto";

const SHORT_WEEKDAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

const getOrdinalSuffix = (day: number) => {
  const mod100 = day % 100;
  if (mod100 >= 11 && mod100 <= 13) return "th";
  switch (day % 10) {
    case 1:
      return "st";
    case 2:
      return "nd";
    case 3:
      return "rd";
    default:
      return "th";
  }
};

export const formatRecurringDaysLabel = (
  recurringDaysOfWeek?: number[] | null
) => {
  if (!recurringDaysOfWeek || recurringDaysOfWeek.length === 0) return null;
  const normalized = [...new Set(recurringDaysOfWeek)]
    .filter((day) => day >= 0 && day <= 6)
    .sort((a, b) => a - b);
  if (normalized.length === 0) return null;
  const days = normalized.map((day) => SHORT_WEEKDAY_LABELS[day]);
  return `Occurs every ${days.join(", ")}`;
};

export const formatNextTripLine = (
  departureTime?: string | Date | null
): string | null => {
  if (!departureTime) return null;
  const date =
    departureTime instanceof Date ? departureTime : new Date(departureTime);
  if (Number.isNaN(date.getTime())) return null;

  const tz = { timeZone: TRIP_DISPLAY_TIMEZONE };
  const weekday = date.toLocaleDateString("en-US", { ...tz, weekday: "long" });
  const month = date.toLocaleDateString("en-US", { ...tz, month: "long" });
  const day = Number.parseInt(
    new Intl.DateTimeFormat("en-US", { ...tz, day: "numeric" }).format(date),
    10
  );
  const time = date.toLocaleTimeString("en-US", {
    ...tz,
    hour: "numeric",
    minute: "2-digit",
  });

  return `Next trip is ${weekday}, ${month} ${String(day)}${getOrdinalSuffix(day)} at ${time}`;
};

export const formatWeeklyCommuteLabel = (
  departureTime?: string | Date | null
) => {
  if (!departureTime) return null;
  const date =
    departureTime instanceof Date ? departureTime : new Date(departureTime);
  if (Number.isNaN(date.getTime())) return null;

  const weekday = date.toLocaleDateString("en-US", {
    weekday: "long",
    timeZone: TRIP_DISPLAY_TIMEZONE,
  });
  return {
    title: "Weekly commute",
    subtitle: `Occurs every ${weekday}`,
  };
};
