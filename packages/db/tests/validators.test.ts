import { describe, expect, it } from "vitest";
import {
  saveAddressSchema,
  signInSchema,
  signUpSchema,
  updateProfileSchema,
  updateVehicleSchema,
  verifyOtpSchema,
} from "../validators";

describe("Auth Validators", () => {
  describe("signInSchema", () => {
    it("accepts a valid McMaster email", () => {
      const result = signInSchema.safeParse({
        email: "student@mcmaster.ca",
        password: "password123",
      });
      expect(result.success).toBe(true);
    });

    it("rejects a non-McMaster email", () => {
      const result = signInSchema.safeParse({
        email: "hacker@gmail.com",
        password: "password123",
      });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toContain("Only @mcmaster.ca");
      }
    });

    it("rejects invalid email formats", () => {
      const result = signInSchema.safeParse({
        email: "not-an-email",
        password: "123",
      });
      expect(result.success).toBe(false);
    });
  });

  describe("signUpSchema", () => {
    it("enforces minimum password length", () => {
      const result = signUpSchema.safeParse({
        name: "John Doe",
        email: "john@mcmaster.ca",
        password: "short", // < 8 chars
      });
      expect(result.success).toBe(false);
    });

    it("validates a correct signup payload", () => {
      const result = signUpSchema.safeParse({
        name: "John Doe",
        email: "john@mcmaster.ca",
        password: "supersecurepassword",
      });
      expect(result.success).toBe(true);
    });
  });

  describe("verifyOtpSchema", () => {
    it("accepts exactly 6 digits", () => {
      expect(verifyOtpSchema.safeParse({ otp: "123456" }).success).toBe(true);
    });

    it("rejects 5 digits", () => {
      expect(verifyOtpSchema.safeParse({ otp: "12345" }).success).toBe(false);
    });

    it("rejects non-numeric strings", () => {
      expect(verifyOtpSchema.safeParse({ otp: "abcdef" }).success).toBe(true);
    });
  });
});

describe("Profile Validators", () => {
  describe("updateProfileSchema", () => {
    it("validates bio length", () => {
      const longBio = "a".repeat(251);
      const result = updateProfileSchema.safeParse({ bio: longBio });
      expect(result.success).toBe(false);
    });

    it("validates year range", () => {
      expect(updateProfileSchema.safeParse({ year: 0 }).success).toBe(false);
      expect(updateProfileSchema.safeParse({ year: 11 }).success).toBe(false);
      expect(updateProfileSchema.safeParse({ year: 4 }).success).toBe(true);
    });
  });

  describe("updateVehicleSchema", () => {
    // Helper object to provide required fields for every test
    const baseVehicle = {
      make: "Toyota",
      model: "Camry",
      color: "Blue",
    };

    it("accepts valid plates", () => {
      expect(
        updateVehicleSchema.safeParse({
          ...baseVehicle,
          plate: "ABCD 123",
        }).success
      ).toBe(true);
    });

    it("rejects lowercase plates", () => {
      expect(
        updateVehicleSchema.safeParse({
          ...baseVehicle,
          plate: "abcd 123",
        }).success
      ).toBe(false);
    });

    it("rejects special characters", () => {
      expect(
        updateVehicleSchema.safeParse({
          ...baseVehicle,
          plate: "ABC-123",
        }).success
      ).toBe(false);
    });

    it("validates seat count", () => {
      expect(
        updateVehicleSchema.safeParse({
          ...baseVehicle,
          plate: "ABCD 123",
          seats: 12, // Invalid seat count
        }).success
      ).toBe(false);
    });
  });

  describe("saveAddressSchema", () => {
    it("validates latitude range", () => {
      expect(
        saveAddressSchema.safeParse({
          address: "Home",
          latitude: 91,
          longitude: 0,
        }).success
      ).toBe(false);
      expect(
        saveAddressSchema.safeParse({
          address: "Home",
          latitude: -91,
          longitude: 0,
        }).success
      ).toBe(false);
    });
  });
});
