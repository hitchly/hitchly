// --- PRICING CONSTANTS ---
export const PLATFORM_BASE_FARE = 2.5;
export const PLATFORM_RATE_PER_KM = 0.2;
export const PLATFORM_RATE_PER_MINUTE = 0.1;

// Discount tiers based on number of passengers already in ride
export const COST_DISCOUNT_TIERS: Record<number, number> = {
  0: 0.0,
  1: 0.15,
  2: 0.25,
  3: 0.35,
};

// --- TYPES ---
export interface CostEstimate {
  baseCost: number;
  detourSurcharge: number;
  passengerDiscount: number;
  finalCost: number;
}

export interface CostBreakdown {
  distanceCharge: number;
  timeCharge: number;
  baseFare: number;
  subtotal: number;
  detourSurchargePercent: number;
  discountPercent: number;
  finalCost: number;
}

export function calculateEstimatedCost(
  distKm: number,
  durSeconds: number,
  currentPassengers: number,
  detourSeconds = 0
): number {
  const durMins = durSeconds / 60;
  const rawCost =
    PLATFORM_BASE_FARE +
    distKm * PLATFORM_RATE_PER_KM +
    durMins * PLATFORM_RATE_PER_MINUTE;

  // Apply detour surcharge: +5% for every 5 minutes of detour, capped at 25%
  const detourMins = detourSeconds / 60;
  const detourSurchargeRate = Math.min(0.25, (detourMins / 5) * 0.05);

  // Apply passenger discount
  const discount = COST_DISCOUNT_TIERS[Math.min(currentPassengers, 3)] ?? 0;

  // Final cost = base cost + detour surcharge - passenger discount
  const finalCost = rawCost * (1 + detourSurchargeRate) * (1 - discount);

  return Number(finalCost.toFixed(2));
}

export function calculateCostBreakdown(
  distKm: number,
  durSeconds: number,
  currentPassengers: number,
  detourSeconds = 0
): CostBreakdown {
  const durMins = durSeconds / 60;
  const distanceCharge = distKm * PLATFORM_RATE_PER_KM;
  const timeCharge = durMins * PLATFORM_RATE_PER_MINUTE;
  const subtotal = PLATFORM_BASE_FARE + distanceCharge + timeCharge;

  const detourMins = detourSeconds / 60;
  const detourSurchargePercent = Math.min(25, (detourMins / 5) * 5);
  const discountPercent =
    (COST_DISCOUNT_TIERS[Math.min(currentPassengers, 3)] ?? 0) * 100;

  const finalCost = calculateEstimatedCost(
    distKm,
    durSeconds,
    currentPassengers,
    detourSeconds
  );

  return {
    distanceCharge: Number(distanceCharge.toFixed(2)),
    timeCharge: Number(timeCharge.toFixed(2)),
    baseFare: PLATFORM_BASE_FARE,
    subtotal: Number(subtotal.toFixed(2)),
    detourSurchargePercent,
    discountPercent,
    finalCost,
  };
}

export function calculateCostScore(
  cost: number,
  minCostOfBatch: number
): number {
  const diff = cost - minCostOfBatch;
  if (diff <= 0) return 1.0;
  return Math.exp(-0.1 * diff);
}

export function getPassengerDiscount(passengers: number): number {
  return (COST_DISCOUNT_TIERS[Math.min(passengers, 3)] ?? 0) * 100;
}
