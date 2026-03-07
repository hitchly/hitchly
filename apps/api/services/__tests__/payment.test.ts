/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import { beforeEach, describe, expect, it, vi } from "vitest";

// Hoist all mocks to be available before module loading
const {
  mockStripeCustomersCreate,
  mockStripeCustomersRetrieve,
  mockStripePaymentIntentsCreate,
  mockStripePaymentIntentsCapture,
  mockStripePaymentIntentsCancel,
  mockStripePaymentIntentsUpdate,
  mockStripePaymentMethodsList,
  mockDbSelect,
  mockDbInsert,
  mockDbUpdate,
} = vi.hoisted(() => {
  return {
    mockStripeCustomersCreate: vi.fn(),
    mockStripeCustomersRetrieve: vi.fn(),
    mockStripePaymentIntentsCreate: vi.fn(),
    mockStripePaymentIntentsCapture: vi.fn(),
    mockStripePaymentIntentsCancel: vi.fn(),
    mockStripePaymentIntentsUpdate: vi.fn(),
    mockStripePaymentMethodsList: vi.fn(),
    mockDbSelect: vi.fn(),
    mockDbInsert: vi.fn(),
    mockDbUpdate: vi.fn(),
  };
});

vi.mock("stripe", () => ({
  default: vi.fn(() => ({
    customers: {
      create: mockStripeCustomersCreate,
      retrieve: mockStripeCustomersRetrieve,
      update: vi.fn(),
    },
    setupIntents: { create: vi.fn() },
    paymentMethods: {
      list: mockStripePaymentMethodsList,
      detach: vi.fn(),
    },
    paymentIntents: {
      create: mockStripePaymentIntentsCreate,
      capture: mockStripePaymentIntentsCapture,
      cancel: mockStripePaymentIntentsCancel,
      update: mockStripePaymentIntentsUpdate,
    },
    accounts: { create: vi.fn(), retrieve: vi.fn() },
    accountLinks: { create: vi.fn() },
  })),
}));

vi.mock("@hitchly/db/client", () => ({
  db: {
    select: mockDbSelect,
    insert: mockDbInsert,
    update: mockDbUpdate,
    query: {},
  },
}));

vi.mock("@hitchly/db/schema", () => ({
  stripeCustomers: {
    userId: "userId",
    stripeCustomerId: "stripeCustomerId",
    defaultPaymentMethodId: "defaultPaymentMethodId",
  },
  stripeConnectAccounts: {
    userId: "userId",
    stripeAccountId: "stripeAccountId",
  },
  payments: {
    tripRequestId: "tripRequestId",
    id: "id",
    stripePaymentIntentId: "stripePaymentIntentId",
    status: "status",
  },
  tips: {},
}));

vi.mock("drizzle-orm", () => ({
  eq: vi.fn((_col: unknown, val: unknown) => ({ _type: "eq", val })),
}));

import {
  calculateFare,
  cancelPaymentHold,
  capturePayment,
  getOrCreateStripeCustomer,
  createPaymentHold,
  processTip,
} from "../payment";

