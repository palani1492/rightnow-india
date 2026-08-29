# RightNow India submission package

## Submission checklist

- Live public link: https://rightnow-india.vercel.app/
- Demo video: record and upload a public or unlisted video no longer than two minutes.
- Project summary: use the copy below. It is under 250 words.
- Codex evidence: link `/built-with-codex` and keep the build log in the repository.
- Partner email: leave blank for a solo submission; otherwise use the teammate's registered email.
- Mock credentials: none. RightNow opens without login.

The registration form also asks for the entrant's name, email, WhatsApp number, age, solo or team status, profession, finale attendance availability, and agreement. Do not place API keys, personal IDs, OTPs, real documents, or government credentials in the form, video, or app.

## Project summary (202 words)

RightNow India is an independent, agentic reimagining of how citizens navigate life changes. Instead of knowing a department, scheme, or form, a person describes anything that changed in their own words.

With explicit consent, AI routes the description into a specific, reviewable simulation. It can handle open-ended requests such as renewing a passport, correcting a certificate, arranging support for a parent, moving states, losing work, or starting a shop. Verified demo connectors deepen selected public-service situations with non-sensitive questions, official-source links, and deterministic readiness rules. If AI is unavailable or declined, safe guided routing and a generic fallback still prevent dead ends.

Every output is deliberately a simulation. The citizen reviews the proposed steps, chooses what to include, and creates a clearly marked mock record in a local civic inbox. RightNow never claims verified eligibility, never uploads documents, and never contacts identity, payment, OTP, emergency, police, government, or application systems.

Codex shaped the open-ended routing architecture, built the frontend and mock backend, wrote unit, integration, and browser tests, and supported accessibility, security, and trust reviews. GPT-5.6 Luna through OpenCode Go powers runtime planning; schema validation and deterministic code keep model output away from official eligibility decisions.

## Two-minute video

Use [`docs/demo-script.md`](demo-script.md). Lead with an unlisted passport request, not a preset accelerator. Show explicit AI consent, the generated simulation disclaimer, consolidated review, the mock inbox record, then one source-linked verified accelerator. Close on `/built-with-codex` and the synthetic-data boundary.

## Final checks

- Record at 1080p, browser zoom 100%, with no personal tabs, bookmarks, notifications, or secrets visible.
- Use only synthetic descriptions.
- Keep the recording between 1:45 and 1:58.
- Test the video and live links in an incognito or signed-out browser.
- Confirm the deployed environment has `AI_PROVIDER`, `AI_BASE_URL`, `AI_MODEL`, `AI_API_KEY`, `MOCK_GATEWAY_SECRET`, and durable rate limiting configured.
- Run typecheck, lint, coverage, production build, and desktop/mobile browser tests against the final code.
