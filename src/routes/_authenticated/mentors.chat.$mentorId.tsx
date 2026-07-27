import { createFileRoute, Link, useParams } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { ArrowLeft, Send } from "lucide-react";
import type { MentorRow } from "@/lib/mentors";

export const Route = createFileRoute("/_authenticated/mentors/chat/$mentorId")({
  head: () => ({
    meta: [
      { title: "Mentor Chat — Quero" },
      { name: "description", content: "Message your verified MBBS student mentor directly inside Quero." },
      { property: "og:title", content: "Mentor Chat — Quero" },
      { property: "og:description", content: "Message your verified MBBS student mentor directly inside Quero." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: MentorChat,
});

type Msg = { id: string; sender_id: string; message: string; created_at: string };

function MentorChat() {
  const { mentorId } = useParams({ from: "/_authenticated/mentors/chat/$mentorId" });
  const { user } = useAuth();
  const qc = useQueryClient();
  const [text, setText] = useState("");
  const endRef = useRef<HTMLDivElement>(null);

  const { data: mentor } = useQuery({
    queryKey: ["mentor-lite", mentorId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("mentors").select("id, user_id, full_name, photo_url").eq("id", mentorId).maybeSingle();
      if (error) throw error;
      return (data ?? null) as Pick<MentorRow, "id" | "user_id" | "full_name" | "photo_url"> | null;
    },
  });

  // The student side of the thread is the current user, unless the current user IS the mentor.
  const isMentorSelf = !!mentor && mentor.user_id === user?.id;

  const { data: messages = [] } = useQuery({
    queryKey: ["mentor-chat", mentorId, user?.id],
    enabled: !!user && !!mentor,
    queryFn: async () => {
      let q = supabase.from("mentor_chat_messages")
        .select("id, sender_id, message, created_at").eq("mentor_id", mentorId)
        .order("created_at", { ascending: true });
      if (!isMentorSelf) q = q.eq("student_id", user!.id);
      const { data, error } = await q;
      if (error) throw error;
      return (data ?? []) as Msg[];
    },
  });

  useEffect(() => {
    if (!user || !mentor) return;
    const channel = supabase
      .channel(`mentor-chat-${mentorId}`)
      .on("postgres_changes",
        { event: "INSERT", schema: "public", table: "mentor_chat_messages", filter: `mentor_id=eq.${mentorId}` },
        () => qc.invalidateQueries({ queryKey: ["mentor-chat", mentorId, user.id] }),
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [mentorId, user, mentor, qc]);

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages.length]);

  const send = async () => {
    const body = text.trim();
    if (!body || !mentor || !user) return;
    setText("");
    const { error } = await supabase.from("mentor_chat_messages").insert({
      mentor_id: mentor.id,
      student_id: isMentorSelf ? messages[0]?.sender_id ?? user.id : user.id,
      sender_id: user.id,
      message: body,
    });
    if (error) { toast.error(error.message); setText(body); return; }
    qc.invalidateQueries({ queryKey: ["mentor-chat", mentorId, user.id] });
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header className="sticky top-0 z-20 bg-background/95 backdrop-blur border-b border-border">
        <div className="mx-auto max-w-lg px-5 py-3 flex items-center gap-3">
          <Link to="/mentors/$id" params={{ id: mentorId }} className="text-muted-foreground"><ArrowLeft size={18} /></Link>
          <div className="font-bold truncate">{mentor?.full_name ?? "Chat"}</div>
        </div>
      </header>

      <main className="flex-1 mx-auto w-full max-w-lg px-5 py-4 space-y-2">
        {messages.length === 0 && (
          <div className="text-center text-sm text-muted-foreground py-10">
            Say hello — ask anything about college life, counselling or preparation.
          </div>
        )}
        {messages.map((m) => {
          const mine = m.sender_id === user?.id;
          return (
            <div key={m.id} className={`flex ${mine ? "justify-end" : "justify-start"}`}>
              <div className={`max-w-[80%] rounded-2xl px-3 py-2 text-sm ${mine ? "gradient-primary text-primary-foreground" : "bg-muted"}`}>
                {m.message}
                <div className={`mt-0.5 text-[10px] ${mine ? "text-primary-foreground/70" : "text-muted-foreground"}`}>
                  {new Date(m.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                </div>
              </div>
            </div>
          );
        })}
        <div ref={endRef} />
      </main>

      <div className="sticky bottom-0 border-t border-border bg-background p-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))]">
        <div className="mx-auto max-w-lg flex gap-2">
          <Input
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); send(); } }}
            placeholder="Type a message"
          />
          <Button onClick={send} disabled={!text.trim()}><Send size={15} /></Button>
        </div>
      </div>
    </div>
  );
}
