import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import tailwindcss from "@tailwindcss/vite";
import viteReact from "@vitejs/plugin-react";
import { nitro } from "nitro/vite";
import { defineConfig } from "vite";
import tsConfigPaths from "vite-tsconfig-paths";

// Explicit plugin list. Previously provided implicitly by
// @lovable.dev/vite-tanstack-config; that wrapper is no longer a dependency.
//
// The nitro plugin is what emits the server build. Without it the build
// still succeeds but produces client assets only, no server function, and
// TanStack Start SSR emits no index.html either, so every route 404s at the
// edge. Nitro auto-detects the Vercel preset from the build environment.
export default defineConfig({
  plugins: [
    tsConfigPaths({ projects: ["./tsconfig.json"] }),
    tailwindcss(),
    tanstackStart({
      // src/server.ts wraps TanStack Start's default server entry with
      // baseline security headers and an SSR error fallback page.
      server: { entry: "server" },
    }),
    nitro(),
    viteReact(),
  ],
});
