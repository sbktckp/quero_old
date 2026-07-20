import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

// Return the publishable Razorpay Key ID to the browser. Never expose the secret.
export const getRazorpayPublicKey = createServerFn({ method: "GET" }).handler(async () => {
  const keyId = process.env.RAZORPAY_KEY_ID;
  if (!keyId) throw new Error("Razorpay is not configured.");
  return { keyId };
});

// Validate a coupon against a plan without committing anything.
export const validateCouponForPlan = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((v) => z.object({ code: z.string().min(1), planId: z.string().uuid() }).parse(v))
  .handler(async ({ data, context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { applyCoupon } = await import("./razorpay.server");

    const { data: plan, error: planErr } = await context.supabase
      .from("plans").select("id, price_inr, is_active").eq("id", data.planId).maybeSingle();
    if (planErr || !plan || !plan.is_active) throw new Error("Plan not available");

    const { data: coupon } = await supabaseAdmin
      .from("coupons").select("*").ilike("code", data.code.trim()).maybeSingle();
    if (!coupon) throw new Error("Invalid coupon code");

    const { finalInr } = applyCoupon(Number(plan.price_inr), plan.id, coupon as never);
    return {
      couponId: coupon.id,
      code: coupon.code,
      originalInr: Number(plan.price_inr),
      finalInr,
      discountInr: Math.round((Number(plan.price_inr) - finalInr) * 100) / 100,
    };
  });

// Create a Razorpay order, insert a pending payments row, return { orderId, keyId, amountPaise }.
export const createOrderForPlan = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((v) =>
    z.object({ planId: z.string().uuid(), couponCode: z.string().trim().min(1).optional() }).parse(v),
  )
  .handler(async ({ data, context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { createRazorpayOrder, applyCoupon, razorpayEnv } = await import("./razorpay.server");
    const { keyId } = razorpayEnv();

    // Price comes from DB, never the client.
    const { data: plan, error: planErr } = await context.supabase
      .from("plans")
      .select("id, price_inr, is_active, tier, name, billing_period")
      .eq("id", data.planId).maybeSingle();
    if (planErr || !plan) throw new Error("Plan not found");
    if (!plan.is_active) throw new Error("Plan is not available");
    if (plan.tier === "free" || Number(plan.price_inr) <= 0) throw new Error("This plan cannot be purchased");

    let couponRow: { id: string } | null = null;
    let finalInr = Number(plan.price_inr);
    if (data.couponCode) {
      const { data: coupon } = await supabaseAdmin
        .from("coupons").select("*").ilike("code", data.couponCode).maybeSingle();
      const res = applyCoupon(Number(plan.price_inr), plan.id, (coupon as never) ?? null);
      finalInr = res.finalInr;
      couponRow = coupon ? { id: (coupon as { id: string }).id } : null;
    }

    const amountPaise = Math.round(finalInr * 100);
    if (amountPaise < 100) throw new Error("Amount below minimum ₹1.00");

    const order = await createRazorpayOrder({
      amountPaise,
      receipt: `plan_${plan.id.slice(0, 8)}_${Date.now()}`.slice(0, 40),
      notes: { user_id: context.userId, plan_id: plan.id },
    });

    // Insert pending payments row via admin (RLS restricts user writes on payments).
    const { error: payErr } = await supabaseAdmin.from("payments").insert({
      user_id: context.userId,
      amount: finalInr,
      currency: "INR",
      gateway: "razorpay",
      gateway_order_id: order.id,
      status: "pending",
      coupon_id: couponRow?.id ?? null,
    });
    if (payErr) throw new Error(`Failed to record payment: ${payErr.message}`);

    return {
      orderId: order.id,
      amountPaise,
      keyId,
      planName: plan.name,
      finalInr,
    };
  });

// Verify Razorpay Checkout callback signature. Does NOT grant the subscription.
export const verifyCheckoutCallback = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((v) =>
    z.object({
      razorpay_order_id: z.string().min(1),
      razorpay_payment_id: z.string().min(1),
      razorpay_signature: z.string().min(1),
    }).parse(v),
  )
  .handler(async ({ data }) => {
    const { verifyCheckoutSignature } = await import("./razorpay.server");
    const ok = verifyCheckoutSignature(data.razorpay_order_id, data.razorpay_payment_id, data.razorpay_signature);
    if (!ok) throw new Error("Invalid payment signature");
    return { ok: true };
  });
