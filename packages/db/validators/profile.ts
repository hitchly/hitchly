import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
import { preferences, profiles, vehicles } from "../schema";

export const updateProfileSchema = createInsertSchema(profiles, {
  bio: (schema) => schema.max(250, "Bio must be under 250 characters"),
  year: (schema) => schema.min(1).max(10), // Assuming max year is ~10 for PhDs etc
  faculty: (schema) => schema.min(2, "Faculty name too short"),
}).omit({
  id: true,
  userId: true,
  updatedAt: true,
});

export const updatePreferencesSchema = createInsertSchema(preferences).omit({
  id: true,
  userId: true,
  updatedAt: true,
});

export const updateVehicleSchema = createInsertSchema(vehicles, {
  plate: (schema) =>
    schema
      .min(2)
      .max(8)
      .regex(/^[A-Z0-9 ]+$/, "Invalid Plate"),
  seats: (schema) => schema.min(1).max(10),
}).omit({
  id: true,
  userId: true,
  updatedAt: true,
});

export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;
export type UpdatePreferencesInput = z.infer<typeof updatePreferencesSchema>;
export type UpdateVehicleInput = z.infer<typeof updateVehicleSchema>;
