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
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at")
    .defaultNow()
    .$onUpdate(() => new Date())
    .notNull(),
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

export const rideStatusEnum = pgEnum("ride_status", [
  "scheduled",
  "in_progress",
  "completed",
  "cancelled",
]);

export const requestStatusEnum = pgEnum("request_status", [
  "pending",
  "accepted",
  "rejected",
  "cancelled",
]);

// 1. The Trip (Driver Only)
export const rides = pgTable("rides", {
  id: text("id").primaryKey(),
  driverId: text("driver_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),

  originLat: doublePrecision("origin_lat").notNull(),
  originLng: doublePrecision("origin_lng").notNull(),
  originAddress: text("origin_address"),

  destLat: doublePrecision("dest_lat").notNull(),
  destLng: doublePrecision("dest_lng").notNull(),
  destAddress: text("dest_address"),

  startTime: timestamp("start_time").notNull(),
  estimatedDuration: integer("estimated_duration"),

  maxSeats: integer("max_seats").notNull(),
  pricePerSeat: doublePrecision("price_per_seat").notNull(),

  status: rideStatusEnum("status").default("scheduled").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// 2. The Booking (Riders link here)
export const rideRequests = pgTable("ride_requests", {
  id: text("id").primaryKey(),
  rideId: text("ride_id")
    .notNull()
    .references(() => rides.id, { onDelete: "cascade" }),
  riderId: text("rider_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),

  status: requestStatusEnum("status").default("pending").notNull(),
  seatsRequested: integer("seats_requested").default(1).notNull(),

  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at")
    .defaultNow()
    .$onUpdate(() => new Date())
    .notNull(),
});
