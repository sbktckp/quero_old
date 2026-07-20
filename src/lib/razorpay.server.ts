// Server-only Razorpay helpers. Never import from client-reachable code.
// This file's name ends in .server.ts so the import guard keeps it out of the browser bundle.
import { createHmac, timingSafeEqual } from "crypto";

export function razorpayEnv() {
  const keyId = process.env.RAZORPAY_KEY_ID;
  const keySecret = process.env.RAZORPAY_KEY_SECRET;
  const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET;
  if (!keyId || !keySecret) {
    throw new Error("Razorpay is not configured: set RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET.");
  }
  return { keyId, keySecret, webhookSecret };
}

export async function createRazorpayOrder(params: {
  amountPaise: number;
  receipt: string;
  notes?: Record<string, string>;
}) {
  const { keyId, keySecret } = razorpayEnv();
  const res = await fetch("https://api.razorpay.com/v1/orders", {
    method: "POST",
    headers: {
      Authorization: "Basic " + Buffer.from(`${keyId}:${keySecret}`).toString("base64"),
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      amount: params.amountPaise,
      currency: "INR",
      receipt: params.receipt,
      notes: params.notes ?? {},
    }),
  });
  const text = await res.text();
  if (!res.ok) throw new Error(`Razorpay order failed: ${res.status} ${text}`);
  return JSON.parse(text) as { id: string; amount: number; currency: string; status: string };
}

// Verify Checkout callback signature: HMAC-SHA256(order_id + "|" + payment_id, keySecret).
export function verifyCheckoutSignature(orderId: string, paymentId: string, signature: string): boolean {
  const { keySecret } = razorpayEnv();
  const expected = createHmac("sha256", keySecret).update(`${orderId}|${paymentId}`).digest("hex");
  return safeEq(expected, signature);
}

// Verify webhook signature: HMAC-SHA256(rawBody, webhookSecret).
export function verifyWebhookSignature(rawBody: string, signature: string | null): boolean {
  const { webhookSecret } = razorpayEnv();
  if (!webhookSecret || !signature) return false;
  const expected = createHmac("sha256", webhookSecret).update(rawBody).digest("hex");
  return safeEq(expected, signature);
}

function safeEq(a: string, b: string): boolean {
  const ab = Buffer.from(a);
  const bb = Buffer.from(b);
  if (ab.length !== bb.length) return false;
  return timingSafeEqual(ab, bb);
}

export function endDateForPeriod(billingPeriod: string, from = new Date()): string | null {
  const d = new Date(from);
  switch (billingPeriod) {
    case "monthly": d.setMonth(d.getMonth() + 1); return d.toISOString();
    case "quarterly": d.setMonth(d.getMonth() + 3); return d.toISOString();
    case "yearly": d.setFullYear(d.getFullYear() + 1); return d.toISOString();
    case "lifetime": return null;
    default: d.setMonth(d.getMonth() + 1); return d.toISOString();
  }
}

export type CouponRow = {
  id: string; code: string; discount_type: string; discount_value: number;
  is_active: boolean; expires_at: string | null; min_purchase: number | null;
  plan_restriction: string | null; times_used: number; usage_limit: number | null;
};

// Returns discounted price (INR) and coupon row, or throws with user-facing message.
export function applyCoupon(priceInr: number, planId: string, coupon: CouponRow | null): { finalInr: number; coupon: CouponRow | null } {
  if (!coupon) return { finalInr: priceInr, coupon: null };
  if (!coupon.is_active) throw new Error("Coupon is not active");
  if (coupon.expires_at && new Date(coupon.expires_at) < new Date()) throw new Error("Coupon has expired");
  if (coupon.usage_limit != null && coupon.times_used >= coupon.usage_limit) throw new Error("Coupon usage limit reached");
  if (coupon.plan_restriction && coupon.plan_restriction !== planId) throw new Error("Coupon is not valid for this plan");
  if (coupon.min_purchase != null && priceInr < Number(coupon.min_purchase)) {
    throw new Error(`Coupon requires a minimum purchase of ₹${coupon.min_purchase}`);
  }
  let final: number;
  if (coupon.discount_type === "percentage") {
    final = Math.max(0, priceInr - (priceInr * Number(coupon.discount_value)) / 100);
  } else {
    final = Math.max(0, priceInr - Number(coupon.discount_value));
  }
  final = Math.round(final * 100) / 100;
  return { finalInr: final, coupon };
}
