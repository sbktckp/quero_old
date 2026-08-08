import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { logAdminAction } from "@/lib/admin-log";
import { toast } from "sonner";
import { Loader2, Mail, Phone } from "lucide-react";

export const Route = createFileRoute("/_authenticated/admin/leads")({
  component: AdminLeadsPage,
});

type Lead = {
  id: string;
  institute_name: string;
  contact_name: string;
  email: string;
  phone: string | null;
  message: string | null;
  status: string;
  created_at: string;
};

const STATUSES = ["all", "new", "contacted", "converted", "declined"] as const;
const ACTIONS = ["new", "contacted", "converted", "declined"] as const;

function AdminLeadsPage() {
  const qc = useQueryClient();
  const [filter, setFilter] = useState<(typeof STATUSES)[number]>("all");

  const { data: leads = [], isLoading } = useQuery({
    queryKey: ["admin-institute-leads", filter],
    queryFn: async () => {
      let q = supabase
        .from("institute_interest_leads")
        .select("*")
        .order("created_at", { ascending: false });
      if (filter !== "all") q = q.eq("status", filter);
      const { data, error } = await q;
      if (error) throw error;
      return (data ?? []) as Lead[];
    },
  });

  async function setStatus(lead: Lead, status: string) {
    const { error } = await supabase
      .from("institute_interest_leads")
      .update({ status })
      .eq("id", lead.id);
    if (error) {
      toast.error("Could not update this lead");
      return;
    }
    await logAdminAction("institute_lead.status", "institute_interest_leads", lead.id, { status });
    toast.success(`Marked ${status}`);
    qc.invalidateQueries({ queryKey: ["admin-institute-leads"] });
  }

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-bold">Institute Leads</h2>
        <p className="text-sm text-muted-foreground">Interest requests submitted from the For Institutes page.</p>
      </div>

      <div className="flex flex-wrap gap-2">
        {STATUSES.map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => setFilter(s)}
            className={`rounded-full border px-3 py-1.5 text-xs font-semibold capitalize transition-colors ${
              filter === s ? "border-primary bg-primary text-primary-foreground" : "border-border text-muted-foreground"
            }`}
          >
            {s}
          </button>
        ))}
      </div>

      {isLoading ? (
        <div className="flex justify-center py-10"><Loader2 className="animate-spin" /></div>
      ) : leads.length === 0 ? (
        <div className="rounded-2xl border border-border bg-card p-8 text-center text-sm text-muted-foreground">
          No leads {filter === "all" ? "yet" : `with status "${filter}"`}.
        </div>
      ) : (
        <div className="space-y-3">
          {leads.map((l) => (
            <div key={l.id} className="rounded-2xl border border-border bg-card p-4 shadow-card">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <div className="font-semibold">{l.institute_name}</div>
                  <div className="text-sm text-muted-foreground">{l.contact_name}</div>
                </div>
                <span className="rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold capitalize text-primary">
                  {l.status}
                </span>
              </div>

              <div className="mt-2 flex flex-wrap gap-4 text-sm text-muted-foreground">
                <a href={`mailto:${l.email}`} className="inline-flex items-center gap-1.5 hover:text-primary">
                  <Mail size={14} /> {l.email}
                </a>
                {l.phone && (
                  <a href={`tel:${l.phone}`} className="inline-flex items-center gap-1.5 hover:text-primary">
                    <Phone size={14} /> {l.phone}
                  </a>
                )}
                <span>{new Date(l.created_at).toLocaleDateString()}</span>
              </div>

              {l.message && <p className="mt-2 whitespace-pre-wrap text-sm">{l.message}</p>}

              <div className="mt-3 flex flex-wrap gap-2">
                {ACTIONS.filter((a) => a !== l.status).map((a) => (
                  <button
                    key={a}
                    type="button"
                    onClick={() => setStatus(l, a)}
                    className="rounded-lg border border-border px-3 py-1.5 text-xs font-semibold capitalize hover:border-primary hover:text-primary"
                  >
                    Mark {a}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
