# Karacter Hub | Deep Call Live — Implementation Roadmap

> **Workspace move (2026-09-06):** Project was migrated to a new workspace.
> Connectors/secrets from the previous workspace do not carry over. Twilio was
> re-linked fresh (`std_01m1tjbfpdfhha72yj0dmw71ej`, gateway-backed) and its
> credentials verified. `LOVABLE_API_KEY`, `TWILIO_API_KEY`, and
> `TWILIO_WEBHOOK_TOKEN` are all present. Existing `src/lib/twilio.server.ts`
> already targets the gateway, so no code change was needed. Re-verify any
> other previously-connected integrations on first use.

A living to-do list of suggested improvements across the frontend, backend,
telephony, voice models, auth/security, and ops. Items are grouped by area and
roughly ordered by priority within each group. Check things off as you go.

Legend: `[ ]` not started · `[~]` in progress · `[x]` done

---

## 1. Telephony & Live Calls (core loop)

The live call loop currently relies on Twilio Real-Time Transcription HTTP
callbacks. These items harden and complete it.

- [ ] **End-to-end call test against a real Twilio number.** Buy a number,
  wire its voice webhook to the published `PUBLIC_BASE_URL`, place an inbound
  call, and confirm transcripts + translations appear in Call Studio in <3s.
  Capture a screenshot as the acceptance artifact.
- [ ] **Outbound calls.** Today only inbound calls are wired (`/voice` TwiML).
  Add an `initiateCall` server function (Twilio `Calls.create`) + a "Dial out"
  control in Call Studio so an operator can place a call to a typed number.
- [ ] **Translation language picker persists per session.** The Call Studio
  translation target is UI-only; the webhook translates to a fixed default.
  Store the session's target language in `call_sessions` and have
  `/transcription` read it so the live translation matches the operator's pick.
- [ ] **Bidirectional speak-back audio.** `speakToCall` uses `<Say>` on a live
  call, but the operator's chosen **voice model** is not applied. Wire the
  selected `voice_models` row (provider + voice id) into the TwiML `<Say>`
  `voice` attribute so spoken replies use the trained voice.
- [ ] **Call recording & replay.** Toggle Twilio recording on the call and store
  the recording URL on `call_sessions`; add a "Recordings" panel that streams
  past recordings.
- [ ] **Retry/backoff for Twilio gateway.** `twilioRequest` fails open on HTTP
  errors. Add bounded retries with exponential backoff for 5xx/timeout and
  surface a typed error to the caller.
- [ ] **Call metrics.** Track latency (STT → transcript → translation) and
  store on `call_transcripts` so the UI can show a "live lag" indicator.

## 2. Voice Models

The page stores recordings and tuning values but does no real voice training.

- [ ] **ElevenLabs voice training integration.** On sample upload, call the
  ElevenLabs API to clone/train a voice and persist the returned voice id on
  `voice_models`. Move status `training → ready` only on provider success;
  set `failed` with the error message on failure.
- [ ] **Preview/sample playback for presets.** Presets have a `sample_url`
  field; render a play button on each preset card so users hear the voice
  before selecting.
- [ ] **De-dupe preset cloning.** "Use on calls" clones a preset into the
  user's library every time. Before cloning, check for an existing custom row
  with the same preset id and reuse it; only flip `is_default`.
- [ ] **Tuning validation.** Clamp `stability`, `similarity`, `speed`, `pitch`
  to provider-supported ranges and reject out-of-range values server-side.
- [ ] **Voice model → TTS for speak-back.** Resolve the user's default voice
  model and route `speakToCall` through the matching TTS provider (ElevenLabs
  or Google) instead of generic Twilio `<Say>`.
- [ ] **Usage quota.** Enforce a per-user sample-upload / training limit so a
  free tier can't train unbounded voices.

## 3. Auth, Roles & Security

- [ ] **Remediate the SECURITY DEFINER linter warning.** The Supabase linter
  flags `has_role` (and the auto-profile trigger) as `SECURITY DEFINER`
  callable by signed-in users. Either restrict `EXECUTE` on these functions to
  `authenticated`/`service_role` only, or move the logic behind RLS-safe views.
  This is an unresolved security follow-up from the roles migration.
- [ ] **Admin dashboard.** Roles (`admin`, `agent`, `customer`) exist but only
  `customer` auto-provisions. Add an admin-only route to list users, assign
  roles, and view all call sessions across the tenant.
