import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

const SESSION_TYPES = ["quick_chat", "audio_call", "video_call", "premium_counselling"] as const;

// Create a Razorpay order for a mentor session. Price + commission always come
// from the DB, never from the client.
export const createMentorSessionOrder = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((v) =>
    z
      .object({
        mentorId: z.string().uuid(),
        sessionType: z.enum(SESSION_TYPES),
        scheduledAt: z.string().min(1),
        notes: z.string().max(1000).optional(),
      })
      .parse(v),
  )
  .handler(async ({ data, context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { createRazorpayOrder, razorpayEnv } = await import("./razorpay.server");
    const { keyId } = razorpayEnv();

    const { data: mentor } = await context.supabase
      .from("mentors")
      .select("id, full_name, verification_status, is_active")
      .eq("id", data.mentorId)
      .maybeSingle();
    if (!mentor || mentor.verification_status !== "verified" || !mentor.is_active) {
      throw new Error("This mentor is not available for booking");
    }

    const { data: pricing } = await context.supabase
      .from("mentor_session_pricing")
      .select("session_type, label, duration_minutes, price_inr, commission_percent, is_active")
      .eq("session_type", data.sessionType)
      .maybeSingle();
    if (!pricing || !pricing.is_active) throw new Error("This session type is not available");

    const amount = Number(pricing.price_inr);
    const amountPaise = Math.round(amount * 100);
    if (amountPaise < 100) throw new Error("Amount below minimum ₹1.00");

    const commission = Math.round(((amount * Number(pricing.commission_percent)) / 100) * 100) / 100;
    const mentorAmount = Math.round((amount - commission) * 100) / 100;

    const { data: session, error: sessErr } = await supabaseAdmin
      .from("mentor_sessions")
      .insert({
        mentor_id: mentor.id,
        student_id: context.userId,
        session_type: data.sessionType,
        scheduled_at: new Date(data.scheduledAt).toISOString(),
        duration_minutes: pricing.duration_minutes,
        amount,
        commission,
        mentor_amount: mentorAmount,
        notes: data.notes ?? null,
        status: "pending",
        payment_status: "pending",
      })
      .select("id")
      .single();
    if (sessErr) throw new Error(`Could not create booking: ${sessErr.message}`);

    const order = await createRazorpayOrder({
      amountPaise,
      receipt: `ms_${session.id.slice(0, 8)}_${Date.now()}`.slice(0, 40),
      notes: { kind: "mentor_session", session_id: session.id, user_id: context.userId },
    });

    await supabaseAdmin.from("mentor_sessions").update({ gateway_order_id: order.id }).eq("id", session.id);

    const { error: payErr } = await supabaseAdmin.from("payments").insert({
      user_id: context.userId,
      amount,
      currency: "INR",
      gateway: "razorpay",
      gateway_order_id: order.id,
      status: "pending",
    });
    if (payErr) throw new Error(`Failed to record payment: ${payErr.message}`);

    return {
      sessionId: session.id,
      orderId: order.id,
      amountPaise,
      keyId,
      label: pricing.label,
      durationMinutes: pricing.duration_minutes,
      mentorName: mentor.full_name,
    };
  });

// Verify the Checkout callback signature. Confirmation itself comes from the webhook.
export const verifyMentorSessionPayment = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((v) =>
    z
      .object({
        razorpay_order_id: z.string().min(1),
        razorpay_payment_id: z.string().min(1),
        razorpay_signature: z.string().min(1),
      })
      .parse(v),
  )
  .handler(async ({ data }) => {
    const { verifyCheckoutSignature } = await import("./razorpay.server");
    const ok = verifyCheckoutSignature(
      data.razorpay_order_id,
      data.razorpay_payment_id,
      data.razorpay_signature,
    );
    if (!ok) throw new Error("Invalid payment signature");
    return { ok: true };
  });
