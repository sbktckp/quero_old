import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import tailwindcss from "@tailwindcss/vite";
import viteReact from "@vitejs/plugin-react";
import { defineConfig } from "vite";
import tsConfigPaths from "vite-tsconfig-paths";

// Explicit plugin list. Previously provided implicitly by
// @lovable.dev/vite-tanstack-config; that wrapper is no longer a dependency.
export default defineConfig({
  plugins: [
    tsConfigPaths({ projects: ["./tsconfig.json"] }),
    tailwindcss(),
    tanstackStart({
      // src/server.ts wraps TanStack Start's default server entry with
      // baseline security headers and an SSR error fallback page.
      server: { entry: "server" },
      target: "vercel",
    }),
    viteReact(),
  ],
});