- [ ] **Profile completion.** Add a post-signup profile step (display name,
  org) since `profiles` are created empty by the trigger.
- [ ] **Rate-limit auth endpoints.** Login/signup/forgot-password are
  unthrottled. Add server-side rate limiting (e.g. per IP + email) to blunt
  abuse.
- [ ] **Rotate `TWILIO_WEBHOOK_TOKEN`.** It's generated once; add a rotation
  path and ensure all webhook routes validate the current token.

## 4. Call Studio UX

- [ ] **Live transcript scroll/autoscroll control.** Long calls overflow the
  frame; add sticky-bottom autoscroll with a "jump to latest" affordance.
- [ ] **Speaker diarization UI.** Transcripts have a `speaker` field; render
  caller vs. operator turns with distinct avatars/alignment.
- [ ] **Search & export.** Add full-text search over a session's transcripts
  and a "Download transcript" (CSV/JSON) action.
- [ ] **Call history page.** `/_authenticated/calls` listing past
  `call_sessions` with filters by number/date and a deep-link into the replay.
- [ ] **Mobile responsive pass.** The split-screen studio is desktop-first;
  verify and fix layout at 375–768px (the preview viewport is mobile).

## 5. Landing & Marketing

- [ ] **Replace placeholder testimonials** with real customer quotes (or remove
  the section until you have them — fake quotes erode trust).
- [ ] **Pricing → real Stripe/checkout.** Pricing tiers are static. Wire the
  Pro/Enterprise CTAs to a payment provider before launch.
- [ ] **SEO per route.** Each leaf route has its own `head()`; audit titles,
  meta descriptions, OG images, and canonical tags for docs/api-reference/
  contact/privacy.
- [ ] **Analytics.** Add page-view + CTA event tracking (GA4 or Plausible).

## 6. Backend (FastAPI reference service)

Shipped as reference files under `backend/`; deploy externally for
WebSocket-based paths.

- [ ] **Pick a host for `/stream-audio` + Socket.io.** Vercel serverless can't
  hold long-lived WebSockets. Deploy `backend/Dockerfile` to Fly.io / Render /
  Railway / Cloud Run and point `VITE_BACKEND_WS_URL` + `PUBLIC_BASE_URL` at it.
- [ ] **Whisper model selection.** `services/stt.py` defaults to a model size;
  make it env-configurable so small deploys use `tiny` and prod uses `medium`.
- [ ] **Health checks for upstream providers.** `/health` only reports process
  liveness; add readiness checks for DeepL / ElevenLabs / Twilio connectivity.
- [ ] **Structured logging.** Add JSON logs with request/call IDs for tracing a
  call across the STT → translate → TTS → Socket.io pipeline.

## 7. Ops, Deploy & DX

- [ ] **CI pipeline.** Add GitHub Actions: `bun install`, `bunx tsgo --noEmit`,
  `bun lint`, and (optional) a Playwright smoke test on the preview build.
- [ ] **Environment parity.** Document the full env var matrix in
  `.env.example` and confirm Vercel + container host both carry every var the
  webhook routes read at runtime (esp. `PUBLIC_BASE_URL`, `LOVABLE_API_KEY`,
  `TWILIO_*`).
- [ ] **Supabase types regeneration.** After the voice-models migration,
  regenerate `src/integrations/supabase/types.ts` so `voice_models` /
  `voice_samples` are typed (currently `Tables<...>` may be untyped).
- [ ] **Error reporting wiring.** `src/lib/lovable-error-reporting.ts` exists;
  confirm it's attached to a global error boundary in `__root.tsx`.
- [ ] **Database backups / retention.** `call_transcripts` will grow unbounded;
  add a retention policy or archival job for sessions older than N days.

---

## Suggested next 3 milestones

1. **Make the core loop real** — end-to-end Twilio call test + per-session
   translation language + voice-model speak-back (Telephony §1 + Voice §2).
2. **Harden auth/security** — remediate the `SECURITY DEFINER` warning, add an
   admin dashboard and profile completion (Auth §3).
3. **Ship the backend host** — deploy the FastAPI service to a container host,
   wire `VITE_BACKEND_WS_URL`, and validate the Socket.io stream path (Backend §6 + Ops §7).
