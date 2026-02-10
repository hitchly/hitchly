import { relations } from "drizzle-orm";
import {
  boolean,
  doublePrecision,
  integer,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uuid,
  serial,
} from "drizzle-orm/pg-core";

// --- ENUMS ---
export const universityRoleEnum = pgEnum("university_role", [
  "student",
  "professor",
  "staff",
  "alumni",
  "other",
]);

export const appRoleEnum = pgEnum("app_role", ["rider", "driver"]);

// --- EXISTING AUTH TABLES (Unchanged) ---
export const users = pgTable("users", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  emailVerified: boolean("email_verified").default(false).notNull(),
  image: text("image"),
  pushToken: text("push_token"), // Expo push notification token
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at")
    .defaultNow()
    .$onUpdate(() => new Date())
    .notNull(),
  role: text("role").default("user"),
  banned: boolean("banned").default(false),
  banReason: text("ban_reason"),
  banExpires: timestamp("ban_expires"),
});

export const sessions = pgTable("sessions", {
  id: text("id").primaryKey(),
  expiresAt: timestamp("expires_at").notNull(),
  token: text("token").notNull().unique(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at")
    .$onUpdate(() => new Date())
    .notNull(),
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  userId: text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
});

export const accounts = pgTable("accounts", {
  id: text("id").primaryKey(),
  accountId: text("account_id").notNull(),
  providerId: text("provider_id").notNull(),
  userId: text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  accessToken: text("access_token"),
  refreshToken: text("refresh_token"),
  idToken: text("id_token"),
  accessTokenExpiresAt: timestamp("access_token_expires_at"),
  refreshTokenExpiresAt: timestamp("refresh_token_expires_at"),
  scope: text("scope"),
  password: text("password"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at")
    .$onUpdate(() => new Date())
    .notNull(),
});

export const verifications = pgTable("verifications", {
  id: text("id").primaryKey(),
  identifier: text("identifier").notNull(),
  value: text("value").notNull(),
  expiresAt: timestamp("expires_at").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at")
    .defaultNow()
    .$onUpdate(() => new Date())
    .notNull(),
});

// --- NEW PROFILE MODULE TABLES ---

export const profiles = pgTable("profiles", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  userId: text("user_id")
    .notNull()
    .unique() // 1:1 Relationship
    .references(() => users.id, { onDelete: "cascade" }),

  // Personal Context
  bio: text("bio"),
  faculty: text("faculty"), // e.g. "Engineering", "Health Sciences"
  year: integer("year"), // e.g. 1, 2, 3, 4

  // Roles
  universityRole: universityRoleEnum("university_role")
    .default("student")
    .notNull(),
  appRole: appRoleEnum("app_role").default("rider").notNull(),

  updatedAt: timestamp("updated_at")
    .defaultNow()
    .$onUpdate(() => new Date()),

  // Default Location
  defaultAddress: text("default_address"),
  defaultLat: doublePrecision("default_lat"),
  defaultLong: doublePrecision("default_long"),
});

export const preferences = pgTable("preferences", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  userId: text("user_id")
    .notNull()
    .unique()
    .references(() => users.id, { onDelete: "cascade" }),

  // Ride Preferences
  music: boolean("music").default(true).notNull(),
  chatty: boolean("chatty").default(true).notNull(),
  smoking: boolean("smoking").default(false).notNull(),
  pets: boolean("pets").default(false).notNull(),

  updatedAt: timestamp("updated_at")
    .defaultNow()
    .$onUpdate(() => new Date()),
});

export const vehicles = pgTable("vehicles", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  userId: text("user_id")
    .notNull()
    .unique()
    .references(() => users.id, { onDelete: "cascade" }),

  // Vehicle Details
  make: text("make").notNull(),
  model: text("model").notNull(),
  color: text("color").notNull(),
  plate: text("plate").notNull(),
  seats: integer("seats").default(4).notNull(),

  updatedAt: timestamp("updated_at")
    .defaultNow()
    .$onUpdate(() => new Date()),
});