describe("Payment Service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("getOrCreateStripeCustomer", () => {
    it("should return existing customer if found (test-ut-payment-1)", async () => {
      mockDbSelect.mockReturnValueOnce({
        from: vi.fn().mockReturnValueOnce({
          where: vi.fn().mockReturnValueOnce({
            limit: vi
              .fn()
              .mockResolvedValueOnce([
                { userId: "user-1", stripeCustomerId: "cus_existing" },
              ]),
          }),
        }),
      });

      const result = await getOrCreateStripeCustomer(
        "user-1",
        "test@mcmaster.ca"
      );

      expect(result.stripeCustomerId).toBe("cus_existing");
      expect(result.isNew).toBe(false);
      expect(mockStripeCustomersCreate).not.toHaveBeenCalled();
    });

    it("should create new customer if not found (test-ut-payment-1)", async () => {
      mockDbSelect.mockReturnValueOnce({
        from: vi.fn().mockReturnValueOnce({
          where: vi.fn().mockReturnValueOnce({
            limit: vi.fn().mockResolvedValueOnce([]),
          }),
        }),
      });

      mockStripeCustomersCreate.mockResolvedValueOnce({ id: "cus_new" });

      mockDbInsert.mockReturnValueOnce({
        values: vi.fn().mockResolvedValueOnce(undefined),
      });

      const result = await getOrCreateStripeCustomer(
        "user-1",
        "test@mcmaster.ca",
        "Test User"
      );

      expect(result.stripeCustomerId).toBe("cus_new");
      expect(result.isNew).toBe(true);
      expect(mockStripeCustomersCreate).toHaveBeenCalledWith({
        email: "test@mcmaster.ca",
        name: "Test User",
        metadata: { userId: "user-1" },
      });
    });
  });

  describe("calculateFare", () => {
    it("should calculate correct fare split (test-ut-payment-2)", () => {
      const result = calculateFare(10, 1200, 0, 0);

      expect(result.totalCents).toBeGreaterThan(0);
      expect(result.platformFeeCents).toBeGreaterThan(0);
      expect(result.driverAmountCents).toBeGreaterThan(0);
      // Platform fee should be ~15%
      expect(result.platformFeeCents).toBe(
        Math.round(result.totalCents * 0.15)
      );
      // Driver + platform = total
      expect(result.driverAmountCents + result.platformFeeCents).toBe(
        result.totalCents
      );
    });

    it("should apply passenger discounts (test-ut-payment-2)", () => {
      const noPassengers = calculateFare(10, 1200, 0, 0);
      const onePassenger = calculateFare(10, 1200, 1, 0);

      expect(onePassenger.totalCents).toBeLessThan(noPassengers.totalCents);
    });
  });

  describe("createPaymentHold", () => {
    it("should create a PaymentIntent and record in DB (test-ut-payment-3)", async () => {
      // Mock getStripeCustomerId
      mockDbSelect.mockReturnValueOnce({
        from: vi.fn().mockReturnValueOnce({
          where: vi.fn().mockReturnValueOnce({
            limit: vi
              .fn()
              .mockResolvedValueOnce([{ stripeCustomerId: "cus_rider" }]),
          }),
        }),
      });

      mockStripeCustomersRetrieve.mockResolvedValueOnce({
        invoice_settings: { default_payment_method: "pm_default" },
      });

      mockStripePaymentMethodsList.mockResolvedValueOnce({
        data: [{ id: "pm_default" }],
      });

      // Mock getConnectAccount
      mockDbSelect.mockReturnValueOnce({
        from: vi.fn().mockReturnValueOnce({
          where: vi.fn().mockReturnValueOnce({
            limit: vi
              .fn()
              .mockResolvedValueOnce([
                { stripeAccountId: "acct_driver", payoutsEnabled: true },
              ]),
          }),
        }),
      });

      mockStripePaymentIntentsCreate.mockResolvedValueOnce({
        id: "pi_hold",
        status: "requires_capture",
      });

      mockDbInsert.mockReturnValueOnce({
        values: vi.fn().mockResolvedValueOnce(undefined),
      });

      const result = await createPaymentHold(
        "req-1",
        "rider-1",
        "driver-1",
        1000,
        150,
        850
      );

      expect(result.success).toBe(true);
      expect(result.paymentIntentId).toBe("pi_hold");
      expect(mockStripePaymentIntentsCreate).toHaveBeenCalled();
    });
  });

  describe("capturePayment", () => {
    it("should capture PaymentIntent and update DB status (test-ut-payment-4)", async () => {
      mockDbSelect.mockReturnValueOnce({
        from: vi.fn().mockReturnValueOnce({
          where: vi.fn().mockReturnValueOnce({
            limit: vi.fn().mockResolvedValueOnce([
              {
                id: "pay-1",
                stripePaymentIntentId: "pi_hold",
                status: "authorized",
                tripRequestId: "req-1",
              },
            ]),
          }),
        }),
      });

      mockStripePaymentIntentsCapture.mockResolvedValueOnce({
        id: "pi_hold",
        status: "succeeded",
      });

      mockDbUpdate.mockReturnValueOnce({
        set: vi.fn().mockReturnValueOnce({
          where: vi.fn().mockResolvedValueOnce(undefined),
        }),
      });

      const result = await capturePayment("req-1");

      expect(result.success).toBe(true);
      expect(mockStripePaymentIntentsCapture).toHaveBeenCalledWith("pi_hold");
    });
  });

  describe("cancelPaymentHold", () => {
    it("should cancel PaymentIntent and update DB status (test-ut-payment-5)", async () => {
      mockDbSelect.mockReturnValueOnce({
        from: vi.fn().mockReturnValueOnce({
          where: vi.fn().mockReturnValueOnce({
            limit: vi.fn().mockResolvedValueOnce([
              {
                id: "pay-1",
                stripePaymentIntentId: "pi_hold",
                status: "authorized",
                tripRequestId: "req-1",
              },
            ]),
          }),
        }),
      });

      mockStripePaymentIntentsCancel.mockResolvedValueOnce({
        id: "pi_hold",
        status: "canceled",
      });

      mockDbUpdate.mockReturnValueOnce({
        set: vi.fn().mockReturnValueOnce({
          where: vi.fn().mockResolvedValueOnce(undefined),
        }),
      });

      const result = await cancelPaymentHold("req-1");

      expect(result.success).toBe(true);
      expect(mockStripePaymentIntentsCancel).toHaveBeenCalledWith("pi_hold");
    });
  });

  describe("processTip", () => {
    it("should process tip and record in DB (test-ut-payment-6)", async () => {
      // Mock getStripeCustomerId
      mockDbSelect.mockReturnValueOnce({
        from: vi.fn().mockReturnValueOnce({
          where: vi.fn().mockReturnValueOnce({
            limit: vi
              .fn()
              .mockResolvedValueOnce([{ stripeCustomerId: "cus_rider" }]),
          }),
        }),
      });

      mockStripePaymentMethodsList.mockResolvedValueOnce({
        data: [{ id: "pm_rider" }],
      });

      // Mock getConnectAccount
      mockDbSelect.mockReturnValueOnce({
        from: vi.fn().mockReturnValueOnce({
          where: vi.fn().mockReturnValueOnce({
            limit: vi
              .fn()
              .mockResolvedValueOnce([
                { stripeAccountId: "acct_driver", payoutsEnabled: true },
              ]),
          }),
        }),
      });

      mockStripePaymentIntentsCreate.mockResolvedValueOnce({
        id: "pi_tip",
        status: "succeeded",
      });

      mockDbInsert.mockReturnValueOnce({
        values: vi.fn().mockResolvedValueOnce(undefined),
      });

      const result = await processTip("trip-1", "rider-1", "driver-1", 500);

      expect(result.success).toBe(true);
      expect(mockStripePaymentIntentsCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          amount: 500,
          currency: "cad",
          metadata: expect.objectContaining({ type: "tip" }),
        })
      );
    });
  });
});
