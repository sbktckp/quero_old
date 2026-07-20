import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/admin/contact")({
  component: AdminContact,
});

type Settings = {
  support_email: string;
  support_phone: string | null;
  support_whatsapp: string | null;
  support_hours_days: string;
  support_hours_time: string;
  instagram_url: string | null;
  youtube_url: string | null;
  telegram_url: string | null;
  show_whatsapp_social: boolean;
};

function normalizePhone(s: string): string {
  const trimmed = s.trim();
  if (!trimmed) return "";
  const hasPlus = trimmed.startsWith("+");
  const digits = trimmed.replace(/[^\d]/g, "");
  return hasPlus ? `+${digits}` : digits;
}

function AdminContact() {
  const qc = useQueryClient();
  const { user } = useAuth();
  const { data } = useQuery({
    queryKey: ["contact-settings"],
    queryFn: async () => {
      const { data, error } = await supabase.from("contact_settings").select("*").eq("id", true).maybeSingle();
      if (error) throw error;
      return data as Settings | null;
    },
  });

  const [form, setForm] = useState<Settings>({
    support_email: "",
    support_phone: "",
    support_whatsapp: "",
    support_hours_days: "",
    support_hours_time: "",
    instagram_url: "",
    youtube_url: "",
    telegram_url: "",
    show_whatsapp_social: true,
  });

  useEffect(() => {
    if (data) {
      setForm({
        support_email: data.support_email ?? "",
        support_phone: data.support_phone ?? "",
        support_whatsapp: data.support_whatsapp ?? "",
        support_hours_days: data.support_hours_days ?? "",
        support_hours_time: data.support_hours_time ?? "",
        instagram_url: data.instagram_url ?? "",
        youtube_url: data.youtube_url ?? "",
        telegram_url: data.telegram_url ?? "",
        show_whatsapp_social: data.show_whatsapp_social ?? true,
      });
    }
  }, [data]);

  const save = useMutation({
    mutationFn: async () => {
      const cleanUrl = (v: string | null) => {
        const t = (v ?? "").trim();
        return t ? t : null;
      };
      const payload = {
        support_email: form.support_email.trim(),
        support_phone: form.support_phone ? normalizePhone(form.support_phone) || null : null,
        support_whatsapp: form.support_whatsapp ? normalizePhone(form.support_whatsapp) || null : null,
        support_hours_days: form.support_hours_days.trim(),
        support_hours_time: form.support_hours_time.trim(),
        instagram_url: cleanUrl(form.instagram_url),
        youtube_url: cleanUrl(form.youtube_url),
        telegram_url: cleanUrl(form.telegram_url),
        show_whatsapp_social: form.show_whatsapp_social,
        updated_by: user?.id ?? null,
      };
      const { error } = await supabase.from("contact_settings").update(payload).eq("id", true);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Contact settings saved");
      qc.invalidateQueries({ queryKey: ["contact-settings"] });
      qc.invalidateQueries({ queryKey: ["footer-contact-settings"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-bold">Contact Settings</h2>
        <p className="text-sm text-muted-foreground">Public contact info shown on the /contact page. Updates go live immediately.</p>
      </div>

      <div className="rounded-2xl border border-border bg-card p-5 space-y-4">
        <div>
          <Label>Support email</Label>
          <Input
            type="email"
            value={form.support_email}
            onChange={(e) => setForm({ ...form, support_email: e.target.value })}
            placeholder="support@quero.in"
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div>
            <Label>Support phone (optional)</Label>
            <Input
              value={form.support_phone ?? ""}
              onChange={(e) => setForm({ ...form, support_phone: e.target.value })}
              placeholder="+91 98765 43210"
            />
            <p className="text-[11px] text-muted-foreground mt-1">Non-digits stripped on save. Leave blank to hide.</p>
          </div>
          <div>
            <Label>WhatsApp number (optional)</Label>
            <Input
              value={form.support_whatsapp ?? ""}
              onChange={(e) => setForm({ ...form, support_whatsapp: e.target.value })}
              placeholder="+91 98765 43210"
            />
            <p className="text-[11px] text-muted-foreground mt-1">Include country code. Renders as a wa.me click-to-chat button.</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div>
            <Label>Support hours — days</Label>
            <Input
              value={form.support_hours_days}
              onChange={(e) => setForm({ ...form, support_hours_days: e.target.value })}
              placeholder="Monday – Saturday"
            />
          </div>
          <div>
            <Label>Support hours — time</Label>
            <Input
              value={form.support_hours_time}
              onChange={(e) => setForm({ ...form, support_hours_time: e.target.value })}
              placeholder="9:00 AM – 8:00 PM (IST)"
            />
          </div>
        </div>
        <div className="pt-2 border-t border-border">
          <h3 className="text-sm font-bold mb-3">Social links (footer)</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <Label>Instagram URL</Label>
              <Input
                value={form.instagram_url ?? ""}
                onChange={(e) => setForm({ ...form, instagram_url: e.target.value })}
                placeholder="https://instagram.com/quero"
              />
            </div>
            <div>
              <Label>YouTube URL</Label>
              <Input
                value={form.youtube_url ?? ""}
                onChange={(e) => setForm({ ...form, youtube_url: e.target.value })}
                placeholder="https://youtube.com/@quero"
              />
            </div>
            <div>
              <Label>Telegram URL</Label>
              <Input
                value={form.telegram_url ?? ""}
                onChange={(e) => setForm({ ...form, telegram_url: e.target.value })}
                placeholder="https://t.me/quero"
              />
            </div>
            <div className="flex items-center gap-2 pt-6">
              <input
                id="show-whatsapp-social"
                type="checkbox"
                checked={form.show_whatsapp_social}
                onChange={(e) => setForm({ ...form, show_whatsapp_social: e.target.checked })}
                className="h-4 w-4 rounded border-border"
              />
              <Label htmlFor="show-whatsapp-social" className="cursor-pointer">
                Show WhatsApp icon in footer
              </Label>
            </div>
          </div>
          <p className="text-[11px] text-muted-foreground mt-2">Leave a URL blank to hide that social icon site-wide.</p>
        </div>

        <Button onClick={() => save.mutate()} disabled={save.isPending || !form.support_email.trim()}>
          {save.isPending ? "Saving…" : "Save changes"}
        </Button>
      </div>
    </div>
  );
}
