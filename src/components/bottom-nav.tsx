import { Link, useRouterState } from "@tanstack/react-router";
import { Home, Search, Bell, User } from "lucide-react";

const items = [
  { to: "/home", icon: Home, label: "Home" },
  { to: "/search", icon: Search, label: "Search" },
  { to: "/notifications", icon: Bell, label: "Notifications" },
  { to: "/profile", icon: User, label: "Profile" },
] as const;

export function BottomNav() {
  const path = useRouterState({ select: (s) => s.location.pathname });
  return (
    <nav className="fixed bottom-0 inset-x-0 z-40 border-t border-border bg-card/95 backdrop-blur-lg">
      <div className="mx-auto max-w-lg grid grid-cols-4 pt-2 pb-[calc(0.5rem+env(safe-area-inset-bottom))]">
        {items.map((it) => {
          const active = path === it.to;
          const Icon = it.icon;
          return (
            <Link key={it.to} to={it.to} className="flex flex-col items-center gap-1 py-1.5">
              <Icon size={22} className={active ? "text-primary" : "text-muted-foreground"} strokeWidth={active ? 2.4 : 1.8} />
              <span className={`text-[10px] font-medium ${active ? "text-primary" : "text-muted-foreground"}`}>{it.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
