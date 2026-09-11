# Repair telephony and add communications history

## What will change

### 1. Recover and synchronize phone numbers
- Add an **Import from Twilio** action that reads numbers already owned by the connected Twilio account.
- Assign imported numbers to the signed-in user, store them in the app, and update their voice, SMS, and status callbacks to the deployed Vercel URLs.
- Make synchronization safe to repeat, so a number is updated instead of duplicated.
- Show whether each number is ready for calls and SMS, with clear provider errors when configuration fails.

### 2. Complete self-service number purchase
- Keep provider inventory search and purchase inside the Phone Numbers page.
- Show country, locality, capabilities, and recurring price when Twilio returns it.
- Configure every newly purchased number immediately for inbound calls, transcription, status updates, and inbound SMS.
- Treat these as Twilio virtual cloud numbers. They are not cellular SIM/eSIM data plans.

### 3. Add real outbound browser calls
- Add a dialer where a signed-in user selects an owned number, enters a destination, and starts or ends a call using their browser microphone.
- Create secure short-lived Twilio Voice access tokens on the server and add an authenticated TwiML endpoint for the browser call leg.
- Create and update outbound call sessions so Call Studio and history use the same records as inbound calls.
- Request microphone access only when starting a call, and surface connection, ringing, active, failed, and ended states.

### 4. Persist SMS activity
- Add a user-owned messages table for inbound and outbound SMS, provider message IDs, delivery state, error details, and timestamps.
- Save outbound messages before/after provider submission and process delivery callbacks.
- Save inbound messages in the SMS webhook and associate them with the imported or purchased number.
- Replace the automatic reply with a clean acknowledgement, avoiding an unwanted paid reply on every inbound message.

### 5. Add communications history
- Add a protected **History** page with Calls and Messages views.
- Calls show direction, parties, status, start time, calculated duration, transcription, and translation.
- Messages show direction, from/to, body, delivery state, and time.
- Add links from Phone Numbers and Call Studio, with expandable call details for transcript and translation turns.

### 6. Verification
- Test provider inventory sync against the linked Twilio account without purchasing another number.
- Verify ownership rules so users only see and act on their own numbers, calls, transcripts, and messages.
- Verify public webhook authorization, local rendering, and authenticated desktop/mobile workflows.
- Confirm deployed endpoint responses; a final real carrier call/SMS remains dependent on Twilio billing, geographic permissions, and production deployment of the completed code.

## Technical details
- Extend `call_sessions` with provider duration/error metadata and add a protected `sms_messages` table with explicit grants and row-level ownership policies.
- Add idempotent server functions for Twilio inventory sync, number configuration, outbound call setup, messaging, and paginated history.
- Use Twilio Voice JavaScript SDK for browser audio. This requires a TwiML App SID plus a Twilio API Key SID and Secret stored securely; the existing connector gateway credential cannot sign browser Voice access tokens.
- Keep provider credentials server-side and validate all inputs with Zod.
- Use the existing Vercel public URL for callbacks, while allowing `PUBLIC_BASE_URL` to override it.
