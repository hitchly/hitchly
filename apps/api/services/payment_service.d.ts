import Stripe from "stripe";
export declare function getOrCreateStripeCustomer(
  userId: string,
  email: string,
  name?: string
): Promise<{
  stripeCustomerId: string;
  isNew: boolean;
}>;
export declare function getStripeCustomerId(
  userId: string
): Promise<string | null>;
export declare function createSetupIntent(customerId: string): Promise<{
  clientSecret: string;
}>;
export declare function listPaymentMethods(
  customerId: string
): Promise<Stripe.PaymentMethod[]>;
export declare function hasPaymentMethod(userId: string): Promise<boolean>;
export declare function deletePaymentMethod(
  paymentMethodId: string
): Promise<void>;
export declare function setDefaultPaymentMethod(
  userId: string,
  paymentMethodId: string
): Promise<void>;
export declare function createConnectAccount(
  userId: string,
  email: string,
  name: string
): Promise<{
  accountId: string;
  isNew: boolean;
}>;
export declare function createConnectOnboardingLink(
  accountId: string,
  returnUrl: string,
  refreshUrl: string
): Promise<string>;
export declare function getConnectAccountStatus(userId: string): Promise<{
  hasAccount: boolean;
  accountId: string | null;
  onboardingComplete: boolean;
  payoutsEnabled: boolean;
  chargesEnabled?: boolean;
  requirementsCurrentlyDue?: string[];
  requirementsEventuallyDue?: string[];
  requirementsDisabledReason?: string | null;
} | null>;
export declare function calculateFare(
  distanceKm: number,
  durationSeconds: number,
  existingPassengers: number,
  detourSeconds?: number
): {
  totalCents: number;
  platformFeeCents: number;
  driverAmountCents: number;
};
/**
 * Create a payment hold (authorization) when driver accepts a request
 */
export declare function createPaymentHold(
  tripRequestId: string,
  riderId: string,
  driverId: string,
  amountCents: number,
  platformFeeCents: number,
  driverAmountCents: number
): Promise<{
  paymentIntentId: string;
  success: boolean;
  error?: string;
}>;
export declare function updatePaymentHold(
  tripRequestId: string,
  newAmountCents: number,
  newPlatformFeeCents: number,
  newDriverAmountCents: number
): Promise<{
  success: boolean;
  error?: string;
}>;
export declare function capturePayment(tripRequestId: string): Promise<{
  success: boolean;
  error?: string;
}>;
export declare function cancelPaymentHold(tripRequestId: string): Promise<{
  success: boolean;
  error?: string;
}>;
export declare function processTip(
  tripId: string,
  riderId: string,
  driverId: string,
  tipAmountCents: number
): Promise<{
  success: boolean;
  error?: string;
}>;
export declare function getPaymentStatus(tripRequestId: string): Promise<{
  status: string;
  amountCents: number;
} | null>;
//# sourceMappingURL=payment_service.d.ts.map
