import { Link } from "@tanstack/react-router";
import { useState } from "react";
import { Menu, X } from "lucide-react";

const nav = [
  { label: "For Students", href: "#features" },
  { label: "Features", href: "#features" },
  { label: "Pricing", href: "#pricing" },
] as const;

export function LandingHeader() {
  const [open, setOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 border-b border-border/60 bg-background/80 backdrop-blur-xl">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-5 py-3.5">
        <Link to="/" className="flex items-center gap-2">
          <div
            className="flex h-9 w-9 items-center justify-center rounded-xl text-sm font-extrabold text-primary-foreground shadow-card"
            style={{ background: "var(--gradient-primary)" }}
            aria-hidden
          >
            Q
          </div>
          <span className="text-xl font-extrabold tracking-tight">Quero</span>
        </Link>

        <nav className="hidden items-center gap-7 text-sm font-medium text-foreground/70 md:flex">
          {nav.map((n) => (
            <a key={n.label} href={n.href} className="transition-colors hover:text-primary">
              {n.label}
            </a>
          ))}
          <Link to="/about" className="transition-colors hover:text-primary">About Us</Link>
        </nav>

        <div className="hidden items-center gap-2 md:flex">
          <Link
            to="/auth"
            className="rounded-lg border border-primary/40 px-4 py-2 text-sm font-semibold text-primary transition-colors hover:bg-primary/5"
          >
            Login
          </Link>
          <Link
            to="/auth"
            className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground shadow-card transition-transform hover:-translate-y-0.5"
          >
            Sign Up Free
          </Link>
        </div>

        <button
          type="button"
          aria-label={open ? "Close menu" : "Open menu"}
          className="rounded-lg border border-border p-2 md:hidden"
          onClick={() => setOpen((v) => !v)}
        >
          {open ? <X size={18} /> : <Menu size={18} />}
        </button>
      </div>

      {open && (
        <div className="border-t border-border/60 bg-background px-5 py-4 md:hidden">
          <div className="flex flex-col gap-3 text-sm font-medium">
            {nav.map((n) => (
              <a key={n.label} href={n.href} onClick={() => setOpen(false)} className="text-foreground/80">
                {n.label}
              </a>
            ))}
            <Link to="/about" onClick={() => setOpen(false)} className="text-foreground/80">About Us</Link>
            <div className="mt-2 grid grid-cols-2 gap-2">
              <Link
                to="/auth"
                onClick={() => setOpen(false)}
                className="rounded-lg border border-primary/40 px-4 py-2 text-center font-semibold text-primary"
              >
                Login
              </Link>
              <Link
                to="/auth"
                onClick={() => setOpen(false)}
                className="rounded-lg bg-primary px-4 py-2 text-center font-semibold text-primary-foreground"
              >
                Sign Up Free
              </Link>
            </div>
          </div>
        </div>
      )}
    </header>
  );
}
