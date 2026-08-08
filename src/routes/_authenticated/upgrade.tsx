import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { BottomNav } from "@/components/bottom-nav";
import { toast } from "sonner";
import { Loader2, Check, Sparkles, Tag, X } from "lucide-react";
import {
  createOrderForPlan,
  verifyCheckoutCallback,
  validateCouponForPlan,
} from "@/lib/razorpay.functions";

export const Route = createFileRoute("/_authenticated/pricing")({
  head: () => ({
    meta: [
      { title: "Pricing — Quero" },
      { name: "description", content: "Upgrade to Quero Premium or Pro to unlock unlimited practice, PYQs, and AI doubt solving." },
    ],
  }),
  component: PricingPage,
});

type Plan = {
  id: string; name: string; tier: string;
  billing_period: "monthly" | "quarterly" | "yearly" | "lifetime";
  price_inr: number; is_active: boolean;
};

declare global {
  interface Window { Razorpay?: new (opts: unknown) => { open: () => void } }
}

function loadRazorpayScript(): Promise<boolean> {
  return new Promise((resolve) => {
    if (typeof window === "undefined") return resolve(false);
    if (window.Razorpay) return resolve(true);
    const s = document.createElement("script");
    s.src = "https://checkout.razorpay.com/v1/checkout.js";
    s.onload = () => resolve(true);
    s.onerror = () => resolve(false);
    document.body.appendChild(s);
  });
}

function PricingPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const qc = useQueryClient();

  const createOrder = useServerFn(createOrderForPlan);
  const verifyCallback = useServerFn(verifyCheckoutCallback);
  const validateCoupon = useServerFn(validateCouponForPlan);

  const [couponCode, setCouponCode] = useState("");
  const [couponInfo, setCouponInfo] = useState<null | { code: string; finalInr: number; discountInr: number; originalInr: number }>(null);
  const [pendingPlanId, setPendingPlanId] = useState<string | null>(null);
  const [confirmingOrderId, setConfirmingOrderId] = useState<string | null>(null);
  const pollRef = useRef<number | null>(null);

  const { data: plans = [], isLoading, error } = useQuery({
    queryKey: ["pricing-plans"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("plans").select("*").eq("is_active", true)
        .order("price_inr", { ascending: true });
      if (error) throw error;
      return (data ?? []) as Plan[];
    },
  });

  const { data: activeSub } = useQuery({
    queryKey: ["my-active-sub", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data } = await supabase
        .from("subscriptions")
        .select("id, plan_id, status, end_date, plans(name, tier)")
        .eq("user_id", user!.id).eq("status", "active")
        .order("created_at", { ascending: false }).limit(1).maybeSingle();
      return data;
    },
  });

  useEffect(() => () => { if (pollRef.current) window.clearInterval(pollRef.current); }, []);

  const paidPlans = useMemo(() => plans.filter((p) => p.tier !== "free" && Number(p.price_inr) > 0), [plans]);
  const freePlan = useMemo(() => plans.find((p) => p.tier === "free"), [plans]);

  const startConfirmationPolling = (previousSubId: string | null | undefined) => {
    if (pollRef.current) window.clearInterval(pollRef.current);
    let ticks = 0;
    pollRef.current = window.setInterval(async () => {
      ticks++;
      const { data } = await supabase
        .from("subscriptions")
        .select("id, plan_id, status, plans(name, tier)")
        .eq("user_id", user!.id).eq("status", "active")
        .order("created_at", { ascending: false }).limit(1).maybeSingle();
      if (data && data.id !== previousSubId) {
        window.clearInterval(pollRef.current!); pollRef.current = null;
        setConfirmingOrderId(null); setPendingPlanId(null);
        qc.invalidateQueries({ queryKey: ["my-active-sub"] });
        const planName = (data as unknown as { plans?: { name?: string } }).plans?.name ?? "Premium";
        toast.success(`You're on ${planName}!`);
      }
      if (ticks > 40) { // ~80s timeout
        window.clearInterval(pollRef.current!); pollRef.current = null;
        setConfirmingOrderId(null);
        toast.message("Still processing — we'll update your account as soon as the payment confirms.");
      }
    }, 2000);
  };

  const handleBuy = async (plan: Plan) => {
    if (!user) { navigate({ to: "/auth" }); return; }
    setPendingPlanId(plan.id);
    try {
      const scriptOk = await loadRazorpayScript();
      if (!scriptOk) throw new Error("Failed to load payment SDK. Check your connection.");

      const order = await createOrder({
        data: { planId: plan.id, couponCode: couponInfo?.code },
      });

      const previousSubId = activeSub?.id ?? null;

      const rzp = new window.Razorpay!({
        key: order.keyId,
        amount: order.amountPaise,
        currency: "INR",
        name: "Quero",
        description: order.planName,
        order_id: order.orderId,
        prefill: { email: user.email ?? undefined, name: user.user_metadata?.display_name ?? undefined },
        theme: { color: "#6C4FF0" },
        handler: async (resp: { razorpay_order_id: string; razorpay_payment_id: string; razorpay_signature: string }) => {
          try {
            await verifyCallback({ data: resp });
            setConfirmingOrderId(order.orderId);
            toast.success("Payment received, activating your plan…");
            startConfirmationPolling(previousSubId);
          } catch (e) {
            toast.error((e as Error).message || "Payment verification failed");
            setPendingPlanId(null);
          }
        },
        modal: {
          ondismiss: () => {
            setPendingPlanId(null);
            toast.info("Checkout cancelled");
          },
        },
      });
      rzp.open();
    } catch (e) {
      toast.error((e as Error).message || "Could not start checkout");
      setPendingPlanId(null);
    }
  };

  return (
    <div className="min-h-screen bg-background pb-24">
      <header className="sticky top-0 bg-background/95 backdrop-blur border-b border-border">
        <div className="mx-auto max-w-lg px-5 py-3.5">
          <h1 className="font-bold text-lg">Upgrade</h1>
          <p className="text-xs text-muted-foreground">Unlock everything Quero has to offer</p>
        </div>
      </header>

      <main className="mx-auto max-w-lg px-5 py-5 space-y-5">
        {activeSub && (
          <div className="rounded-2xl border border-primary/30 bg-primary-soft p-4 flex items-center gap-3">
            <Sparkles className="text-primary" size={20} />
            <div className="text-sm">
              <div className="font-semibold">You're on {(activeSub as unknown as { plans?: { name?: string } }).plans?.name ?? "a paid plan"}</div>
              {activeSub.end_date && <div className="text-xs text-muted-foreground">Renews / expires {new Date(activeSub.end_date).toLocaleDateString()}</div>}
            </div>
          </div>
        )}

        {isLoading && <div className="flex justify-center py-8"><Loader2 className="animate-spin" /></div>}
        {error && <div className="rounded-xl border border-destructive/30 bg-destructive/5 text-destructive text-sm p-4">Couldn't load plans. Please try again.</div>}

        <div className="rounded-2xl border border-border bg-card p-4 space-y-3">
          <div className="text-xs uppercase tracking-wider text-muted-foreground flex items-center gap-1.5"><Tag size={13} /> Have a coupon?</div>
          {couponInfo ? (
            <div className="flex items-center justify-between rounded-xl bg-primary-soft px-3 py-2 text-sm">
              <div>
                <span className="font-semibold">{couponInfo.code}</span>
                <span className="text-muted-foreground"> — you save ₹{couponInfo.discountInr.toLocaleString("en-IN")}</span>
              </div>
              <button onClick={() => { setCouponInfo(null); setCouponCode(""); }} className="text-muted-foreground"><X size={16} /></button>
            </div>
          ) : (
            <div className="flex gap-2">
              <input
                value={couponCode}
                onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
                placeholder="Enter code"
                className="flex-1 rounded-xl border border-border bg-background px-3 py-2 text-sm"
              />
              <button
                disabled={!couponCode.trim() || paidPlans.length === 0}
                onClick={async () => {
                  const target = paidPlans[0];
                  if (!target) return;
                  try {
                    const info = await validateCoupon({ data: { code: couponCode.trim(), planId: target.id } });
                    setCouponInfo(info);
                    toast.success("Coupon applied");
                  } catch (e) { toast.error((e as Error).message); }
                }}
                className="rounded-xl bg-primary text-primary-foreground px-4 py-2 text-sm font-semibold disabled:opacity-50"
              >Apply</button>
            </div>
          )}
        </div>

        {freePlan && (
          <PlanCard plan={freePlan} isCurrent={activeSub?.plan_id === freePlan.id} isFree onBuy={() => {}} loading={false} />
        )}

        {paidPlans.map((plan) => {
          const discounted = couponInfo ? couponInfo.finalInr : null;
          return (
            <PlanCard
              key={plan.id}
              plan={plan}
              isCurrent={activeSub?.plan_id === plan.id}
              discountedInr={discounted}
              loading={pendingPlanId === plan.id || confirmingOrderId !== null}
              onBuy={() => handleBuy(plan)}
              confirming={confirmingOrderId !== null && pendingPlanId === plan.id}
            />
          );
        })}

        {!isLoading && plans.length === 0 && (
          <div className="text-sm text-muted-foreground text-center py-8">No plans available yet.</div>
        )}
      </main>

      <BottomNav />
    </div>
  );
}

