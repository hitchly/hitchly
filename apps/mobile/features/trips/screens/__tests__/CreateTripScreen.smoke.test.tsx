import React from "react";
import { render } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { CreateTripScreen } from "../CreateTripScreen";

// Keep this a smoke test: we only verify the recurring UI section renders.
vi.mock("@/features/trips/hooks/useCreateTrip", () => ({
  useCreateTrip: () => ({
    methods: {
      control: {} as any,
    },
    isToCampus: true,
    setIsToCampus: vi.fn(),
    defaultAddress: "Home",
    isPending: false,
    onSubmit: vi.fn(),
  }),
}));

vi.mock("@/context/theme-context", () => ({
  useTheme: () => ({
    colors: {
      background: "#fff",
      surfaceSecondary: "#eee",
      textSecondary: "#333",
      textTertiary: "#666",
      primary: "#000",
      border: "#ddd",
      surface: "#fff",
    },
  }),
}));

vi.mock("react-native-safe-area-context", () => ({
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));

// Render as simple DOM nodes for smoke testing.
vi.mock("react-native", () => ({
  ScrollView: ({ children }: any) => <div>{children}</div>,
  StyleSheet: { create: (x: any) => x, hairlineWidth: 1 },
  View: ({ children }: any) => <div>{children}</div>,
}));

// Stub UI components used by the screen
vi.mock("@/components/ui/ModalSheet", () => ({
  ModalSheet: ({ children }: any) => <div>{children}</div>,
}));
vi.mock("@/components/ui/Text", () => ({
  Text: ({ children }: any) => <span>{children}</span>,
}));
vi.mock("@/components/ui/FormSection", () => ({
  FormSection: ({ title, children }: any) => (
    <section>
      <h2>{title}</h2>
      {children}
    </section>
  ),
}));
vi.mock("@/components/ui/SegmentedControl", () => ({
  SegmentedControl: ({ options }: any) => (
    <div>{options?.map((o: any) => o.label).join(",")}</div>
  ),
}));
vi.mock("@/components/ui/IconBox", () => ({
  IconBox: () => <div />,
}));

vi.mock("@/components/form/ControlledLocationInput", () => ({
  ControlledLocationInput: () => <div />,
}));
vi.mock("@/components/form/ControlledDateTimePicker", () => ({
  ControlledDateTimePicker: () => <div />,
}));
vi.mock("@/components/form/ControlledNumericStepper", () => ({
  ControlledNumericStepper: () => <div />,
}));
vi.mock("@/components/form/SubmitButton", () => ({
  SubmitButton: () => <button type="button">PUBLISH RIDE</button>,
}));

vi.mock("react-hook-form", async () => {
  const actual = await vi.importActual<any>("react-hook-form");
  return {
    ...actual,
    FormProvider: ({ children }: any) => <div>{children}</div>,
    Controller: ({ name, render }: any) => {
      const value =
        name === "daysOfWeek" ? [] : name === "isRecurring" ? false : undefined;
      return render({ field: { value, onChange: vi.fn() } });
    },
  };
});

describe("CreateTripScreen", () => {
  it("renders the REPEAT section (recurring UI) (test-mobile-create-trip-1)", () => {
    const { getByText } = render(<CreateTripScreen />);
    expect(getByText("REPEAT")).toBeTruthy();
    expect(getByText("ONE-TIME,RECURRING")).toBeTruthy();
  });
});
