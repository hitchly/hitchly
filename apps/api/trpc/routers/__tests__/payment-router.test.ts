// TODO: Fix any linting issues
/* eslint-disable */

import { beforeEach, describe, expect, it, vi } from "vitest";

import { createMockContext } from "../../../lib/tests/mockContext";
import { createMockDb } from "../../../lib/tests/mockDb";

// Set STRIPE_SECRET_KEY before importing the router (module-level guard)
vi.stubEnv("STRIPE_SECRET_KEY", "sk_test_fake_key");

// Hoist all payment service mocks
const {
  mockGetOrCreateStripeCustomer,
  mockCreateSetupIntent,
  mockGetStripeCustomerId,
  mockListPaymentMethods,
  mockDeletePaymentMethod,
  mockSetDefaultPaymentMethod,
  mockHasPaymentMethod,
  mockCreateConnectAccount,
  mockCreateConnectOnboardingLink,
  mockGetConnectAccountStatus,
  mockProcessTip,
  mockGetPaymentStatus,
} = vi.hoisted(() => ({
  mockGetOrCreateStripeCustomer: vi.fn(),
  mockCreateSetupIntent: vi.fn(),
  mockGetStripeCustomerId: vi.fn(),
  mockListPaymentMethods: vi.fn(),
  mockDeletePaymentMethod: vi.fn(),
  mockSetDefaultPaymentMethod: vi.fn(),
  mockHasPaymentMethod: vi.fn(),
  mockCreateConnectAccount: vi.fn(),
  mockCreateConnectOnboardingLink: vi.fn(),
  mockGetConnectAccountStatus: vi.fn(),
  mockProcessTip: vi.fn(),
  mockGetPaymentStatus: vi.fn(),
}));

vi.mock("../../../services/payment", () => ({
  getOrCreateStripeCustomer: mockGetOrCreateStripeCustomer,
  createSetupIntent: mockCreateSetupIntent,
  getStripeCustomerId: mockGetStripeCustomerId,
  listPaymentMethods: mockListPaymentMethods,
  deletePaymentMethod: mockDeletePaymentMethod,
  setDefaultPaymentMethod: mockSetDefaultPaymentMethod,
  hasPaymentMethod: mockHasPaymentMethod,
  createConnectAccount: mockCreateConnectAccount,
  createConnectOnboardingLink: mockCreateConnectOnboardingLink,
  getConnectAccountStatus: mockGetConnectAccountStatus,
  processTip: mockProcessTip,
  getPaymentStatus: mockGetPaymentStatus,
}));

// Mock Stripe constructor
vi.mock("stripe", () => {
  return {
    default: vi.fn().mockImplementation(() => ({
      customers: {
        retrieve: vi.fn().mockResolvedValue({
          invoice_settings: { default_payment_method: "pm_default_123" },
        }),
      },
    })),
  };
});

// Import AFTER mocks
import { paymentRouter } from "../payment";

