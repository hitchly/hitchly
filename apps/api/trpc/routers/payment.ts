import { z } from "zod";
import Stripe from "stripe";
import { TRPCError } from "@trpc/server";
import { protectedProcedure, router } from "../trpc";
import {
  getOrCreateStripeCustomer,
  getStripeCustomerId,
  createSetupIntent,
  listPaymentMethods,
  deletePaymentMethod,
  setDefaultPaymentMethod,
  hasPaymentMethod,
  createConnectAccount,
  createConnectOnboardingLink,
  getConnectAccountStatus,
  processTip,
  getPaymentStatus,
} from "../../services/payment_service";
import { users, trips, tripRequests, payments, tips } from "@hitchly/db/schema";
import { eq, and, desc, ne } from "drizzle-orm";

export const paymentRouter = router({
  createSetupIntent: protectedProcedure.mutation(async ({ ctx }) => {
    const userId = ctx.userId!;

    const [user] = await ctx.db
      .select({ email: users.email, name: users.name })
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);

    if (!user) {
      throw new TRPCError({ code: "NOT_FOUND", message: "User not found" });
    }

    const { stripeCustomerId } = await getOrCreateStripeCustomer(
      userId,
      user.email,
      user.name
    );

    const { clientSecret } = await createSetupIntent(stripeCustomerId);

    return { clientSecret };
  }),

  getPaymentMethods: protectedProcedure.query(async ({ ctx }) => {
    const userId = ctx.userId!;

    const customerId = await getStripeCustomerId(userId);
    if (!customerId) {
      return { methods: [], hasPaymentMethod: false };
    }

    const methods = await listPaymentMethods(customerId);

    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);
    const customer = (await stripe.customers.retrieve(
      customerId
    )) as Stripe.Customer;
    const defaultPaymentMethodId = customer.invoice_settings
      ?.default_payment_method as string | null;

    const mappedMethods = methods.map((m) => ({
      id: m.id,
      brand: m.card?.brand || "unknown",
      last4: m.card?.last4 || "****",
      expMonth: m.card?.exp_month,
      expYear: m.card?.exp_year,
      isDefault: m.id === defaultPaymentMethodId,
    }));

    mappedMethods.sort((a, b) => (b.isDefault ? 1 : 0) - (a.isDefault ? 1 : 0));

    return {
      methods: mappedMethods,
      hasPaymentMethod: methods.length > 0,
    };
  }),

  deletePaymentMethod: protectedProcedure
    .input(z.object({ paymentMethodId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.userId!;

      const customerId = await getStripeCustomerId(userId);
      if (!customerId) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "No payment methods found",
        });
      }

      const methods = await listPaymentMethods(customerId);
      const method = methods.find((m) => m.id === input.paymentMethodId);

      if (!method) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Payment method not found",
        });
      }

      await deletePaymentMethod(input.paymentMethodId);

      return { success: true };
    }),

  setDefaultPaymentMethod: protectedProcedure
    .input(z.object({ paymentMethodId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.userId!;

      await setDefaultPaymentMethod(userId, input.paymentMethodId);

      return { success: true };
    }),

  hasPaymentMethod: protectedProcedure.query(async ({ ctx }) => {
    const userId = ctx.userId!;
    const hasPM = await hasPaymentMethod(userId);
    return { hasPaymentMethod: hasPM };
  }),

  createConnectOnboarding: protectedProcedure
    .input(
      z.object({
        returnUrl: z.string().url(),
        refreshUrl: z.string().url(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.userId!;

      const [user] = await ctx.db
        .select({ email: users.email, name: users.name })
        .from(users)
        .where(eq(users.id, userId))
        .limit(1);

      if (!user) {
        throw new TRPCError({ code: "NOT_FOUND", message: "User not found" });
      }

      const { accountId } = await createConnectAccount(
        userId,
        user.email,
        user.name
      );

      const onboardingUrl = await createConnectOnboardingLink(
        accountId,
        input.returnUrl,
        input.refreshUrl
      );

      return { onboardingUrl };
    }),

  getConnectStatus: protectedProcedure.query(async ({ ctx }) => {
    const userId = ctx.userId!;
    const status = await getConnectAccountStatus(userId);
    return status;
  }),

  submitTip: protectedProcedure
    .input(
      z.object({
        tripId: z.string(),
        tipAmountCents: z.number().int().min(50).max(50000),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const riderId = ctx.userId!;

      const [trip] = await ctx.db
        .select()
        .from(trips)
        .where(eq(trips.id, input.tripId))
        .limit(1);

      if (!trip) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Trip not found" });
      }

      if (trip.status !== "completed") {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Can only tip for completed trips",
        });
      }
      const [request] = await ctx.db
        .select()
        .from(tripRequests)
        .where(
          and(
            eq(tripRequests.tripId, input.tripId),
            eq(tripRequests.riderId, riderId),
            eq(tripRequests.status, "completed")
          )
        )
        .limit(1);

      if (!request) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "You were not a rider on this trip",
        });
      }

      const result = await processTip(
        input.tripId,
        riderId,
        trip.driverId,
        input.tipAmountCents
      );

      if (!result.success) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: result.error || "Failed to process tip",
        });
      }

      return { success: true };
    }),

  getPaymentStatus: protectedProcedure
    .input(z.object({ tripRequestId: z.string() }))
    .query(async ({ input }) => {
      const status = await getPaymentStatus(input.tripRequestId);
      return status;
    }),

  getDriverPayoutHistory: protectedProcedure.query(async ({ ctx }) => {
    const driverId = ctx.userId!;

    const driverPayments = await ctx.db
      .select({
        paymentId: payments.id,
        tripRequestId: payments.tripRequestId,
        amountCents: payments.amountCents,
        platformFeeCents: payments.platformFeeCents,
        driverAmountCents: payments.driverAmountCents,
        status: payments.status,
        capturedAt: payments.capturedAt,
        createdAt: payments.createdAt,
        tripId: trips.id,
        origin: trips.origin,
        destination: trips.destination,
        departureTime: trips.departureTime,
        riderId: tripRequests.riderId,
        riderName: users.name,
      })
      .from(payments)
      .innerJoin(tripRequests, eq(tripRequests.id, payments.tripRequestId))
      .innerJoin(trips, eq(trips.id, tripRequests.tripId))
      .innerJoin(users, eq(users.id, tripRequests.riderId))
      .where(
        and(eq(trips.driverId, driverId), ne(payments.status, "cancelled"))
      )
      .orderBy(desc(payments.createdAt))
      .limit(50);

    const captured = driverPayments.filter((p) => p.status === "captured");
    const totalEarningsCents = captured.reduce(
      (sum, p) => sum + p.driverAmountCents,
      0
    );
    const totalPlatformFeeCents = captured.reduce(
      (sum, p) => sum + p.platformFeeCents,
      0
    );
    const pendingCents = driverPayments
      .filter((p) => p.status === "authorized")
      .reduce((sum, p) => sum + p.driverAmountCents, 0);

    return {
      payments: driverPayments.map((p) => ({
        id: p.paymentId,
        tripId: p.tripId,
        riderName: p.riderName,
        origin: p.origin,
        destination: p.destination,
        departureTime: p.departureTime,
        amountCents: p.amountCents,
        platformFeeCents: p.platformFeeCents,
        driverAmountCents: p.driverAmountCents,
        status: p.status,
        capturedAt: p.capturedAt,
      })),
      summary: {
        totalEarningsCents,
        totalPlatformFeeCents,
        pendingCents,
        transactionCount: captured.length,
      },
    };
  }),

  getRiderPaymentHistory: protectedProcedure.query(async ({ ctx }) => {
    const riderId = ctx.userId!;

    const riderPayments = await ctx.db
      .select({
        paymentId: payments.id,
        amountCents: payments.amountCents,
        status: payments.status,
        capturedAt: payments.capturedAt,
        createdAt: payments.createdAt,
        tripId: trips.id,
        origin: trips.origin,
        destination: trips.destination,
        departureTime: trips.departureTime,
        driverId: trips.driverId,
        driverName: users.name,
      })
      .from(payments)
      .innerJoin(tripRequests, eq(tripRequests.id, payments.tripRequestId))
      .innerJoin(trips, eq(trips.id, tripRequests.tripId))
      .innerJoin(users, eq(users.id, trips.driverId))
      .where(eq(tripRequests.riderId, riderId))
      .orderBy(desc(payments.createdAt))
      .limit(50);

    const riderTips = await ctx.db
      .select({
        tipId: tips.id,
        tripId: tips.tripId,
        amountCents: tips.amountCents,
        createdAt: tips.createdAt,
      })
      .from(tips)
      .where(eq(tips.riderId, riderId))
      .orderBy(desc(tips.createdAt))
      .limit(20);

    const captured = riderPayments.filter((p) => p.status === "captured");
    const totalSpentCents = captured.reduce((sum, p) => sum + p.amountCents, 0);
    const totalTipsCents = riderTips.reduce((sum, t) => sum + t.amountCents, 0);

    return {
      payments: riderPayments.map((p) => ({
        id: p.paymentId,
        tripId: p.tripId,
        driverName: p.driverName,
        origin: p.origin,
        destination: p.destination,
        departureTime: p.departureTime,
        amountCents: p.amountCents,
        status: p.status,
        capturedAt: p.capturedAt,
      })),
      tips: riderTips,
      summary: {
        totalSpentCents,
        totalTipsCents,
        rideCount: captured.length,
      },
    };
  }),
});
