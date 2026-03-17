import { renderHook, act } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { useCreateTrip } from "../useCreateTrip";

type MutationMock = {
  mutate: ReturnType<typeof vi.fn>;
  mutateAsync: ReturnType<typeof vi.fn>;
  isPending: boolean;
};

const {
  invalidate,
  createTripMutation,
  createScheduleMutation,
  generateUpcomingTripsMutation,
} = vi.hoisted(() => {
  const makeMutation = (): MutationMock => ({
    mutate: vi.fn(),
    mutateAsync: vi.fn(),
    isPending: false,
  });

  return {
    invalidate: vi.fn(),
    createTripMutation: makeMutation(),
    createScheduleMutation: makeMutation(),
    generateUpcomingTripsMutation: makeMutation(),
  };
});

vi.mock("@/lib/trpc", () => {
  return {
    trpc: {
      useUtils: () => ({
        trip: { getTrips: { invalidate } },
      }),
      profile: {
        getMe: {
          useQuery: () => ({
            data: { profile: { defaultAddress: "Home" } },
          }),
        },
      },
      trip: {
        createTrip: {
          useMutation: () => createTripMutation,
        },
      },
      recurringSchedule: {
        create: {
          useMutation: () => createScheduleMutation,
        },
        generateUpcomingTripsForUser: {
          useMutation: () => generateUpcomingTripsMutation,
        },
      },
    },
  };
});

describe("useCreateTrip (recurring)", () => {
  beforeEach(() => {
    invalidate.mockClear();
    createTripMutation.mutate.mockClear();
    createScheduleMutation.mutateAsync.mockClear();
    generateUpcomingTripsMutation.mutateAsync.mockClear();
  });

  it("submits non-recurring trip via trip.createTrip", async () => {
    const { result } = renderHook(() => useCreateTrip());

    await act(async () => {
      result.current.methods.setValue("origin", "A");
      result.current.methods.setValue("destination", "B");
      result.current.methods.setValue("maxSeats", 2);
      result.current.methods.setValue(
        "departureTime",
        new Date(Date.now() + 60 * 60 * 1000)
      );
    });

    await act(async () => {
      await result.current.onSubmit();
    });

    expect(createTripMutation.mutate).toHaveBeenCalledWith(
      expect.objectContaining({
        origin: "A",
        destination: "B",
        maxSeats: 2,
      })
    );
    expect(createScheduleMutation.mutateAsync).not.toHaveBeenCalled();
  });

  it("submits recurring trip via recurringSchedule.create + generateUpcomingTripsForUser", async () => {
    createScheduleMutation.mutateAsync.mockResolvedValueOnce({ id: "sched-1" });
    generateUpcomingTripsMutation.mutateAsync.mockResolvedValueOnce({
      createdCount: 3,
      trips: [],
    });

    const { result } = renderHook(() => useCreateTrip());

    await act(async () => {
      result.current.methods.setValue("origin", "A");
      result.current.methods.setValue("destination", "B");
      result.current.methods.setValue("maxSeats", 3);
      result.current.methods.setValue(
        "departureTime",
        new Date(Date.now() + 60 * 60 * 1000)
      );
      result.current.methods.setValue("isRecurring", true);
      result.current.methods.setValue("daysOfWeek", [1, 3, 5]);
    });

    await act(async () => {
      await result.current.onSubmit();
    });

    expect(createScheduleMutation.mutateAsync).toHaveBeenCalledWith(
      expect.objectContaining({
        origin: "A",
        destination: "B",
        maxSeats: 3,
        daysOfWeek: [1, 3, 5],
      })
    );
    expect(generateUpcomingTripsMutation.mutateAsync).toHaveBeenCalledWith({
      daysAhead: 28,
    });
    expect(createTripMutation.mutate).not.toHaveBeenCalled();
  });
});
