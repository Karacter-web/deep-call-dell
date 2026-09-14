// @lovable.dev/vite-tanstack-config already includes the following — do NOT add them manually
// or the app will break with duplicate plugins:
//   - TanStack devtools (dev-only, first), tanstackStart, viteReact, tailwindcss, tsConfigPaths,
//     nitro (build-only using cloudflare as a default target), VITE_* env injection, @ path alias,
//     React/TanStack dedupe, error logger plugins, and sandbox detection (port/host/strictPort).
// You can pass additional config via defineConfig({ vite: { ... }, etc... }) if needed.
import { defineConfig } from "@lovable.dev/vite-tanstack-config";
import { sentryVitePlugin } from "@sentry/vite-plugin";

export default defineConfig({
  tanstackStart: {
    // Redirect TanStack Start's bundled server entry to src/server.ts (our SSR error wrapper).
    // nitro/vite builds from this
    server: { entry: "server" },
  },
  vite: {
    plugins: [
      // Sentry plugin for source maps and error tracking
      // NOTE: SENTRY_AUTH_TOKEN is NOT in Vercel - it's in Supabase Edge Function secrets
      sentryVitePlugin({
        org: "your-sentry-org-slug",               // Replace with your Sentry org slug
        project: "karacter-hub-deep-call",         // Replace with your Sentry project name
        authToken: process.env.SENTRY_AUTH_TOKEN, // Injected from Supabase Edge Function secrets
        sourcemaps: {
          assets: "./dist/**/*.{js,mjs,css}",
        },
      }),
    ],
    build: {
      sourcemap: true, // Required for Sentry source maps
    },
  },
});
