import { vi } from "vitest";

// Metro / RN global — expo-modules-core reads this during import in Node
(globalThis as unknown as { __DEV__: boolean }).__DEV__ = true;

// Avoid loading native Expo modules (pulls expo-modules-core → TurboModuleRegistry / __DEV__ issues)
vi.mock("expo-location", () => ({
  requestForegroundPermissionsAsync: vi
    .fn()
    .mockResolvedValue({ status: "granted" }),
  getForegroundPermissionsAsync: vi
    .fn()
    .mockResolvedValue({ status: "granted" }),
  geocodeAsync: vi.fn().mockResolvedValue([]),
  reverseGeocodeAsync: vi.fn().mockResolvedValue([]),
}));

// The hooks under test only need Alert; TurboModuleRegistry satisfies Expo optional native requires.
vi.mock("react-native", () => ({
  Alert: { alert: vi.fn() },
  TurboModuleRegistry: {
    getEnforcing: vi.fn(() => ({})),
    get: vi.fn(() => null),
  },
}));

// Avoid navigation side effects
vi.mock("expo-router", () => ({
  useRouter: () => ({
    back: vi.fn(),
    push: vi.fn(),
    replace: vi.fn(),
  }),
}));
