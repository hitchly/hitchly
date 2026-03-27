/* eslint-disable */
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
  invalidateListMine,
  createTripMutation,
  createScheduleMutation,
  generateNextTripForScheduleMutation,
} = vi.hoisted(() => {
  const makeMutation = (): MutationMock => ({
    mutate: vi.fn(),
    mutateAsync: vi.fn(),
    isPending: false,
  });

  return {
    invalidate: vi.fn(),
    invalidateListMine: vi.fn(),
    createTripMutation: makeMutation(),
    createScheduleMutation: makeMutation(),
    generateNextTripForScheduleMutation: makeMutation(),
  };
});

vi.mock("@/lib/trpc", () => {
  return {
    trpc: {
      useUtils: () => ({
        trip: { getTrips: { invalidate } },
        recurringSchedule: { listMine: { invalidate: invalidateListMine } },
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
        generateNextTripForSchedule: {
          useMutation: () => generateNextTripForScheduleMutation,
        },
      },
    },
  };
});

describe("useCreateTrip (recurring)", () => {
  beforeEach(() => {
    invalidate.mockClear();
    invalidateListMine.mockClear();
    createTripMutation.mutate.mockClear();
    createScheduleMutation.mutateAsync.mockClear();
    generateNextTripForScheduleMutation.mutateAsync.mockClear();
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

  it("submits recurring trip via recurringSchedule.create + generateNextTripForSchedule", async () => {
    createScheduleMutation.mutateAsync.mockResolvedValueOnce({ id: "sched-1" });
    generateNextTripForScheduleMutation.mutateAsync.mockResolvedValueOnce({
      created: true,
      trip: { id: "trip-next" },
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
    expect(
      generateNextTripForScheduleMutation.mutateAsync
    ).toHaveBeenCalledWith({
      recurringScheduleId: "sched-1",
      after: expect.any(Date),
    });
    expect(createTripMutation.mutate).not.toHaveBeenCalled();
  });
});
