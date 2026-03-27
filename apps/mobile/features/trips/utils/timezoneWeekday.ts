const TORONTO_TIMEZONE = "America/Toronto";

const WEEKDAY_TO_DOW: Record<string, number> = {
  Sun: 0,
  Mon: 1,
  Tue: 2,
  Wed: 3,
  Thu: 4,
  Fri: 5,
  Sat: 6,
};

export const getWeekdayInToronto = (date: Date): number | null => {
  if (Number.isNaN(date.getTime())) return null;

  const weekday = new Intl.DateTimeFormat("en-US", {
    weekday: "short",
    timeZone: TORONTO_TIMEZONE,
  }).format(date);

  return WEEKDAY_TO_DOW[weekday] ?? null;
};
