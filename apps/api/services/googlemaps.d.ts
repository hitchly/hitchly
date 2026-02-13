export type Location = {
  lat: number;
  lng: number;
};
export type DriverRouteInfo = {
  origin: Location;
  destination: Location;
  existingWaypoints: Location[];
  departureTime?: Date;
};
export type NewRiderInfo = {
  origin: Location;
  destination: Location;
};
export declare function getRouteDetails(
  origin: Location,
  destination: Location,
  waypoints?: Location[],
  departureTime?: Date,
  optimize?: boolean
): Promise<{
  totalDurationSeconds: number;
  totalDistanceMeters: number;
  waypointOrder: number[];
}>;
export declare function geocodeAddress(
  address: string
): Promise<Location | null>;
export declare function getDetourAndRideDetails(
  driverTrip: DriverRouteInfo,
  rider: NewRiderInfo
): Promise<{
  detourTimeInSeconds: number;
  rideDistanceKm: number;
  rideDurationSeconds: number;
}>;
export type TripDistanceResult = {
  distanceKm: number;
  durationSeconds: number;
} | null;
export declare function calculateTripDistance(
  origin: Location,
  destination: Location,
  waypoints?: Location[]
): Promise<TripDistanceResult>;
//# sourceMappingURL=googlemaps.d.ts.map
