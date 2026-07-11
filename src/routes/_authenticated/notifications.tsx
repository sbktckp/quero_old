import { createFileRoute } from "@tanstack/react-router";
import { BottomNav } from "@/components/bottom-nav";
import { Bell } from "lucide-react";

export const Route = createFileRoute("/_authenticated/notifications")({
  component: NotificationsPage,
});

function NotificationsPage() {
  return (
    <div className="min-h-screen bg-background pb-24">
      <header className="sticky top-0 bg-background/95 backdrop-blur border-b border-border">
        <div className="mx-auto max-w-lg px-5 py-3.5">
          <h1 className="font-bold text-lg">Notifications</h1>
        </div>
      </header>
      <main className="mx-auto max-w-lg px-5 py-10 text-center">
        <div className="mx-auto h-16 w-16 rounded-2xl bg-primary-soft flex items-center justify-center mb-3">
          <Bell className="text-primary" />
        </div>
        <p className="font-semibold">You're all caught up</p>
        <p className="text-sm text-muted-foreground mt-1">Notifications will appear here in a later phase.</p>
      </main>
      <BottomNav />
    </div>
  );
}