describe("Payment Router", () => {
  let mockDb: ReturnType<typeof createMockDb>;

  beforeEach(() => {
    mockDb = createMockDb();
    vi.clearAllMocks();
  });

  // ============================================
  // createSetupIntent
  // ============================================
  describe("createSetupIntent", () => {
    it("should return client secret for valid user (test-ut-payment-7)", async () => {
      const userId = "user-100";

      // Mock select().from().where().limit() → user found
      mockDb.select.mockReturnValueOnce({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi
              .fn()
              .mockResolvedValueOnce([
                { email: "user@mcmaster.ca", name: "Test User" },
              ]),
          }),
        }),
      });

      mockGetOrCreateStripeCustomer.mockResolvedValueOnce({
        stripeCustomerId: "cus_123",
      });
      mockCreateSetupIntent.mockResolvedValueOnce({
        clientSecret: "seti_secret_abc",
      });

      const caller = paymentRouter.createCaller(
        createMockContext(userId, mockDb as any)
      );

      const result = await caller.createSetupIntent();

      expect(result).toEqual({ clientSecret: "seti_secret_abc" });
      expect(mockGetOrCreateStripeCustomer).toHaveBeenCalledWith(
        userId,
        "user@mcmaster.ca",
        "Test User"
      );
    });

    it("should throw NOT_FOUND when user does not exist (test-ut-payment-8)", async () => {
      const userId = "user-nonexistent";

      mockDb.select.mockReturnValueOnce({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValueOnce([]),
          }),
        }),
      });

      const caller = paymentRouter.createCaller(
        createMockContext(userId, mockDb as any)
      );

      await expect(caller.createSetupIntent()).rejects.toThrowError(
        "User not found"
      );
    });
  });

  // ============================================
  // getPaymentMethods
  // ============================================
  describe("getPaymentMethods", () => {
    it("should return mapped methods with default flag (test-ut-payment-9)", async () => {
      const userId = "user-100";

      mockGetStripeCustomerId.mockResolvedValueOnce("cus_123");
      mockListPaymentMethods.mockResolvedValueOnce([
        {
          id: "pm_1",
          card: { brand: "visa", last4: "4242", exp_month: 12, exp_year: 2026 },
        },
        {
          id: "pm_default_123",
          card: {
            brand: "mastercard",
            last4: "5555",
            exp_month: 6,
            exp_year: 2027,
          },
        },
      ]);

      const caller = paymentRouter.createCaller(
        createMockContext(userId, mockDb as any)
      );

      const result = await caller.getPaymentMethods();

      expect(result.hasPaymentMethod).toBe(true);
      expect(result.methods).toHaveLength(2);
      // Default should be sorted first
      expect(result.methods[0]?.isDefault).toBe(true);
      expect(result.methods[0]?.last4).toBe("5555");
    });

    it("should return empty when no Stripe customer exists (test-ut-payment-10)", async () => {
      const userId = "user-100";
      mockGetStripeCustomerId.mockResolvedValueOnce(null);

      const caller = paymentRouter.createCaller(
        createMockContext(userId, mockDb as any)
      );

      const result = await caller.getPaymentMethods();

      expect(result.methods).toEqual([]);
      expect(result.hasPaymentMethod).toBe(false);
    });
  });

  // ============================================
  // deletePaymentMethod
  // ============================================
  describe("deletePaymentMethod", () => {
    it("should delete a valid payment method (test-ut-payment-11)", async () => {
      const userId = "user-100";

      mockGetStripeCustomerId.mockResolvedValueOnce("cus_123");
      mockListPaymentMethods.mockResolvedValueOnce([
        { id: "pm_to_delete", card: { last4: "4242" } },
      ]);
      mockDeletePaymentMethod.mockResolvedValueOnce(undefined);

      const caller = paymentRouter.createCaller(
        createMockContext(userId, mockDb as any)
      );

      const result = await caller.deletePaymentMethod({
        paymentMethodId: "pm_to_delete",
      });

      expect(result).toEqual({ success: true });
      expect(mockDeletePaymentMethod).toHaveBeenCalledWith("pm_to_delete");
    });

    it("should throw NOT_FOUND for non-existent method (test-ut-payment-12)", async () => {
      const userId = "user-100";

      mockGetStripeCustomerId.mockResolvedValueOnce("cus_123");
      mockListPaymentMethods.mockResolvedValueOnce([
        { id: "pm_other", card: { last4: "9999" } },
      ]);

      const caller = paymentRouter.createCaller(
        createMockContext(userId, mockDb as any)
      );

      await expect(
        caller.deletePaymentMethod({ paymentMethodId: "pm_nonexistent" })
      ).rejects.toThrowError("Payment method not found");
    });
  });

  // ============================================
  // setDefaultPaymentMethod & hasPaymentMethod
  // ============================================
  describe("setDefaultPaymentMethod & hasPaymentMethod", () => {
    it("should set default and check hasPaymentMethod (test-ut-payment-13)", async () => {
      const userId = "user-100";

      mockSetDefaultPaymentMethod.mockResolvedValueOnce(undefined);
      mockHasPaymentMethod.mockResolvedValueOnce(true);

      const caller = paymentRouter.createCaller(
        createMockContext(userId, mockDb as any)
      );

      const setResult = await caller.setDefaultPaymentMethod({
        paymentMethodId: "pm_123",
      });
      expect(setResult).toEqual({ success: true });

      const hasResult = await caller.hasPaymentMethod();
      expect(hasResult).toEqual({ hasPaymentMethod: true });
    });
  });

  // ============================================
  // createConnectOnboarding
  // ============================================
  describe("createConnectOnboarding", () => {
    it("should create onboarding link for valid driver (test-ut-payment-14)", async () => {
      const userId = "driver-100";

      // Mock user lookup
      mockDb.select.mockReturnValueOnce({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi
              .fn()
              .mockResolvedValueOnce([
                { email: "driver@mcmaster.ca", name: "Test Driver" },
              ]),
          }),
        }),
      });

      mockCreateConnectAccount.mockResolvedValueOnce({
        accountId: "acct_123",
      });
      mockCreateConnectOnboardingLink.mockResolvedValueOnce(
        "https://connect.stripe.com/onboarding/123"
      );

      const caller = paymentRouter.createCaller(
        createMockContext(userId, mockDb as any)
      );

      const result = await caller.createConnectOnboarding({
        returnUrl: "https://hitchly.app/return",
        refreshUrl: "https://hitchly.app/refresh",
      });

      expect(result).toEqual({
        onboardingUrl: "https://connect.stripe.com/onboarding/123",
      });
    });
  });

  // ============================================
  // getConnectStatus
  // ============================================
  describe("getConnectStatus", () => {
    it("should return connect account status (test-ut-payment-15)", async () => {
      const userId = "driver-100";

      mockGetConnectAccountStatus.mockResolvedValueOnce({
        hasAccount: true,
        accountId: "acct_123",
        onboardingComplete: true,
        payoutsEnabled: true,
      });

      const caller = paymentRouter.createCaller(
        createMockContext(userId, mockDb as any)
      );

      const result = await caller.getConnectStatus();

      expect(result).toEqual(
        expect.objectContaining({
          hasAccount: true,
          payoutsEnabled: true,
        })
      );
    });
  });

  // ============================================
  // submitTip
  // ============================================
  describe("submitTip", () => {
    it("should process tip for completed trip (test-ut-payment-16)", async () => {
      const userId = "rider-100";

      // Mock trip lookup
      mockDb.select.mockReturnValueOnce({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValueOnce([
              {
                id: "trip-1",
                driverId: "driver-1",
                status: "completed",
              },
            ]),
          }),
        }),
      });

      // Mock tripRequest lookup (rider was on trip)
      mockDb.select.mockReturnValueOnce({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValueOnce([
              {
                id: "req-1",
                tripId: "trip-1",
                riderId: userId,
                status: "completed",
              },
            ]),
          }),
        }),
      });

      mockProcessTip.mockResolvedValueOnce({ success: true });

      const caller = paymentRouter.createCaller(
        createMockContext(userId, mockDb as any)
      );

      const result = await caller.submitTip({
        tripId: "trip-1",
        tipAmountCents: 500,
      });

      expect(result).toEqual({ success: true });
      expect(mockProcessTip).toHaveBeenCalledWith(
        "trip-1",
        userId,
        "driver-1",
        500
      );
    });

    it("should reject tip for non-completed trip (test-ut-payment-17)", async () => {
      const userId = "rider-100";

      mockDb.select.mockReturnValueOnce({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi
              .fn()
              .mockResolvedValueOnce([
                { id: "trip-1", driverId: "driver-1", status: "active" },
              ]),
          }),
        }),
      });

      const caller = paymentRouter.createCaller(
        createMockContext(userId, mockDb as any)
      );

      await expect(
        caller.submitTip({ tripId: "trip-1", tipAmountCents: 500 })
      ).rejects.toThrowError("Can only tip for completed trips");
    });
  });

  // ============================================
  // getDriverPayoutHistory
  // ============================================
  describe("getDriverPayoutHistory", () => {
    it("should return earnings summary (test-ut-payment-18)", async () => {
      const userId = "driver-100";

      const now = new Date();
      // Mock the join query chain: select().from().innerJoin().innerJoin().innerJoin().where().orderBy().limit()
      mockDb.select.mockReturnValueOnce({
        from: vi.fn().mockReturnValue({
          innerJoin: vi.fn().mockReturnValue({
            innerJoin: vi.fn().mockReturnValue({
              innerJoin: vi.fn().mockReturnValue({
                where: vi.fn().mockReturnValue({
                  orderBy: vi.fn().mockReturnValue({
                    limit: vi.fn().mockResolvedValueOnce([
                      {
                        paymentId: "pay-1",
                        tripRequestId: "req-1",
                        amountCents: 1000,
                        platformFeeCents: 150,
                        driverAmountCents: 850,
                        status: "captured",
                        capturedAt: now,
                        createdAt: now,
                        tripId: "trip-1",
                        origin: "McMaster",
                        destination: "Downtown",
                        departureTime: now,
                        riderId: "rider-1",
                        riderName: "Test Rider",
                      },
                    ]),
                  }),
                }),
              }),
            }),
          }),
        }),
      });

      const caller = paymentRouter.createCaller(
        createMockContext(userId, mockDb as any)
      );

      const result = await caller.getDriverPayoutHistory();

      expect(result.payments).toHaveLength(1);
      expect(result.summary.totalEarningsCents).toBe(850);
      expect(result.summary.totalPlatformFeeCents).toBe(150);
      expect(result.summary.pendingCents).toBe(0);
      expect(result.summary.transactionCount).toBe(1);
    });
  });

  // ============================================
  // getRiderPaymentHistory
  // ============================================
  describe("getRiderPaymentHistory", () => {
    it("should return spending summary (test-ut-payment-19)", async () => {
      const userId = "rider-100";
      const now = new Date();

      // Mock payments join query
      mockDb.select.mockReturnValueOnce({
        from: vi.fn().mockReturnValue({
          innerJoin: vi.fn().mockReturnValue({
            innerJoin: vi.fn().mockReturnValue({
              innerJoin: vi.fn().mockReturnValue({
                where: vi.fn().mockReturnValue({
                  orderBy: vi.fn().mockReturnValue({
                    limit: vi.fn().mockResolvedValueOnce([
                      {
                        paymentId: "pay-1",
                        amountCents: 1000,
                        status: "captured",
                        capturedAt: now,
                        createdAt: now,
                        tripId: "trip-1",
                        origin: "McMaster",
                        destination: "Downtown",
                        departureTime: now,
                        driverId: "driver-1",
                        driverName: "Test Driver",
                      },
                    ]),
                  }),
                }),
              }),
            }),
          }),
        }),
      });

      // Mock tips query
      mockDb.select.mockReturnValueOnce({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            orderBy: vi.fn().mockReturnValue({
              limit: vi.fn().mockResolvedValueOnce([
                {
                  tipId: "tip-1",
                  tripId: "trip-1",
                  amountCents: 300,
                  createdAt: now,
                },
              ]),
            }),
          }),
        }),
      });

      const caller = paymentRouter.createCaller(
        createMockContext(userId, mockDb as any)
      );

      const result = await caller.getRiderPaymentHistory();

      expect(result.payments).toHaveLength(1);
      expect(result.tips).toHaveLength(1);
      expect(result.summary.totalSpentCents).toBe(1000);
      expect(result.summary.totalTipsCents).toBe(300);
      expect(result.summary.rideCount).toBe(1);
    });
  });

  // ============================================
  // getPaymentStatus
  // ============================================
  describe("getPaymentStatus", () => {
    it("should return status from service (test-ut-payment-20)", async () => {
      const userId = "user-100";

      mockGetPaymentStatus.mockResolvedValueOnce({
        status: "captured",
        amountCents: 1000,
      });

      const caller = paymentRouter.createCaller(
        createMockContext(userId, mockDb as any)
      );

      const result = await caller.getPaymentStatus({
        tripRequestId: "req-1",
      });

      expect(result).toEqual(expect.objectContaining({ status: "captured" }));
    });
  });
});
