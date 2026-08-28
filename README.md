# RightNow India

RightNow India is an independent prototype for discovering and preparing public-service actions around life changes. A citizen describes what changed, answers a few non-sensitive questions, reviews every prepared action together, and receives clearly marked mock references in one civic inbox.

The demo includes six missions and nineteen deterministic connectors. It never calls a government system, verifies identity, uploads documents, processes OTPs or payments, or submits a real application.

## Run locally

```bash
npm install
cp .env.example .env.local
npm run dev
```

The app works without an AI key through its English, Hindi and Tamil deterministic matcher. `AI_API_KEY` is optional and should remain unset for the first public demo deployment. To enable model-backed interpretation later, first configure durable distributed rate limiting with Vercel Firewall, Vercel KV, Upstash or an equivalent service, then add the server-only OpenCode Go variables. Never expose the key through a `NEXT_PUBLIC_` variable.

Production also requires a random `MOCK_GATEWAY_SECRET` with at least 32 characters. It signs short-lived approval tokens for mock actions only.

## Verify

```bash
npm run typecheck
npm run lint
npm run test:coverage
npm run build
npm run test:e2e
```

## Architecture and evidence

- [`docs/architecture.md`](docs/architecture.md) describes the deterministic connector and provider boundaries.
- [`docs/codex-build-log.md`](docs/codex-build-log.md) is a sanitized public build record.
- [`docs/submission-summary.md`](docs/submission-summary.md) contains the hackathon summary.
- [`docs/demo-script.md`](docs/demo-script.md) contains the two-minute walkthrough.
- `/built-with-codex` exposes the build and verification evidence inside the app.

## Deployment

Deploy the repository as a Next.js project on Vercel. Deterministic demo mode needs only the mock-gateway secret:

```env
MOCK_GATEWAY_SECRET=<random 32+ character secret>
```

The module-local request limiter is defense-in-depth only and resets across Vercel instances. Before enabling runtime AI, add a durable edge or shared-store rate limit and then configure these optional server-only variables:

```env
AI_PROVIDER=opencode-go
AI_BASE_URL=https://opencode.ai/zen/go/v1
AI_MODEL=gpt-5.6-luna
AI_API_KEY=<server-only secret>
```

Keep the synthetic-data disclosure visible in every public deployment.
