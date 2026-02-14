import { complaints, users } from "@hitchly/db/schema";
import { count, desc, eq } from "drizzle-orm";
import z from "zod";

import { protectedProcedure, router } from "../../trpc";

type SafetyStatus = "open" | "investigating" | "resolved";
type Severity = "low" | "medium" | "high" | "critical";

export const safetyRouter = router({
  metrics: protectedProcedure
    .output(
      z.object({
        kpis: z.object({
          unresolvedReports: z.number(),
          avgResolutionTime: z.string(),
          trustScore: z.string(),
        }),
        incidents: z.array(
          z.object({
            id: z.string(),
            reporter: z.string(),
            accused: z.string(),
            type: z.enum([
              "harassment",
              "dangerous-driving",
              "unauthorized-vehicle",
              "other",
            ]),
            severity: z.enum(["low", "medium", "high", "critical"]),
            status: z.enum(["open", "investigating", "resolved"]),
            timestamp: z.string(),
            tripId: z.string(),
          })
        ),
      })
    )
    .query(async ({ ctx }) => {
      const unresolvedRes = await ctx.db
        .select({ val: count() })
        .from(complaints)
        .where(eq(complaints.status, "pending"));

      const recentComplaints = await ctx.db
        .select({
          id: complaints.id,
          content: complaints.content,
          status: complaints.status,
          createdAt: complaints.createdAt,
          tripId: complaints.rideId,
          reporterName: users.name,
        })
        .from(complaints)
        .innerJoin(users, eq(complaints.reporterUserId, users.id))
        .orderBy(desc(complaints.createdAt))
        .limit(10);

      const incidents = recentComplaints.map((c) => {
        const content = c.content.toLowerCase();

        let severity: Severity = "medium";
        if (content.includes("emergency") || content.includes("accident"))
          severity = "critical";
        else if (content.includes("dangerous") || content.includes("harass"))
          severity = "high";

        const status: SafetyStatus =
          c.status === "pending" ? "open" : (c.status as SafetyStatus);

        return {
          id: `INC-${String(c.id)}`,
          reporter: c.reporterName,
          accused: "Under Review",
          type: "other" as const,
          severity,
          status,
          timestamp:
            c.createdAt?.toISOString().replace("T", " ").slice(0, 16) ?? "",
          tripId: c.tripId ?? "N/A",
        };
      });

      return {
        kpis: {
          unresolvedReports: unresolvedRes[0]?.val ?? 0,
          avgResolutionTime: "0h", //TODO: actually calculate resolution time
          trustScore: "0%", //TODO: actually calculate trust score
        },
        incidents,
      };
    }),

  updateStatus: protectedProcedure
    .input(z.object({ id: z.number(), status: z.string() }))
    .mutation(async ({ ctx, input }) => {
      return await ctx.db
        .update(complaints)
        .set({ status: input.status })
        .where(eq(complaints.id, input.id));
    }),
});
