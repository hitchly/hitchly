/* eslint-disable */
import React from "react";
import { fireEvent, render } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { RiderTripCard } from "../RiderTripCard";

const onRequestNext = vi.fn();

const baseTrip: any = {
  id: "trip-1",
  origin: "Origin Address",
  destination: "Destination Address",
  departureTime: new Date("2025-04-07T08:00:00Z").toISOString(),
  maxSeats: 3,
  bookedSeats: 1,
  status: "completed",
  recurringScheduleId: "sched-1",
  driver: { name: "Driver" },
  requests: [
    {
      id: "req-1",
      riderId: "rider-1",
      status: "completed",
      pickupLat: 43.1,
      pickupLng: -79.9,
      pickupAddress: "Pickup",
    },
  ],
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

vi.mock("@/components/ui/Button", () => ({
  Button: ({ title, onPress }: any) => (
    <button type="button" onClick={onPress}>
      {title}
    </button>
  ),
}));

describe("RiderTripCard recurring request CTA", () => {
  it("shows REQUEST NEXT button for completed recurring rider trip", () => {
    const { getByText } = render(
      <RiderTripCard
        trip={baseTrip}
        currentUserId="rider-1"
        onRequestNext={onRequestNext}
        onPress={() => {}}
      />
    );

    expect(getByText(/REQUEST NEXT MONDAY/i)).toBeTruthy();
  });

  it("invokes onRequestNext with trip and pickup coords", () => {
    onRequestNext.mockClear();
    const { getByText } = render(
      <RiderTripCard
        trip={baseTrip}
        currentUserId="rider-1"
        onRequestNext={onRequestNext}
        onPress={() => {}}
      />
    );

    fireEvent.click(getByText(/REQUEST NEXT MONDAY/i));
    expect(onRequestNext).toHaveBeenCalledWith({
      trip: baseTrip,
      pickupLat: 43.1,
      pickupLng: -79.9,
    });
  });
});
