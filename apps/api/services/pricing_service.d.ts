export declare const PLATFORM_BASE_FARE = 2.5;
export declare const PLATFORM_RATE_PER_KM = 0.2;
export declare const PLATFORM_RATE_PER_MINUTE = 0.1;
export declare const COST_DISCOUNT_TIERS: Record<number, number>;
export type CostEstimate = {
  baseCost: number;
  detourSurcharge: number;
  passengerDiscount: number;
  finalCost: number;
};
export type CostBreakdown = {
  distanceCharge: number;
  timeCharge: number;
  baseFare: number;
  subtotal: number;
  detourSurchargePercent: number;
  discountPercent: number;
  finalCost: number;
};
export declare function calculateEstimatedCost(
  distKm: number,
  durSeconds: number,
  currentPassengers: number,
  detourSeconds?: number
): number;
export declare function calculateCostBreakdown(
  distKm: number,
  durSeconds: number,
  currentPassengers: number,
  detourSeconds?: number
): CostBreakdown;
export declare function calculateCostScore(
  cost: number,
  minCostOfBatch: number
): number;
export declare function getPassengerDiscount(passengers: number): number;
//# sourceMappingURL=pricing_service.d.ts.map
