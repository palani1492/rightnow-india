# Security and privacy

RightNow India is a synthetic hackathon prototype. Do not use it with real identity numbers, bank details, OTPs, personal records, or documents.

## Implemented boundaries

- Provider keys are read only by the server route.
- AI processing requires an explicit notice and consent choice.
- The provider receives the minimum message needed for mission interpretation with `store: false`.
- Sensitive identifier patterns are rejected before any provider call.
- Model output is constrained to six missions and mission-specific finite fact values.
- Model output cannot supply eligibility, sources, document requirements, action text, or submission status.
- Eligibility and preparation are deterministic connector functions.
- Household facts stay in browser storage and can be cleared permanently.
- The mock gateway accepts allow-listed prepared IDs and an expiring HMAC token bound to the exact reviewed set.
- All references begin with `MOCK-RNI-` and have no external effect.
- Requests are size-limited, rate-limited and returned with `Cache-Control: no-store`.
- No live government, payment, identity, OTP, upload or document API is called.

## Deployment requirements

Set a unique `MOCK_GATEWAY_SECRET` of at least 32 characters in the server environment. Keep `AI_API_KEY` unset for a deterministic-only public demo. The module-local limiter is defense-in-depth, not a distributed Vercel rate limit; configure Vercel Firewall, Vercel KV, Upstash or an equivalent durable limiter before adding an optional runtime AI key. Never use a `NEXT_PUBLIC_` prefix for either value. Rotate a credential immediately if it appears in source, logs, screenshots or a client bundle.

Report issues privately to the repository owner before sharing details publicly.
