export declare const paymentRouter: import("@trpc/server").TRPCBuiltRouter<
  {
    ctx: {
      req: Request;
      db: import("drizzle-orm/node-postgres").NodePgDatabase<
        typeof import("@hitchly/db/schema")
      > & {
        $client: import("pg").Pool;
      };
      userId: string | undefined;
      resHeaders: Headers;
    };
    meta: object;
    errorShape: import("@trpc/server").TRPCDefaultErrorShape;
    transformer: false;
  },
  import("@trpc/server").TRPCDecorateCreateRouterOptions<{
    createSetupIntent: import("@trpc/server").TRPCMutationProcedure<{
      input: void;
      output: {
        clientSecret: string;
      };
      meta: object;
    }>;
    getPaymentMethods: import("@trpc/server").TRPCQueryProcedure<{
      input: void;
      output: {
        methods: {
          id: string;
          brand: string;
          last4: string;
          expMonth: number | undefined;
          expYear: number | undefined;
          isDefault: boolean;
        }[];
        hasPaymentMethod: boolean;
      };
      meta: object;
    }>;
    deletePaymentMethod: import("@trpc/server").TRPCMutationProcedure<{
      input: {
        paymentMethodId: string;
      };
      output: {
        success: boolean;
      };
      meta: object;
    }>;
    setDefaultPaymentMethod: import("@trpc/server").TRPCMutationProcedure<{
      input: {
        paymentMethodId: string;
      };
      output: {
        success: boolean;
      };
      meta: object;
    }>;
    hasPaymentMethod: import("@trpc/server").TRPCQueryProcedure<{
      input: void;
      output: {
        hasPaymentMethod: boolean;
      };
      meta: object;
    }>;
    createConnectOnboarding: import("@trpc/server").TRPCMutationProcedure<{
      input: {
        returnUrl: string;
        refreshUrl: string;
      };
      output: {
        onboardingUrl: string;
      };
      meta: object;
    }>;
    getConnectStatus: import("@trpc/server").TRPCQueryProcedure<{
      input: void;
      output: {
        hasAccount: boolean;
        accountId: string | null;
        onboardingComplete: boolean;
        payoutsEnabled: boolean;
        chargesEnabled?: boolean;
        requirementsCurrentlyDue?: string[];
        requirementsEventuallyDue?: string[];
        requirementsDisabledReason?: string | null;
      } | null;
      meta: object;
    }>;
    submitTip: import("@trpc/server").TRPCMutationProcedure<{
      input: {
        tripId: string;
        tipAmountCents: number;
      };
      output: {
        success: boolean;
      };
      meta: object;
    }>;
    getPaymentStatus: import("@trpc/server").TRPCQueryProcedure<{
      input: {
        tripRequestId: string;
      };
      output: {
        status: string;
        amountCents: number;
      } | null;
      meta: object;
    }>;
    getDriverPayoutHistory: import("@trpc/server").TRPCQueryProcedure<{
      input: void;
      output: {
        payments: {
          id: string;
          tripId: string;
          riderName: string;
          origin: string;
          destination: string;
          departureTime: Date;
          amountCents: number;
          platformFeeCents: number;
          driverAmountCents: number;
          status:
            | "pending"
            | "cancelled"
            | "authorized"
            | "captured"
            | "refunded"
            | "failed";
          capturedAt: Date | null;
        }[];
        summary: {
          totalEarningsCents: number;
          totalPlatformFeeCents: number;
          pendingCents: number;
          transactionCount: number;
        };
      };
      meta: object;
    }>;
    getRiderPaymentHistory: import("@trpc/server").TRPCQueryProcedure<{
      input: void;
      output: {
        payments: {
          id: string;
          tripId: string;
          driverName: string;
          origin: string;
          destination: string;
          departureTime: Date;
          amountCents: number;
          status:
            | "pending"
            | "cancelled"
            | "authorized"
            | "captured"
            | "refunded"
            | "failed";
          capturedAt: Date | null;
        }[];
        tips: {
          tipId: string;
          tripId: string;
          amountCents: number;
          createdAt: Date;
        }[];
        summary: {
          totalSpentCents: number;
          totalTipsCents: number;
          rideCount: number;
        };
      };
      meta: object;
    }>;
  }>
>;
//# sourceMappingURL=payment.d.ts.map
