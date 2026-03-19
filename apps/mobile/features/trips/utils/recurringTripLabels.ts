export const isTripRecurring = (trip: {
  recurringScheduleId?: string | null;
}) => Boolean(trip.recurringScheduleId);

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
