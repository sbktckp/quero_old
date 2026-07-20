import { createFileRoute } from "@tanstack/react-router";

// Public webhook endpoint. `/api/public/*` bypasses Lovable's published-site auth.
// Security lives in this handler: verify HMAC over the RAW body before any DB write.
export const Route = createFileRoute("/api/razorpay-webhook")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const { verifyWebhookSignature, endDateForPeriod } = await import("@/lib/razorpay.server");
        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

        // CRITICAL: verify signature over the RAW body bytes, not a re-serialized JSON.
        const rawBody = await request.text();
        const signature = request.headers.get("x-razorpay-signature");
        if (!verifyWebhookSignature(rawBody, signature)) {
          return new Response("Invalid signature", { status: 401 });
        }

        let event: {
          event: string;
          payload?: {
            payment?: { entity?: RzpPayment };
            order?: { entity?: { id: string } };
          };
        };
        try {
          event = JSON.parse(rawBody);
        } catch {
          return new Response("Invalid JSON", { status: 400 });
        }

        const payment = event.payload?.payment?.entity ?? null;
        const orderId = payment?.order_id ?? event.payload?.order?.entity?.id ?? null;
        const paymentId = payment?.id ?? null;

        if (!orderId) return new Response("ok"); // ignore unrelated events

        // Idempotency: if this gateway_payment_id already exists as success/failed, ack and stop.
        if (paymentId) {
          const { data: existing } = await supabaseAdmin
            .from("payments")
            .select("id, status")
            .eq("gateway_payment_id", paymentId)
            .maybeSingle();
          if (existing && (existing.status === "success" || existing.status === "failed")) {
            return new Response("ok"); // already processed
          }
        }

        // Locate the pending payments row created at order-creation time.
        const { data: pending } = await supabaseAdmin
          .from("payments")
          .select("id, user_id, status, amount, coupon_id")
          .eq("gateway_order_id", orderId)
          .maybeSingle();

        if (!pending) return new Response("ok"); // unknown order — ignore

        const evt = event.event;
        const isSuccess = evt === "payment.captured" || evt === "order.paid";
        const isFailure = evt === "payment.failed";

        if (!isSuccess && !isFailure) return new Response("ok");

        if (isFailure) {
          if (pending.status !== "success") {
            await supabaseAdmin.from("payments").update({
              status: "failed",
              gateway_payment_id: paymentId,
              updated_at: new Date().toISOString(),
            }).eq("id", pending.id);
          }
          return new Response("ok");
        }

        // Success path — activate subscription.
        // Order notes carry plan_id from createOrderForPlan.
        const planId = (payment?.notes?.plan_id as string | undefined)
          ?? (event.payload?.order?.entity as unknown as { notes?: { plan_id?: string } } | undefined)?.notes?.plan_id;
        if (!planId) return new Response("ok");

        const { data: plan } = await supabaseAdmin
          .from("plans").select("id, billing_period").eq("id", planId).maybeSingle();
        if (!plan) return new Response("ok");

        const now = new Date();
        const endDate = endDateForPeriod(plan.billing_period, now);

        // Cancel existing active subs, create the new one.
        await supabaseAdmin
          .from("subscriptions")
          .update({ status: "cancelled", updated_at: now.toISOString() })
          .eq("user_id", pending.user_id)
          .eq("status", "active");

        const { data: sub, error: subErr } = await supabaseAdmin
          .from("subscriptions")
          .insert({
            user_id: pending.user_id,
            plan_id: plan.id,
            status: "active",
            start_date: now.toISOString(),
            end_date: endDate,
            granted_by: null,
          })
          .select("id")
          .single();
        if (subErr) return new Response(`Sub error: ${subErr.message}`, { status: 500 });

        await supabaseAdmin.from("payments").update({
          status: "success",
          gateway_payment_id: paymentId,
          subscription_id: sub.id,
          updated_at: now.toISOString(),
        }).eq("id", pending.id);

        // Increment coupon usage exactly once, on success.
        if (pending.coupon_id) {
          const { data: c } = await supabaseAdmin
            .from("coupons").select("times_used").eq("id", pending.coupon_id).maybeSingle();
          if (c) {
            await supabaseAdmin.from("coupons")
              .update({ times_used: Number(c.times_used ?? 0) + 1 })
              .eq("id", pending.coupon_id);
          }
        }

        return new Response("ok");
      },
    },
  },
});

type RzpPayment = {
  id: string;
  order_id: string;
  status?: string;
  notes?: Record<string, string>;
};
