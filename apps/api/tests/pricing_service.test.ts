import { describe, expect, it } from "vitest";
import {
  calculateCostBreakdown,
  calculateCostScore,
  calculateEstimatedCost,
  getPassengerDiscount,
  PLATFORM_BASE_FARE,
  PLATFORM_RATE_PER_KM,
  PLATFORM_RATE_PER_MINUTE,
} from "../services/pricing_service";

describe("Pricing Service", () => {
  describe("calculateEstimatedCost", () => {
    it("should calculate base fare correctly", () => {
      const cost = calculateEstimatedCost(0, 0, 0, 0);
      expect(cost).toBe(PLATFORM_BASE_FARE);
    });

    it("should calculate distance charge correctly", () => {
      const distanceKm = 10;
      const cost = calculateEstimatedCost(distanceKm, 0, 0, 0);
      const expected = PLATFORM_BASE_FARE + distanceKm * PLATFORM_RATE_PER_KM;
      expect(cost).toBeCloseTo(expected, 2);
    });

    it("should calculate time charge correctly", () => {
      const durationSeconds = 600; // 10 minutes
      const cost = calculateEstimatedCost(0, durationSeconds, 0, 0);
      const expected =
        PLATFORM_BASE_FARE + (durationSeconds / 60) * PLATFORM_RATE_PER_MINUTE;
      expect(cost).toBeCloseTo(expected, 2);
    });

    it("should apply detour surcharge correctly (5% per 5 minutes, capped at 25%)", () => {
      const baseCost = PLATFORM_BASE_FARE + 10 * PLATFORM_RATE_PER_KM; // ~$4.50

      // 5 minutes detour = 5% surcharge
      const cost5min = calculateEstimatedCost(10, 0, 0, 300);
      expect(cost5min).toBeGreaterThan(baseCost);

      // 10 minutes detour = 10% surcharge
      const cost10min = calculateEstimatedCost(10, 0, 0, 600);
      expect(cost10min).toBeGreaterThan(cost5min);

      // 25+ minutes detour = 25% cap
      const cost25min = calculateEstimatedCost(10, 0, 0, 1500);
      const cost30min = calculateEstimatedCost(10, 0, 0, 1800);
      // Both should have same surcharge percentage (capped)
      const ratio25 = cost25min / baseCost;
      const ratio30 = cost30min / baseCost;
      expect(ratio25).toBeCloseTo(ratio30, 2);
    });

    it("should apply passenger discount tiers correctly", () => {
      // 0 passengers = 0% discount
      const cost0 = calculateEstimatedCost(10, 600, 0, 0);

      // 1 passenger = 15% discount
      const cost1 = calculateEstimatedCost(10, 600, 1, 0);
      expect(cost1).toBeLessThan(cost0);

      // 2 passengers = 25% discount
      const cost2 = calculateEstimatedCost(10, 600, 2, 0);
      expect(cost2).toBeLessThan(cost1);

      // 3+ passengers = 35% discount
      const cost3 = calculateEstimatedCost(10, 600, 3, 0);
      const cost4 = calculateEstimatedCost(10, 600, 4, 0);
      expect(cost3).toBeLessThan(cost2);
      // 3 and 4 should have same discount (capped at 3)
      expect(cost4).toBeCloseTo(cost3, 2);
    });

    it("should combine all factors correctly", () => {
      const distanceKm = 15;
      const durationSeconds = 900; // 15 minutes
      const passengers = 2;
      const detourSeconds = 600; // 10 minutes

      const cost = calculateEstimatedCost(
        distanceKm,
        durationSeconds,
        passengers,
        detourSeconds
      );

      // Should be positive and reasonable
      expect(cost).toBeGreaterThan(0);
      expect(cost).toBeLessThan(100); // Sanity check
    });
  });

  describe("calculateCostBreakdown", () => {
    it("should return all breakdown components", () => {
      const distanceKm = 10;
      const durationSeconds = 600;
      const passengers = 1;
      const detourSeconds = 300;

      const breakdown = calculateCostBreakdown(
        distanceKm,
        durationSeconds,
        passengers,
        detourSeconds
      );

      expect(breakdown).toHaveProperty("distanceCharge");
      expect(breakdown).toHaveProperty("timeCharge");
      expect(breakdown).toHaveProperty("baseFare");
      expect(breakdown).toHaveProperty("subtotal");
      expect(breakdown).toHaveProperty("detourSurchargePercent");
      expect(breakdown).toHaveProperty("discountPercent");
      expect(breakdown).toHaveProperty("finalCost");

      expect(breakdown.baseFare).toBe(PLATFORM_BASE_FARE);
      expect(breakdown.distanceCharge).toBeCloseTo(
        distanceKm * PLATFORM_RATE_PER_KM,
        2
      );
      expect(breakdown.timeCharge).toBeCloseTo(
        (durationSeconds / 60) * PLATFORM_RATE_PER_MINUTE,
        2
      );
      expect(breakdown.subtotal).toBeCloseTo(
        breakdown.baseFare + breakdown.distanceCharge + breakdown.timeCharge,
        2
      );
    });
  });

  describe("calculateCostScore", () => {
    it("should return 1.0 for minimum cost", () => {
      const minCost = 5.0;
      const score = calculateCostScore(minCost, minCost);
      expect(score).toBe(1.0);
    });

    it("should return exponential decay for higher costs", () => {
      const minCost = 5.0;
      const cost1 = 6.0;
      const cost2 = 7.0;

      const score1 = calculateCostScore(cost1, minCost);
      const score2 = calculateCostScore(cost2, minCost);

      expect(score1).toBeLessThan(1.0);
      expect(score2).toBeLessThan(score1);
      expect(score1).toBeGreaterThan(0);
      expect(score2).toBeGreaterThan(0);
    });

    it("should handle negative differences (cost below minimum)", () => {
      const minCost = 10.0;
      const cost = 8.0;
      const score = calculateCostScore(cost, minCost);
      expect(score).toBe(1.0);
    });
  });

  describe("getPassengerDiscount", () => {
    it("should return correct discount for 0 passengers", () => {
      expect(getPassengerDiscount(0)).toBe(0);
    });

    it("should return correct discount for 1 passenger", () => {
      expect(getPassengerDiscount(1)).toBe(15);
    });

    it("should return correct discount for 2 passengers", () => {
      expect(getPassengerDiscount(2)).toBe(25);
    });

    it("should return correct discount for 3+ passengers", () => {
      expect(getPassengerDiscount(3)).toBe(35);
      expect(getPassengerDiscount(4)).toBe(35);
      expect(getPassengerDiscount(10)).toBe(35);
    });
  });
});
