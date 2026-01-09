import { describe, expect, it } from "vitest";
import { formatLocationData } from "./index";

describe("formatLocationData", () => {
  it("formats a standard address correctly", () => {
    const input = {
      street: "Main St W",
      streetNumber: "1280",
      city: "Hamilton",
      region: "ON",
      isoCountryCode: "CA",
    };

    const result = formatLocationData(input);

    expect(result).toEqual({
      title: "1280 Main St W",
      subtitle: "Hamilton, ON, CA",
      full: "1280 Main St W, Hamilton, ON, CA",
    });
  });

  it("handles Points of Interest (POI)", () => {
    const input = {
      name: "McMaster University",
      street: "Main St W",
      streetNumber: "1280",
      city: "Hamilton",
    };

    const result = formatLocationData(input);

    expect(result?.title).toBe("McMaster University");
    expect(result?.subtitle).toBe("1280 Main St W, Hamilton");
  });

  it("returns null for empty inputs", () => {
    const result = formatLocationData({});
    expect(result).toBeNull();
  });
});
