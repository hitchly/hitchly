/**
 * Test fixtures for trip module tests
 */
export declare const createMockUser: (overrides?: Partial<any>) => {
  id: string;
  name: string;
  email: string;
  emailVerified: boolean;
  image: null;
  pushToken: string;
  createdAt: Date;
  updatedAt: Date;
};
export declare const createMockTrip: (overrides?: Partial<any>) => {
  id: string;
  driverId: string;
  origin: string;
  destination: string;
  originLat: number;
  originLng: number;
  destLat: number;
  destLng: number;
  departureTime: Date;
  maxSeats: number;
  bookedSeats: number;
  status: "pending";
  createdAt: Date;
  updatedAt: Date;
};
export declare const createMockTripRequest: (overrides?: Partial<any>) => {
  id: string;
  tripId: string;
  riderId: string;
  pickupLat: number;
  pickupLng: number;
  dropoffLat: null;
  dropoffLng: null;
  status: "pending";
  riderPickupConfirmedAt: null;
  createdAt: Date;
  updatedAt: Date;
};
export declare const createMockProfile: (overrides?: Partial<any>) => {
  id: string;
  userId: string;
  bio: string;
  faculty: string;
  year: number;
  universityRole: "student";
  appRole: "driver";
  defaultAddress: null;
  defaultLat: null;
  defaultLong: null;
  updatedAt: Date;
};
export declare const createMockVehicle: (overrides?: Partial<any>) => {
  id: string;
  userId: string;
  make: string;
  model: string;
  color: string;
  year: number;
  licensePlate: string;
  updatedAt: Date;
};
export declare const createMockPreferences: (overrides?: Partial<any>) => {
  id: string;
  userId: string;
  music: boolean;
  chatty: boolean;
  smoking: boolean;
  pets: boolean;
  updatedAt: Date;
};
//# sourceMappingURL=fixtures.d.ts.map
