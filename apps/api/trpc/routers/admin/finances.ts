import { payments, stripeConnectAccounts, users } from "@hitchly/db/schema";
import { count, eq } from "drizzle-orm";
import z from "zod";

import { protectedProcedure, router } from "../../trpc";

export const financesRouter = router({
  metrics: protectedProcedure
    .output(
      z.object({
        kpis: z.object({
          grossVolume: z.number(),
          netRevenue: z.number(),
          activeConnect: z.number(),
          payoutsPending: z.number(),
        }),
        revenueChart: z.array(
          z.object({
            month: z.string(),
            total: z.number(),
          })
        ),
        payouts: z.array(
          z.object({
            id: z.string(),
            driver: z.string(),
            amount: z.number(),
            status: z.enum(["paid", "pending", "action-required"]),
            stripeId: z.string(),
            lastPayout: z.string(),
          })
        ),
      })
    )
    .query(async ({ ctx }) => {
      // 1. KPI Aggregations
      const allPayments = await ctx.db.select().from(payments);

      const grossVolume =
        allPayments.reduce((acc, p) => acc + p.amountCents, 0) / 100;
      const netRevenue =
        allPayments.reduce((acc, p) => acc + p.platformFeeCents, 0) / 100;

      const pendingPayments = await ctx.db
        .select()
        .from(payments)
        .where(eq(payments.status, "authorized"));
      const payoutsPending =
        pendingPayments.reduce((acc, p) => acc + p.amountCents, 0) / 100;

      const activeConnectRes = await ctx.db
        .select({ val: count() })
        .from(stripeConnectAccounts)
        .where(eq(stripeConnectAccounts.onboardingComplete, true));

      // 2. Chart Logic (Last 6 Months)
      const months = ["Sep", "Oct", "Nov", "Dec", "Jan", "Feb"];
      const revenueChart = months.map((m) => ({
        month: m,
        total: Math.floor(Math.random() * 3000) + 1000, // Placeholder until historical snapshots are implemented
      }));

      // 3. Driver Payout Audit
      const connectAccounts = await ctx.db
        .select({
          id: stripeConnectAccounts.id,
          stripeId: stripeConnectAccounts.stripeAccountId,
          onboarding: stripeConnectAccounts.onboardingComplete,
          userName: users.name,
        })
        .from(stripeConnectAccounts)
        .innerJoin(users, eq(stripeConnectAccounts.userId, users.id))
        .limit(5);

      const payouts = connectAccounts.map((acc) => ({
        id: acc.id,
        driver: acc.userName,
        amount: Math.random() * 200, // Aggregated from payments in real scenario
        status: acc.onboarding
          ? ("paid" as const)
          : ("action-required" as const),
        stripeId: acc.stripeId,
        lastPayout: acc.onboarding ? "Feb 14, 2026" : "N/A",
      }));

      return {
        kpis: {
          grossVolume,
          netRevenue,
          activeConnect: activeConnectRes[0]?.val ?? 0,
          payoutsPending,
        },
        revenueChart,
        payouts,
      };
    }),
});
