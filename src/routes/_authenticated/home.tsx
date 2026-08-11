import { createFileRoute, redirect } from "@tanstack/react-router";

// The dashboard now lives at "/" so signed-in users see a clean quero.in URL.
// This route is kept so old links, bookmarks and any cached redirects still work.
export const Route = createFileRoute("/_authenticated/home")({
  beforeLoad: () => {
    throw redirect({ to: "/", replace: true });
  },
});
