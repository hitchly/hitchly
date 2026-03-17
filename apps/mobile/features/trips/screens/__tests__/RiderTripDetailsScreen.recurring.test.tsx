import React from "react";
import { render, fireEvent, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { RiderTripDetailsScreen } from "../RiderTripDetailsScreen";

vi.mock("@expo/vector-icons", () => ({
  Ionicons: () => null,
}));

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

vi.mock("react-native-safe-area-context", () => ({
  SafeAreaView: ({ children }: any) => <div>{children}</div>,
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));

vi.mock("react-native", () => ({
  Alert: { alert: vi.fn() },
  ScrollView: ({ children }: any) => <div>{children}</div>,
  StyleSheet: { create: (x: any) => x },
  View: ({ children }: any) => <div>{children}</div>,
}));

vi.mock("@/components/ui/Card", () => ({
  Card: ({ children }: any) => <div>{children}</div>,
}));

vi.mock("@/components/ui/FormSection", () => ({
  FormSection: ({ title, children }: any) => (
    <section>
      <h2>{title}</h2>
      {children}
    </section>
  ),
}));

vi.mock("@/components/ui/Badge", () => ({
  Badge: ({ label }: { label: string }) => <span>{label}</span>,
}));

vi.mock("@/components/ui/Button", () => ({
  Button: ({ title, onPress }: any) => (
    <button type="button" onClick={onPress}>
      {title}
    </button>
  ),
}));

vi.mock("@/components/ui/IconBox", () => ({
  IconBox: () => <div />,
}));

vi.mock("@/components/ui/Text", () => ({
  Text: ({ children }: any) => <span>{children}</span>,
}));

vi.mock("expo-router", () => ({
  useRouter: () => ({
    push: vi.fn(),
    back: vi.fn(),
  }),
}));

const nextTripMutateAsync = vi.fn().mockResolvedValue({
  id: "trip-next",
  departureTime: new Date().toISOString(),
  origin: "Origin",
  destination: "Destination",
});

const createRequestMutateAsync = vi.fn().mockResolvedValue({});
const invalidate = vi.fn();

vi.mock("@/lib/trpc", () => ({
  trpc: {
    useUtils: () => ({
      recurringSchedule: {
        getNextTripOccurrence: {
          fetch: nextTripMutateAsync,
        },
      },
      trip: {
        getTripById: { invalidate },
        getTripRequests: { invalidate },
        getTrips: { invalidate },
      },
    }),
    recurringSchedule: {
      getNextTripOccurrence: {
        useQuery: () => ({
          isFetching: false,
          refetch: vi.fn(),
        }),
      },
    },
    trip: {
      createTripRequest: {
        useMutation: () => ({
          isPending: false,
          mutateAsync: createRequestMutateAsync,
        }),
      },
    },
  },
}));

vi.mock("@/features/trips/hooks/useRiderTripDetails", () => ({
  useRiderTripDetails: () => ({
    trip: {
      id: "trip-1",
      origin: "Origin",
      destination: "Destination",
      departureTime: new Date("2025-04-07T08:00:00Z").toISOString(),
      status: "completed",
      recurringScheduleId: "sched-1",
    },
    isLoading: false,
    userRequest: {
      id: "req-1",
      status: "completed",
      pickupLat: 43.1,
      pickupLng: -79.9,
    },
    riderEtaDetails: null,
    cancelTripRequest: { isPending: false },
    handleCancelRequest: vi.fn(),
  }),
}));

describe("RiderTripDetailsScreen recurring UI", () => {
  it("renders recurring section and ride-again button (test-mobile-rider-recurring-1)", () => {
    const { getByText } = render(<RiderTripDetailsScreen />);

    expect(getByText("RECURRING TRIP")).toBeTruthy();
    expect(getByText(/Weekly commute/)).toBeTruthy();
    expect(getByText(/You are requesting one occurrence/i)).toBeTruthy();
    expect(getByText(/LEAVE REVIEW/)).toBeTruthy();
    expect(getByText(/REQUEST NEXT/)).toBeTruthy();
  });

  it("calls API flow when tapping 'REQUEST NEXT' (test-mobile-rider-recurring-2)", async () => {
    const { getByText } = render(<RiderTripDetailsScreen />);

    fireEvent.click(getByText(/REQUEST NEXT/));

    await waitFor(() => {
      expect(nextTripMutateAsync).toHaveBeenCalled();
      expect(createRequestMutateAsync).toHaveBeenCalledWith({
        tripId: "trip-next",
        pickupLat: 43.1,
        pickupLng: -79.9,
      });
    });
  });
});
