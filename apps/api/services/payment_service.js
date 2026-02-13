// TODO: Fix any linting issues
/* eslint-disable */
import { db } from "@hitchly/db/client";
import {
  payments,
  stripeConnectAccounts,
  stripeCustomers,
  tips,
} from "@hitchly/db/schema";
import { eq } from "drizzle-orm";
import Stripe from "stripe";
import { calculateEstimatedCost } from "./pricing_service";
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
const PLATFORM_FEE_PERCENT = 15;
export async function getOrCreateStripeCustomer(userId, email, name) {
  // Check if customer already exists in our DB
  const [existing] = await db
    .select()
    .from(stripeCustomers)
    .where(eq(stripeCustomers.userId, userId))
    .limit(1);
  if (existing) {
    return { stripeCustomerId: existing.stripeCustomerId, isNew: false };
  }
  const customer = await stripe.customers.create({
    email,
    name: name || undefined,
    metadata: { userId },
  });
  await db.insert(stripeCustomers).values({
    userId,
    stripeCustomerId: customer.id,
  });
  return { stripeCustomerId: customer.id, isNew: true };
}
export async function getStripeCustomerId(userId) {
  const [customer] = await db
    .select()
    .from(stripeCustomers)
    .where(eq(stripeCustomers.userId, userId))
    .limit(1);
  return customer?.stripeCustomerId || null;
}
export async function createSetupIntent(customerId) {
  const setupIntent = await stripe.setupIntents.create({
    customer: customerId,
    payment_method_types: ["card"],
  });
  return { clientSecret: setupIntent.client_secret };
}
export async function listPaymentMethods(customerId) {
  const paymentMethods = await stripe.paymentMethods.list({
    customer: customerId,
    type: "card",
  });
  return paymentMethods.data;
}
export async function hasPaymentMethod(userId) {
  const customerId = await getStripeCustomerId(userId);
  if (!customerId) return false;
  const methods = await listPaymentMethods(customerId);
  return methods.length > 0;
}
export async function deletePaymentMethod(paymentMethodId) {
  await stripe.paymentMethods.detach(paymentMethodId);
}
export async function setDefaultPaymentMethod(userId, paymentMethodId) {
  const customerId = await getStripeCustomerId(userId);
  if (!customerId) throw new Error("Customer not found");
  await stripe.customers.update(customerId, {
    invoice_settings: {
      default_payment_method: paymentMethodId,
    },
  });
  await db
    .update(stripeCustomers)
    .set({ defaultPaymentMethodId: paymentMethodId })
    .where(eq(stripeCustomers.userId, userId));
}
// --- STRIPE CONNECT FUNCTIONS (for drivers) ---
export async function createConnectAccount(userId, email, name) {
  const [existing] = await db
    .select()
    .from(stripeConnectAccounts)
    .where(eq(stripeConnectAccounts.userId, userId))
    .limit(1);
  if (existing) {
    return { accountId: existing.stripeAccountId, isNew: false };
  }
  const parts = (name || "").split(" ");
  const firstName = parts[0] || "";
  const lastName = parts.slice(1).join(" ") || "";
  const account = await stripe.accounts.create({
    type: "express",
    country: "CA",
    email,
    metadata: { userId },
    business_type: "individual",
    individual: {
      first_name: firstName,
      last_name: lastName,
      email: email,
    },
    business_profile: {
      name: name,
      mcc: "4121", // Taxicabs and Limousines - appropriate for rideshare
      product_description: "Rideshare driver providing transportation services",
      url: "https://hitchly.app", // Pre-fill to skip website question
    },
    capabilities: {
      card_payments: { requested: true },
      transfers: { requested: true },
    },
  });
  await db.insert(stripeConnectAccounts).values({
    userId,
    stripeAccountId: account.id,
    onboardingComplete: false,
    payoutsEnabled: false,
  });
  return { accountId: account.id, isNew: true };
}
export async function createConnectOnboardingLink(
  accountId,
  returnUrl,
  refreshUrl
) {
  const accountLink = await stripe.accountLinks.create({
    account: accountId,
    return_url: returnUrl,
    refresh_url: refreshUrl,
    type: "account_onboarding",
    collection_options: {
      fields: "eventually_due", // Only collect what's absolutely required
    },
  });
  return accountLink.url;
}
export async function getConnectAccountStatus(userId) {
  const [account] = await db
    .select()
    .from(stripeConnectAccounts)
    .where(eq(stripeConnectAccounts.userId, userId))
    .limit(1);
  if (!account) {
    return {
      hasAccount: false,
      accountId: null,
      onboardingComplete: false,
      payoutsEnabled: false,
    };
  }
  try {
    const stripeAccount = await stripe.accounts.retrieve(
      account.stripeAccountId
    );
    const onboardingComplete = stripeAccount.details_submitted ?? false;
    const payoutsEnabled = stripeAccount.payouts_enabled ?? false;
    const chargesEnabled = stripeAccount.charges_enabled ?? false;
    if (
      account.onboardingComplete !== onboardingComplete ||
      account.payoutsEnabled !== payoutsEnabled
    ) {
      await db
        .update(stripeConnectAccounts)
        .set({ onboardingComplete, payoutsEnabled })
        .where(eq(stripeConnectAccounts.userId, userId));
    }
    return {
      hasAccount: true,
      accountId: account.stripeAccountId,
      onboardingComplete,
      payoutsEnabled,
      chargesEnabled,
      requirementsCurrentlyDue: stripeAccount.requirements?.currently_due ?? [],
      requirementsEventuallyDue:
        stripeAccount.requirements?.eventually_due ?? [],
      requirementsDisabledReason:
        stripeAccount.requirements?.disabled_reason ?? null,
    };
  } catch {
    return {
      hasAccount: true,
      accountId: account.stripeAccountId,
      onboardingComplete: account.onboardingComplete,
      payoutsEnabled: account.payoutsEnabled,
    };
  }
}
export function calculateFare(
  distanceKm,
  durationSeconds,
  existingPassengers,
  detourSeconds = 0
) {
  const totalDollars = calculateEstimatedCost(
    distanceKm,
    durationSeconds,
    existingPassengers,
    detourSeconds
  );
  const totalCents = Math.round(totalDollars * 100);
  const platformFeeCents = Math.round(
    totalCents * (PLATFORM_FEE_PERCENT / 100)
  );
  const driverAmountCents = totalCents - platformFeeCents;
  return { totalCents, platformFeeCents, driverAmountCents };
}
/**
 * Create a payment hold (authorization) when driver accepts a request
 */
