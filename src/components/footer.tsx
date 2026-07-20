import { Link } from "@tanstack/react-router";

const links = [
  { to: "/privacy-policy", label: "Privacy Policy" },
  { to: "/terms", label: "Terms" },
  { to: "/refund-policy", label: "Refund Policy" },
  { to: "/contact", label: "Contact" },
  { to: "/delete-account", label: "Delete Account" },
] as const;

export function Footer() {
  const year = new Date().getFullYear();
  return (
    <footer className="mt-8 border-t border-border bg-card/40">
      <div className="mx-auto max-w-lg px-5 py-6 pb-[calc(5rem+env(safe-area-inset-bottom))] text-center text-xs text-muted-foreground">
        <div className="flex flex-wrap justify-center gap-x-3 gap-y-2">
          {links.map((l) => (
            <Link key={l.to} to={l.to} className="hover:text-foreground transition-colors">
              {l.label}
            </Link>
          ))}
        </div>
        <div className="mt-3">© {year} Quero</div>
      </div>
    </footer>
  );
}
