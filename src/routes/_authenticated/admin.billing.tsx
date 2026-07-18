import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { logAdminAction } from "@/lib/admin-log";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Search, Plus, Pencil, Ban, CheckCircle2, RefreshCcw } from "lucide-react";

export const Route = createFileRoute("/_authenticated/admin/billing")({
  component: BillingPage,
});

type Plan = {
  id: string; name: string; tier: "free" | "premium" | "pro";
  billing_period: "monthly" | "quarterly" | "yearly" | "lifetime";
  price_inr: number; is_active: boolean;
};
type Coupon = {
  id: string; code: string; discount_type: "percentage" | "fixed"; discount_value: number;
  expires_at: string | null; usage_limit: number | null; times_used: number;
  min_purchase: number | null; plan_restriction: string | null; is_active: boolean;
};

const TABS = ["Plans", "Coupons", "Subscriptions", "Payments"] as const;
type Tab = typeof TABS[number];

function BillingPage() {
  const [tab, setTab] = useState<Tab>("Plans");
  return (
    <div className="space-y-5">
      <StatCards />
      <div className="flex gap-1 overflow-x-auto">
        {TABS.map((t) => (
          <button key={t} onClick={() => setTab(t)}
            className={`shrink-0 rounded-full px-3.5 py-1.5 text-xs font-semibold border ${tab === t ? "gradient-primary text-primary-foreground border-transparent" : "bg-card border-border"}`}>
            {t}
          </button>
        ))}
      </div>
      {tab === "Plans" && <PlansTab />}
      {tab === "Coupons" && <CouponsTab />}
      {tab === "Subscriptions" && <SubscriptionsTab />}
      {tab === "Payments" && <PaymentsTab />}
    </div>
  );
}

function StatCards() {
  const revenue = useQuery({
    queryKey: ["billing-revenue"],
    queryFn: async () => {
      const { data, error } = await supabase.from("payments").select("amount").eq("status", "success");
      if (error) throw error;
      return (data ?? []).reduce((s, r) => s + Number(r.amount || 0), 0);
    },
  });
  const useTierCount = (tier: "premium" | "pro") => useQuery({
    queryKey: ["billing-tier-count", tier],
    queryFn: async () => {
      const { data: planIds } = await supabase.from("plans").select("id").eq("tier", tier);
      const ids = (planIds ?? []).map((p) => p.id);
      if (ids.length === 0) return 0;
      const { count, error } = await supabase.from("subscriptions").select("*", { count: "exact", head: true })
        .eq("status", "active").in("plan_id", ids);
      if (error) throw error;
      return count ?? 0;
    },
  });
  const premium = useTierCount("premium");
  const pro = useTierCount("pro");
  const totalUsers = useQuery({
    queryKey: ["billing-total-users"],
    queryFn: async () => {
      const { count, error } = await supabase.from("profiles").select("*", { count: "exact", head: true });
      if (error) throw error;
      return count ?? 0;
    },
  });
  const freeCount = (totalUsers.data ?? 0) - (premium.data ?? 0) - (pro.data ?? 0);
  const cards = [
    { label: "Total revenue", value: `₹${(revenue.data ?? 0).toLocaleString("en-IN")}` },
    { label: "Premium users", value: premium.data ?? "—" },
    { label: "Pro users", value: pro.data ?? "—" },
    { label: "Free users", value: Math.max(0, freeCount) },
  ];
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
      {cards.map((c) => (
        <div key={c.label} className="rounded-2xl bg-card border border-border p-4 shadow-card">
          <div className="text-2xl font-bold">{c.value}</div>
          <div className="text-xs text-muted-foreground mt-0.5">{c.label}</div>
        </div>
      ))}
    </div>
  );
}

