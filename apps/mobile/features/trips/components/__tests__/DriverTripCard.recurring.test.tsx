/* eslint-disable */
import React from "react";
import { render } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { DriverTripCard } from "../DriverTripCard";

const baseTrip: any = {
  id: "trip-1",
  origin: "Origin Address",
  destination: "Destination Address",
  departureTime: new Date("2025-04-07T08:00:00Z").toISOString(),
  maxSeats: 3,
  bookedSeats: 1,
  status: "pending",
  recurringScheduleId: "sched-1",
  recurringDaysOfWeek: [1, 5],
};

vi.mock("@/context/theme-context", () => ({
  useTheme: () => ({
    colors: {
      background: "#fff",
      surface: "#fff",
      surfaceSecondary: "#eee",
      text: "#111",
      textSecondary: "#555",
      border: "#ddd",
      primary: "#000",
    },
  }),
}));

vi.mock("react-native", () => ({
  View: ({ children }: any) => <div>{children}</div>,
  StyleSheet: { create: (x: any) => x },
}));

vi.mock("@/components/ui/Card", () => ({
  Card: ({ children }: any) => <div>{children}</div>,
}));

vi.mock("@/components/ui/Chip", () => ({
  Chip: ({ label }: { label: string }) => <span>{label}</span>,
}));

vi.mock("@/components/ui/Text", () => ({
  Text: ({ children }: any) => <span>{children}</span>,
}));

describe("DriverTripCard recurring label", () => {
  it("renders recurring metadata for non-completed recurring cards (test-driver-tripcard-recurring-1)", () => {
    const { getByText } = render(
      <DriverTripCard trip={baseTrip} onPress={() => {}} />
    );

    expect(getByText("RECURRING")).toBeTruthy();
    expect(getByText(/🔁 Occurs every Mon, Fri/i)).toBeTruthy();
    expect(getByText(/Next trip is/i)).toBeTruthy();
  });

  it("hides recurring metadata on completed recurring cards", () => {
    const completedTrip = { ...baseTrip, status: "completed" };
    const { getByText, queryByText } = render(
      <DriverTripCard trip={completedTrip} onPress={() => {}} />
    );

    expect(getByText("RECURRING")).toBeTruthy();
    expect(getByText("COMPLETED")).toBeTruthy();
    expect(queryByText(/🔁 Occurs every/i)).toBeNull();
    expect(queryByText(/Next trip is/i)).toBeNull();
  });
});
