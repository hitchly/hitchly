export type Location = {
  lat: number;
  lng: number;
};
export type RiderRequest = {
  riderId: string;
  origin: Location;
  destination: Location;
  desiredArrivalTime: string;
  desiredDate?: Date;
  maxOccupancy: number;
  preference?: "default" | "costPriority" | "comfortPriority";
  includeDummyMatches?: boolean;
};
export type { DriverRouteInfo, NewRiderInfo } from "./googlemaps";
export type RideMatch = {
  rideId: string;
  driverId: string;
  name: string;
  profilePic: string;
  vehicle: string;
  rating: number;
  bio: string;
  matchPercentage: number;
  uiLabel: string;
  details: {
    estimatedCost: number;
    estimatedDistanceKm: number;
    estimatedDurationSec: number;
    detourMinutes: number;
    arrivalAtPickup: string;
    availableSeats: number;
  };
  debugScores?: any;
};
export declare const MAX_CANDIDATES = 20;
export declare const MATCH_THRESHOLD = 0.3;
export declare function findMatchesForUser(
  request: RiderRequest
): Promise<RideMatch[]>;
//# sourceMappingURL=matchmaking_service.d.ts.map