/* ---------------- Plans ---------------- */
function PlansTab() {
  const qc = useQueryClient();
  const { user } = useAuth();
  const { data = [], isLoading } = useQuery({
    queryKey: ["admin-plans"],
    queryFn: async () => {
      const { data, error } = await supabase.from("plans").select("*").order("created_at", { ascending: false });
      if (error) throw error;
      return data as Plan[];
    },
  });
  const [editing, setEditing] = useState<Plan | null>(null);
  const [open, setOpen] = useState(false);

  const toggleActive = useMutation({
    mutationFn: async (p: Plan) => {
      const { error } = await supabase.from("plans").update({ is_active: !p.is_active }).eq("id", p.id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin-plans"] }),
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="space-y-3">
      <div className="flex justify-end">
        <Button onClick={() => { setEditing(null); setOpen(true); }} className="gap-1"><Plus size={16} /> New plan</Button>
      </div>
      <div className="rounded-2xl bg-card border border-border shadow-card overflow-hidden">
        {isLoading ? <div className="p-6 text-sm text-muted-foreground">Loading…</div>
          : data.length === 0 ? <div className="p-6 text-sm text-muted-foreground">No plans yet.</div>
          : <ul className="divide-y divide-border">
              {data.map((p) => (
                <li key={p.id} className="flex items-center justify-between px-4 py-3">
                  <div>
                    <div className="text-sm font-medium">{p.name} <Badge variant="secondary" className="ml-2">{p.tier}</Badge></div>
                    <div className="text-xs text-muted-foreground">{p.billing_period} · ₹{Number(p.price_inr).toLocaleString("en-IN")}</div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant={p.is_active ? "default" : "secondary"}>{p.is_active ? "active" : "disabled"}</Badge>
                    <Button size="sm" variant="ghost" onClick={() => { setEditing(p); setOpen(true); }}><Pencil size={14} /></Button>
                    <Button size="sm" variant="ghost" onClick={() => toggleActive.mutate(p)}>
                      {p.is_active ? <Ban size={14} /> : <CheckCircle2 size={14} />}
                    </Button>
                  </div>
                </li>
              ))}
            </ul>}
      </div>
      <PlanDialog open={open} onOpenChange={setOpen} plan={editing} adminId={user?.id ?? null} />
    </div>
  );
}

function PlanDialog({ open, onOpenChange, plan, adminId }: { open: boolean; onOpenChange: (v: boolean) => void; plan: Plan | null; adminId: string | null }) {
  const qc = useQueryClient();
  const [name, setName] = useState(plan?.name ?? "");
  const [tier, setTier] = useState<Plan["tier"]>(plan?.tier ?? "premium");
  const [period, setPeriod] = useState<Plan["billing_period"]>(plan?.billing_period ?? "monthly");
  const [price, setPrice] = useState<string>(plan ? String(plan.price_inr) : "0");

  // reset when plan changes
  useEffect(() => {
    setName(plan?.name ?? "");
    setTier(plan?.tier ?? "premium");
    setPeriod(plan?.billing_period ?? "monthly");
    setPrice(plan ? String(plan.price_inr) : "0");
  }, [plan]);

  const save = useMutation({
    mutationFn: async () => {
      const payload = { name: name.trim(), tier, billing_period: period, price_inr: Number(price) || 0 };
      if (plan) {
        const { error } = await supabase.from("plans").update(payload).eq("id", plan.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("plans").insert({ ...payload, created_by: adminId });
        if (error) throw error;
      }
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["admin-plans"] }); onOpenChange(false); toast.success("Plan saved"); },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader><DialogTitle>{plan ? "Edit plan" : "New plan"}</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div><Label>Name</Label><Input value={name} onChange={(e) => setName(e.target.value)} /></div>
          <div className="grid grid-cols-2 gap-3">
            <div><Label>Tier</Label>
              <Select value={tier} onValueChange={(v) => setTier(v as Plan["tier"])}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="free">Free</SelectItem>
                  <SelectItem value="premium">Premium</SelectItem>
                  <SelectItem value="pro">Pro</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div><Label>Billing period</Label>
              <Select value={period} onValueChange={(v) => setPeriod(v as Plan["billing_period"])}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="monthly">Monthly</SelectItem>
                  <SelectItem value="quarterly">Quarterly</SelectItem>
                  <SelectItem value="yearly">Yearly</SelectItem>
                  <SelectItem value="lifetime">Lifetime</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div><Label>Price (₹)</Label><Input type="number" value={price} onChange={(e) => setPrice(e.target.value)} /></div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={() => save.mutate()} disabled={!name.trim() || save.isPending}>Save</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/* ---------------- Coupons ---------------- */
function CouponsTab() {
  const qc = useQueryClient();
  const { data = [], isLoading } = useQuery({
    queryKey: ["admin-coupons"],
    queryFn: async () => {
      const { data, error } = await supabase.from("coupons").select("*").order("created_at", { ascending: false });
      if (error) throw error;
      return data as Coupon[];
    },
  });
  const { data: plans = [] } = useQuery({
    queryKey: ["admin-plans-for-coupons"],
    queryFn: async () => {
      const { data, error } = await supabase.from("plans").select("id, name").eq("is_active", true);
      if (error) throw error;
      return data as { id: string; name: string }[];
    },
  });
  const [editing, setEditing] = useState<Coupon | null>(null);
  const [open, setOpen] = useState(false);
  const toggleActive = useMutation({
    mutationFn: async (c: Coupon) => {
      const { error } = await supabase.from("coupons").update({ is_active: !c.is_active }).eq("id", c.id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin-coupons"] }),
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="space-y-3">
      <div className="flex justify-end">
        <Button onClick={() => { setEditing(null); setOpen(true); }} className="gap-1"><Plus size={16} /> New coupon</Button>
      </div>
      <div className="rounded-2xl bg-card border border-border shadow-card overflow-hidden">
        {isLoading ? <div className="p-6 text-sm text-muted-foreground">Loading…</div>
          : data.length === 0 ? <div className="p-6 text-sm text-muted-foreground">No coupons yet.</div>
          : <ul className="divide-y divide-border">
              {data.map((c) => (
                <li key={c.id} className="flex items-center justify-between px-4 py-3">
                  <div>
                    <div className="text-sm font-medium font-mono">{c.code}</div>
                    <div className="text-xs text-muted-foreground">
                      {c.discount_type === "percentage" ? `${c.discount_value}% off` : `₹${c.discount_value} off`}
                      {c.expires_at ? ` · expires ${new Date(c.expires_at).toLocaleDateString()}` : ""}
                      {c.usage_limit ? ` · ${c.times_used}/${c.usage_limit} used` : ""}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant={c.is_active ? "default" : "secondary"}>{c.is_active ? "active" : "disabled"}</Badge>
                    <Button size="sm" variant="ghost" onClick={() => { setEditing(c); setOpen(true); }}><Pencil size={14} /></Button>
                    <Button size="sm" variant="ghost" onClick={() => toggleActive.mutate(c)}>
                      {c.is_active ? <Ban size={14} /> : <CheckCircle2 size={14} />}
                    </Button>
                  </div>
                </li>
              ))}
            </ul>}
      </div>
      <CouponDialog open={open} onOpenChange={setOpen} coupon={editing} plans={plans} />
    </div>
  );
}

function CouponDialog({ open, onOpenChange, coupon, plans }: { open: boolean; onOpenChange: (v: boolean) => void; coupon: Coupon | null; plans: { id: string; name: string }[] }) {
  const qc = useQueryClient();
  const [code, setCode] = useState(coupon?.code ?? "");
  const [type, setType] = useState<Coupon["discount_type"]>(coupon?.discount_type ?? "percentage");
  const [value, setValue] = useState(String(coupon?.discount_value ?? "10"));
  const [expires, setExpires] = useState(coupon?.expires_at ? coupon.expires_at.slice(0, 10) : "");
  const [limit, setLimit] = useState(coupon?.usage_limit ? String(coupon.usage_limit) : "");
  const [minP, setMinP] = useState(coupon?.min_purchase ? String(coupon.min_purchase) : "");
  const [planId, setPlanId] = useState<string>(coupon?.plan_restriction ?? "none");

  useEffect(() => {
    setCode(coupon?.code ?? "");
    setType(coupon?.discount_type ?? "percentage");
    setValue(String(coupon?.discount_value ?? "10"));
    setExpires(coupon?.expires_at ? coupon.expires_at.slice(0, 10) : "");
    setLimit(coupon?.usage_limit ? String(coupon.usage_limit) : "");
    setMinP(coupon?.min_purchase ? String(coupon.min_purchase) : "");
    setPlanId(coupon?.plan_restriction ?? "none");
  }, [coupon]);

  const save = useMutation({
    mutationFn: async () => {
      const payload = {
        code: code.trim().toUpperCase(),
        discount_type: type,
        discount_value: Number(value) || 0,
        expires_at: expires ? new Date(expires).toISOString() : null,
        usage_limit: limit ? Number(limit) : null,
        min_purchase: minP ? Number(minP) : null,
        plan_restriction: planId === "none" ? null : planId,
      };
      if (coupon) {
        const { error } = await supabase.from("coupons").update(payload).eq("id", coupon.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("coupons").insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["admin-coupons"] }); onOpenChange(false); toast.success("Coupon saved"); },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader><DialogTitle>{coupon ? "Edit coupon" : "New coupon"}</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div><Label>Code</Label><Input value={code} onChange={(e) => setCode(e.target.value)} className="font-mono uppercase" /></div>
          <div className="grid grid-cols-2 gap-3">
            <div><Label>Type</Label>
              <Select value={type} onValueChange={(v) => setType(v as Coupon["discount_type"])}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="percentage">Percentage %</SelectItem>
                  <SelectItem value="fixed">Fixed ₹</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div><Label>Value</Label><Input type="number" value={value} onChange={(e) => setValue(e.target.value)} /></div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div><Label>Expires</Label><Input type="date" value={expires} onChange={(e) => setExpires(e.target.value)} /></div>
            <div><Label>Usage limit</Label><Input type="number" value={limit} onChange={(e) => setLimit(e.target.value)} placeholder="unlimited" /></div>
          </div>
          <div><Label>Min purchase (₹)</Label><Input type="number" value={minP} onChange={(e) => setMinP(e.target.value)} placeholder="none" /></div>
          <div><Label>Restrict to plan</Label>
            <Select value={planId} onValueChange={setPlanId}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Any plan</SelectItem>
                {plans.map((p) => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={() => save.mutate()} disabled={!code.trim() || save.isPending}>Save</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/* ---------------- Subscriptions ---------------- */
type SubRow = {
  id: string; user_id: string; plan_id: string; status: string;
  start_date: string; end_date: string | null; auto_renew: boolean;
};
type ProfileMini = { id: string; display_name: string | null; email: string | null };

function SubscriptionsTab() {
  const qc = useQueryClient();
  const { user } = useAuth();
  const [search, setSearch] = useState("");
  const [grantOpen, setGrantOpen] = useState(false);

  const { data: plans = [] } = useQuery({
    queryKey: ["admin-plans-active"],
    queryFn: async () => {
      const { data, error } = await supabase.from("plans").select("id, name, tier").eq("is_active", true);
      if (error) throw error;
      return data as { id: string; name: string; tier: string }[];
    },
  });

  const { data = [], isLoading } = useQuery({
    queryKey: ["admin-subs", search],
    queryFn: async () => {
      const { data: subs, error } = await supabase.from("subscriptions").select("*").order("created_at", { ascending: false }).limit(300);
      if (error) throw error;
      const rows = (subs ?? []) as SubRow[];
      const ids = Array.from(new Set(rows.map((r) => r.user_id)));
      if (ids.length === 0) return [];
      const { data: profs } = await supabase.from("profiles").select("id, display_name, email").in("id", ids);
      const pmap = new Map<string, ProfileMini>((profs ?? []).map((p) => [p.id, p as ProfileMini]));
      const filtered = search.trim()
        ? rows.filter((r) => {
            const p = pmap.get(r.user_id);
            const s = search.trim().toLowerCase();
            return (p?.display_name ?? "").toLowerCase().includes(s) || (p?.email ?? "").toLowerCase().includes(s);
          })
        : rows;
      return filtered.map((r) => ({ ...r, profile: pmap.get(r.user_id) ?? null }));
    },
  });

  const planMap = new Map(plans.map((p) => [p.id, p]));

  const revoke = useMutation({
    mutationFn: async (subId: string) => {
      const { error } = await supabase.from("subscriptions").update({ status: "cancelled" }).eq("id", subId);
      if (error) throw error;
      await logAdminAction("subscription.revoke", "subscriptions", subId);
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["admin-subs"] }); toast.success("Subscription revoked"); },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="space-y-3">
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search by user name or email" className="pl-9" />
        </div>
        <Button onClick={() => setGrantOpen(true)} className="gap-1"><Plus size={16} /> Grant</Button>
      </div>
      <div className="rounded-2xl bg-card border border-border shadow-card overflow-hidden">
        {isLoading ? <div className="p-6 text-sm text-muted-foreground">Loading…</div>
          : data.length === 0 ? <div className="p-6 text-sm text-muted-foreground">No subscriptions.</div>
          : <ul className="divide-y divide-border">
              {data.map((r) => (
                <li key={r.id} className="flex items-center justify-between px-4 py-3">
                  <div>
                    <div className="text-sm font-medium">{r.profile?.display_name || "Unnamed"} <span className="text-xs text-muted-foreground ml-1">{r.profile?.email}</span></div>
                    <div className="text-xs text-muted-foreground">
                      {planMap.get(r.plan_id)?.name ?? "Plan"} · {new Date(r.start_date).toLocaleDateString()}
                      {r.end_date ? ` → ${new Date(r.end_date).toLocaleDateString()}` : " · no end"}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant={r.status === "active" ? "default" : "secondary"}>{r.status}</Badge>
                    {r.status === "active" && (
                      <Button size="sm" variant="ghost" onClick={() => revoke.mutate(r.id)}><Ban size={14} /></Button>
                    )}
                  </div>
                </li>
              ))}
            </ul>}
      </div>
      <GrantDialog open={grantOpen} onOpenChange={setGrantOpen} plans={plans} adminId={user?.id ?? null} />
    </div>
  );
}

function GrantDialog({ open, onOpenChange, plans, adminId }: { open: boolean; onOpenChange: (v: boolean) => void; plans: { id: string; name: string; tier: string }[]; adminId: string | null }) {
  const qc = useQueryClient();
  const [userSearch, setUserSearch] = useState("");
  const [selectedUser, setSelectedUser] = useState<ProfileMini | null>(null);
  const [planId, setPlanId] = useState<string>("");
  const [endDate, setEndDate] = useState<string>("");

  const { data: users = [] } = useQuery({
    queryKey: ["grant-user-search", userSearch],
    enabled: userSearch.trim().length >= 2,
    queryFn: async () => {
      const s = `%${userSearch.trim()}%`;
      const { data, error } = await supabase.from("profiles").select("id, display_name, email")
        .or(`display_name.ilike.${s},email.ilike.${s}`).limit(10);
      if (error) throw error;
      return data as ProfileMini[];
    },
  });

  const grant = useMutation({
    mutationFn: async () => {
      if (!selectedUser || !planId) throw new Error("Pick a user and plan");
      const payload = {
        user_id: selectedUser.id, plan_id: planId, status: "active" as const,
        start_date: new Date().toISOString(),
        end_date: endDate ? new Date(endDate).toISOString() : null,
        granted_by: adminId,
      };
      const { error } = await supabase.from("subscriptions").insert(payload);
      if (error) throw error;
      await logAdminAction("subscription.grant", "subscriptions", selectedUser.id, { plan_id: planId });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-subs"] });
      onOpenChange(false);
      setSelectedUser(null); setUserSearch(""); setPlanId(""); setEndDate("");
      toast.success("Subscription granted");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader><DialogTitle>Grant subscription</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div>
            <Label>User</Label>
            {selectedUser ? (
              <div className="flex items-center justify-between rounded-lg border border-border p-2">
                <div className="text-sm">{selectedUser.display_name} <span className="text-xs text-muted-foreground">{selectedUser.email}</span></div>
                <Button size="sm" variant="ghost" onClick={() => setSelectedUser(null)}>Change</Button>
              </div>
            ) : (
              <>
                <Input value={userSearch} onChange={(e) => setUserSearch(e.target.value)} placeholder="Search name or email" />
                {users.length > 0 && (
                  <ul className="mt-1 rounded-lg border border-border divide-y divide-border max-h-40 overflow-auto">
                    {users.map((u) => (
                      <li key={u.id}>
                        <button className="w-full text-left px-3 py-2 hover:bg-muted/40 text-sm"
                          onClick={() => setSelectedUser(u)}>
                          {u.display_name || "Unnamed"} <span className="text-xs text-muted-foreground">{u.email}</span>
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </>
            )}
          </div>
          <div>
            <Label>Plan</Label>
            <Select value={planId} onValueChange={setPlanId}>
              <SelectTrigger><SelectValue placeholder="Choose plan" /></SelectTrigger>
              <SelectContent>
                {plans.filter((p) => p.tier !== "free").map((p) => (
                  <SelectItem key={p.id} value={p.id}>{p.name} ({p.tier})</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>End date (optional)</Label>
            <Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={() => grant.mutate()} disabled={!selectedUser || !planId || grant.isPending}>Grant</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/* ---------------- Payments ---------------- */
type PaymentRow = {
  id: string; user_id: string; subscription_id: string | null; amount: number;
  currency: string; status: string; gateway: string; created_at: string;
};

function PaymentsTab() {
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const { data = [], isLoading } = useQuery({
    queryKey: ["admin-payments", search],
    queryFn: async () => {
      const { data: pays, error } = await supabase.from("payments").select("*").order("created_at", { ascending: false }).limit(300);
      if (error) throw error;
      const rows = (pays ?? []) as PaymentRow[];
      const ids = Array.from(new Set(rows.map((r) => r.user_id)));
      if (ids.length === 0) return [];
      const { data: profs } = await supabase.from("profiles").select("id, display_name, email").in("id", ids);
      const pmap = new Map<string, ProfileMini>((profs ?? []).map((p) => [p.id, p as ProfileMini]));
      const filtered = search.trim()
        ? rows.filter((r) => {
            const p = pmap.get(r.user_id);
            const s = search.trim().toLowerCase();
            return (p?.display_name ?? "").toLowerCase().includes(s) || (p?.email ?? "").toLowerCase().includes(s);
          })
        : rows;
      return filtered.map((r) => ({ ...r, profile: pmap.get(r.user_id) ?? null }));
    },
  });

  const refund = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("payments").update({ status: "refunded" }).eq("id", id);
      if (error) throw error;
      await logAdminAction("payment.refund", "payments", id);
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["admin-payments"] }); toast.success("Marked refunded in DB only"); },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="space-y-3">
      <div className="relative">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
        <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search by user" className="pl-9" />
      </div>
      <div className="rounded-2xl bg-card border border-border shadow-card overflow-hidden">
        {isLoading ? <div className="p-6 text-sm text-muted-foreground">Loading…</div>
          : data.length === 0 ? <div className="p-6 text-sm text-muted-foreground">No payments yet.</div>
          : <ul className="divide-y divide-border">
              {data.map((r) => (
                <li key={r.id} className="flex items-center justify-between px-4 py-3">
                  <div>
                    <div className="text-sm font-medium">{r.profile?.display_name || "Unnamed"} <span className="text-xs text-muted-foreground ml-1">{r.profile?.email}</span></div>
                    <div className="text-xs text-muted-foreground">
                      {r.currency} {Number(r.amount).toLocaleString("en-IN")} · {r.gateway} · {new Date(r.created_at).toLocaleDateString()}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant={r.status === "success" ? "default" : r.status === "refunded" ? "secondary" : "outline"}>{r.status}</Badge>
                    {r.status === "success" && (
                      <Button size="sm" variant="ghost" title="Mark as refunded in DB only — does not call Razorpay"
                        onClick={() => { if (confirm("This only updates the database. It will NOT refund the customer via Razorpay. Continue?")) refund.mutate(r.id); }}>
                        <RefreshCcw size={14} /> <span className="ml-1 text-xs">Mark refunded (DB only)</span>
                      </Button>
                    )}
                  </div>
                </li>
              ))}
            </ul>}
      </div>
    </div>
  );
}