function PlanCard({ plan, isCurrent, isFree, discountedInr, onBuy, loading, confirming }: {
  plan: Plan;
  isCurrent: boolean;
  isFree?: boolean;
  discountedInr?: number | null;
  onBuy: () => void;
  loading: boolean;
  confirming?: boolean;
}) {
  const showDiscount = discountedInr != null && discountedInr < Number(plan.price_inr);
  return (
    <div className={`rounded-3xl border p-5 shadow-card ${isCurrent ? "border-primary bg-primary-soft" : "border-border bg-card"}`}>
      <div className="flex items-center justify-between mb-1">
        <div className="font-bold text-lg">{plan.name}</div>
        <span className="text-[10px] uppercase tracking-wider font-semibold rounded-full bg-muted px-2 py-0.5">{plan.tier}</span>
      </div>
      <div className="flex items-baseline gap-2 mb-3">
        {showDiscount ? (
          <>
            <span className="text-2xl font-extrabold">₹{discountedInr!.toLocaleString("en-IN")}</span>
            <span className="text-sm text-muted-foreground line-through">₹{Number(plan.price_inr).toLocaleString("en-IN")}</span>
          </>
        ) : (
          <span className="text-2xl font-extrabold">₹{Number(plan.price_inr).toLocaleString("en-IN")}</span>
        )}
        <span className="text-sm text-muted-foreground">/ {plan.billing_period}</span>
      </div>

      {isCurrent ? (
        <div className="rounded-2xl bg-background border border-primary text-primary text-sm font-semibold px-4 py-3 text-center flex items-center justify-center gap-2">
          <Check size={16} /> Current plan
        </div>
      ) : isFree ? (
        <div className="text-xs text-muted-foreground">Included by default.</div>
      ) : (
        <button
          disabled={loading}
          onClick={onBuy}
          className="w-full rounded-2xl gradient-primary text-primary-foreground font-semibold px-4 py-3 shadow-card disabled:opacity-70 flex items-center justify-center gap-2"
        >
          {confirming ? (<><Loader2 className="animate-spin" size={16} /> Activating…</>)
            : loading ? (<><Loader2 className="animate-spin" size={16} /> Please wait…</>)
            : "Upgrade"}
        </button>
      )}
    </div>
  );
}
