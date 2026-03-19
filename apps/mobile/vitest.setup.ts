import { vi } from "vitest";

// The hooks under test only need Alert; keep this minimal.
vi.mock("react-native", () => ({
  Alert: { alert: vi.fn() },
}));

// Avoid navigation side effects
vi.mock("expo-router", () => ({
  useRouter: () => ({
    back: vi.fn(),
    push: vi.fn(),
    replace: vi.fn(),
  }),
}));
