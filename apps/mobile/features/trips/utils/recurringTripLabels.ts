export const isTripRecurring = (trip: {
  recurringScheduleId?: string | null;
}) => Boolean(trip.recurringScheduleId);

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

  const weekday = date.toLocaleDateString("en-US", { weekday: "long" });
  const month = date.toLocaleDateString("en-US", { month: "long" });
  const day = date.getDate();
  const time = date.toLocaleTimeString("en-US", {
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

  const weekday = date.toLocaleDateString("en-US", { weekday: "long" });
  return {
    title: "Weekly commute",
    subtitle: `Occurs every ${weekday}`,
  };
};