export async function createPaymentHold(
  tripRequestId,
  riderId,
  driverId,
  amountCents,
  platformFeeCents,
  driverAmountCents
) {
  try {
    const riderCustomerId = await getStripeCustomerId(riderId);
    if (!riderCustomerId) {
      return {
        paymentIntentId: "",
        success: false,
        error: "Rider has no payment method",
      };
    }
    const customer = await stripe.customers.retrieve(riderCustomerId);
    const defaultPaymentMethodId =
      customer.invoice_settings?.default_payment_method;
    const methods = await listPaymentMethods(riderCustomerId);
    if (methods.length === 0) {
      return {
        paymentIntentId: "",
        success: false,
        error: "Rider has no payment method",
      };
    }
    const paymentMethodId = defaultPaymentMethodId || methods[0]?.id;
    const [driverConnect] = await db
      .select()
      .from(stripeConnectAccounts)
      .where(eq(stripeConnectAccounts.userId, driverId))
      .limit(1);
    const paymentIntentParams = {
      amount: amountCents,
      currency: "cad",
      customer: riderCustomerId,
      payment_method: paymentMethodId,
      capture_method: "manual", // Hold, don't capture yet
      confirm: true, // Authorize immediately
      metadata: { tripRequestId, riderId, driverId },
      automatic_payment_methods: {
        enabled: true,
        allow_redirects: "never",
      },
    };
    if (driverConnect?.stripeAccountId && driverConnect.payoutsEnabled) {
      paymentIntentParams.transfer_data = {
        destination: driverConnect.stripeAccountId,
      };
      paymentIntentParams.application_fee_amount = platformFeeCents;
    }
    const paymentIntent =
      await stripe.paymentIntents.create(paymentIntentParams);
    if (paymentIntent.status !== "requires_capture") {
      return {
        paymentIntentId: paymentIntent.id,
        success: false,
        error: `Payment authorization failed: ${paymentIntent.status}`,
      };
    }
    await db.insert(payments).values({
      tripRequestId,
      stripePaymentIntentId: paymentIntent.id,
      amountCents,
      platformFeeCents,
      driverAmountCents,
      status: "authorized",
      authorizedAt: new Date(),
    });
    return { paymentIntentId: paymentIntent.id, success: true };
  } catch (error) {
    console.error("Payment hold failed:", error);
    return {
      paymentIntentId: "",
      success: false,
      error: error.message || "Payment failed",
    };
  }
}
export async function updatePaymentHold(
  tripRequestId,
  newAmountCents,
  newPlatformFeeCents,
  newDriverAmountCents
) {
  try {
    const [existingPayment] = await db
      .select()
      .from(payments)
      .where(eq(payments.tripRequestId, tripRequestId))
      .limit(1);
    if (!existingPayment) {
      return { success: false, error: "Payment record not found" };
    }
    if (existingPayment.status !== "authorized") {
      return {
        success: false,
        error: `Cannot update payment with status: ${existingPayment.status}`,
      };
    }
    // Update the PaymentIntent amount in Stripe
    await stripe.paymentIntents.update(existingPayment.stripePaymentIntentId, {
      amount: newAmountCents,
      transfer_data: {
        amount: newDriverAmountCents,
      },
    });
    await db
      .update(payments)
      .set({
        amountCents: newAmountCents,
        platformFeeCents: newPlatformFeeCents,
        driverAmountCents: newDriverAmountCents,
        updatedAt: new Date(),
      })
      .where(eq(payments.id, existingPayment.id));
    // console.log(`Updated payment hold for request ${tripRequestId}: $${(newAmountCents / 100).toFixed(2)}`);
    return { success: true };
  } catch (error) {
    console.error("Failed to update payment hold:", error);
    return {
      success: false,
      error: error.message || "Failed to update payment",
    };
  }
}
export async function capturePayment(tripRequestId) {
  try {
    const [payment] = await db
      .select()
      .from(payments)
      .where(eq(payments.tripRequestId, tripRequestId))
      .limit(1);
    if (!payment) {
      return { success: false, error: "Payment record not found" };
    }
    if (payment.status !== "authorized") {
      return {
        success: false,
        error: `Cannot capture payment with status: ${payment.status}`,
      };
    }
    await stripe.paymentIntents.capture(payment.stripePaymentIntentId);
    await db
      .update(payments)
      .set({ status: "captured", capturedAt: new Date() })
      .where(eq(payments.id, payment.id));
    return { success: true };
  } catch (error) {
    console.error("Payment capture failed:", error);
    return { success: false, error: error.message || "Capture failed" };
  }
}
export async function cancelPaymentHold(tripRequestId) {
  try {
    // Get payment record
    const [payment] = await db
      .select()
      .from(payments)
      .where(eq(payments.tripRequestId, tripRequestId))
      .limit(1);
    if (!payment) {
      return { success: true };
    }
    if (payment.status === "captured") {
      return { success: false, error: "Cannot cancel captured payment" };
    }
    if (payment.status === "cancelled") {
      return { success: true };
    }
    await stripe.paymentIntents.cancel(payment.stripePaymentIntentId);
    await db
      .update(payments)
      .set({ status: "cancelled", cancelledAt: new Date() })
      .where(eq(payments.id, payment.id));
    return { success: true };
  } catch (error) {
    console.error("Payment cancellation failed:", error);
    return { success: false, error: error.message || "Cancellation failed" };
  }
}
export async function processTip(tripId, riderId, driverId, tipAmountCents) {
  try {
    if (tipAmountCents <= 0) {
      return { success: false, error: "Tip amount must be positive" };
    }
    const riderCustomerId = await getStripeCustomerId(riderId);
    if (!riderCustomerId) {
      return { success: false, error: "Rider has no payment method" };
    }
    const methods = await listPaymentMethods(riderCustomerId);
    if (methods.length === 0) {
      return { success: false, error: "Rider has no payment method" };
    }
    const paymentMethodId = methods[0]?.id;
    if (!paymentMethodId) {
      return { success: false, error: "Rider has no valid payment method" };
    }
    const [driverConnect] = await db
      .select()
      .from(stripeConnectAccounts)
      .where(eq(stripeConnectAccounts.userId, driverId))
      .limit(1);
    const paymentIntentParams = {
      amount: tipAmountCents,
      currency: "cad",
      customer: riderCustomerId,
      payment_method: paymentMethodId,
      confirm: true,
      metadata: { tripId, riderId, driverId, type: "tip" },
      automatic_payment_methods: {
        enabled: true,
        allow_redirects: "never",
      },
    };
    if (driverConnect?.stripeAccountId && driverConnect.payoutsEnabled) {
      paymentIntentParams.transfer_data = {
        destination: driverConnect.stripeAccountId,
        amount: tipAmountCents,
      };
    }
    const paymentIntent =
      await stripe.paymentIntents.create(paymentIntentParams);
    if (paymentIntent.status !== "succeeded") {
      return {
        success: false,
        error: `Tip payment failed: ${paymentIntent.status}`,
      };
    }
    await db.insert(tips).values({
      tripId,
      riderId,
      driverId,
      amountCents: tipAmountCents,
      stripePaymentIntentId: paymentIntent.id,
    });
    return { success: true };
  } catch (error) {
    console.error("Tip processing failed:", error);
    return { success: false, error: error.message || "Tip failed" };
  }
}
export async function getPaymentStatus(tripRequestId) {
  const [payment] = await db
    .select()
    .from(payments)
    .where(eq(payments.tripRequestId, tripRequestId))
    .limit(1);
  if (!payment) return null;
  return {
    status: payment.status,
    amountCents: payment.amountCents,
  };
}