export const userLocations = pgTable("user_locations", {
  id: uuid("id").primaryKey().defaultRandom(),
  // Unique is critical here for "Current Location" logic
  userId: text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" })
    .unique(),
  latitude: doublePrecision("latitude").notNull(),
  longitude: doublePrecision("longitude").notNull(),
  heading: doublePrecision("heading"),
  speed: doublePrecision("speed"),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// --- RELATIONS ---

export const usersRelations = relations(users, ({ one }) => ({
  profile: one(profiles, {
    fields: [users.id],
    references: [profiles.userId],
  }),
  preferences: one(preferences, {
    fields: [users.id],
    references: [preferences.userId],
  }),
  vehicle: one(vehicles, {
    fields: [users.id],
    references: [vehicles.userId],
  }),
}));

// Trip status enum - unified from both rides and trips
export const tripStatusEnum = pgEnum("trip_status", [
  "pending",
  "scheduled",
  "active",
  "in_progress",
  "completed",
  "cancelled",
]);

// Trip request status enum
export const tripRequestStatusEnum = pgEnum("trip_request_status", [
  "pending",
  "accepted",
  "on_trip",
  "completed",
  "rejected",
  "cancelled",
]);

// Trip constants
export const MAX_SEATS = 5;
export const TIME_WINDOW_MIN = 15; // minutes

// Unified trips table - combines rides and trips schemas
export const trips = pgTable("trips", {
  id: text("id").primaryKey(),
  driverId: text("driver_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),

  // Addresses (for display and geocoding fallback)
  origin: text("origin").notNull(),
  destination: text("destination").notNull(),

  // Coordinates (for matching - geocoded from addresses, nullable for gradual migration)
  originLat: doublePrecision("origin_lat"),
  originLng: doublePrecision("origin_lng"),
  destLat: doublePrecision("dest_lat"),
  destLng: doublePrecision("dest_lng"),

  departureTime: timestamp("departure_time").notNull(),
  maxSeats: integer("max_seats").notNull(),
  bookedSeats: integer("booked_seats").default(0).notNull(),

  status: tripStatusEnum("status").default("pending").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at")
    .defaultNow()
    .$onUpdate(() => new Date())
    .notNull(),
});

// 2. REPORTS TABLE
// Stores the warnings/bans
export const reports = pgTable("reports", {
  id: serial("id").primaryKey(),
  targetUserId: text("target_user_id")
    .references(() => users.id)
    .notNull(),
  adminId: text("admin_id").references(() => users.id),
  reason: text("reason"),
  type: text("type").default("warning"),
  timestamp: timestamp("timestamp").defaultNow(),
});

// 4. COMPLAINTS TABLE
export const complaints = pgTable("complaints", {
  id: serial("id").primaryKey(),
  reporterUserId: text("reporter_user_id")
    .references(() => users.id)
    .notNull(),
  targetUserId: text("target_user_id")
    .references(() => users.id)
    .notNull(),
  content: text("content").notNull(),
  rideId: text("ride_id"),
  status: text("status").default("pending"),
  createdAt: timestamp("created_at").defaultNow(),
});

//USER ANALYTICS TABLE
export const userAnalytics = pgTable("user_analytics", {
  id: serial("id").primaryKey(),
  totalUsers: integer("total_users").default(0),
  activeUsers: integer("active_users").default(0),
  totalRides: integer("total_rides").default(0),
  reportsCount: integer("reports_count").default(0),
  recordedAt: timestamp("recorded_at").defaultNow(),
});

// Unified trip requests table - includes pickup coordinates
export const tripRequests = pgTable("trip_requests", {
  id: text("id").primaryKey(),
  tripId: text("trip_id")
    .notNull()
    .references(() => trips.id, { onDelete: "cascade" }),
  riderId: text("rider_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),

  // Pickup location coordinates (for route optimization)
  pickupLat: doublePrecision("pickup_lat").notNull(),
  pickupLng: doublePrecision("pickup_lng").notNull(),

  // Dropoff location coordinates (for individual passenger destinations)
  dropoffLat: doublePrecision("dropoff_lat"),
  dropoffLng: doublePrecision("dropoff_lng"),

  // Fare estimation parameters (stored at request time for consistent pricing)
  estimatedDistanceKm: doublePrecision("estimated_distance_km"),
  estimatedDurationSec: integer("estimated_duration_sec"),
  estimatedDetourSec: integer("estimated_detour_sec"),

  // Rider pickup confirmation (server-enforced)
  riderPickupConfirmedAt: timestamp("rider_pickup_confirmed_at"),

  status: tripRequestStatusEnum("status").default("pending").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at")
    .defaultNow()
    .$onUpdate(() => new Date())
    .notNull(),
});

// Optional routes table for caching route data
export const routes = pgTable("routes", {
  id: text("id").primaryKey(),
  origin: text("origin").notNull(),
  destination: text("destination").notNull(),
  distance: text("distance"), // Store as text to allow for various formats
  duration: integer("duration"), // Duration in minutes
  geometry: text("geometry"), // JSON string for route geometry
  cachedAt: timestamp("cached_at").defaultNow().notNull(),
});

// --- REVIEWS MODULE ---

export const reviews = pgTable("reviews", {
  id: serial("id").primaryKey(),

  reviewerId: text("reviewer_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),

  targetUserId: text("target_user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),

  tripId: text("trip_id")
    .notNull()
    .references(() => trips.id, { onDelete: "cascade" }),

  rating: integer("rating").notNull(),

  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// --- PAYMENT MODULE TABLES ---

// Payment status enum
export const paymentStatusEnum = pgEnum("payment_status", [
  "pending",
  "authorized",
  "captured",
  "cancelled",
  "refunded",
  "failed",
]);

// Stripe Customers (for riders)
export const stripeCustomers = pgTable("stripe_customers", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  userId: text("user_id")
    .notNull()
    .unique()
    .references(() => users.id, { onDelete: "cascade" }),
  stripeCustomerId: text("stripe_customer_id").notNull().unique(),
  defaultPaymentMethodId: text("default_payment_method_id"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at")
    .defaultNow()
    .$onUpdate(() => new Date())
    .notNull(),
});

// Stripe Connect Accounts (for drivers)
export const stripeConnectAccounts = pgTable("stripe_connect_accounts", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  userId: text("user_id")
    .notNull()
    .unique()
    .references(() => users.id, { onDelete: "cascade" }),
  stripeAccountId: text("stripe_account_id").notNull().unique(),
  onboardingComplete: boolean("onboarding_complete").default(false).notNull(),
  payoutsEnabled: boolean("payouts_enabled").default(false).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at")
    .defaultNow()
    .$onUpdate(() => new Date())
    .notNull(),
});

// Payments (for ride payments with holds/captures)
export const payments = pgTable("payments", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  tripRequestId: text("trip_request_id")
    .notNull()
    .references(() => tripRequests.id, { onDelete: "cascade" }),
  stripePaymentIntentId: text("stripe_payment_intent_id").notNull().unique(),
  amountCents: integer("amount_cents").notNull(),
  platformFeeCents: integer("platform_fee_cents").notNull(),
  driverAmountCents: integer("driver_amount_cents").notNull(),
  status: paymentStatusEnum("status").default("pending").notNull(),
  authorizedAt: timestamp("authorized_at"),
  capturedAt: timestamp("captured_at"),
  cancelledAt: timestamp("cancelled_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at")
    .defaultNow()
    .$onUpdate(() => new Date())
    .notNull(),
});

// Tips (for post-trip tips)
export const tips = pgTable("tips", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  tripId: text("trip_id")
    .notNull()
    .references(() => trips.id, { onDelete: "cascade" }),
  riderId: text("rider_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  driverId: text("driver_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  amountCents: integer("amount_cents").notNull(),
  stripePaymentIntentId: text("stripe_payment_intent_id").notNull().unique(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});
