# Product Requirements: ChatKit Integration for Geuse Chat

## Document Control
- Version: 0.1 (Draft)
- Date: 2025-10-09
- Authors: Geuse Product Team (Codex support)

## Background
Geuse's marketing experience currently combines a WebGL-driven 3D interface (Three.js scenes defined in `src/index.js`) with a bespoke floating chat (lazy-loaded from `src/chat.js`) that forwards user requests to an n8n webhook (`config.js`). The homegrown chat delivers basic lead capture but lacks conversational AI depth, multimodal input, persistent history, or rich UI patterns. OpenAI's ChatKit provides an embeddable, themable chat UI backed by agent workflows and multimodal attachments. Integrating ChatKit should raise engagement, reduce bespoke maintenance, and pave the way for richer post-sales workflows.

## Problem Statement
Prospective clients expect AI-native chat support that can synthesize Geuse capabilities, collect requirements, and surface next steps in a single, cohesive conversation. The current widget is manually scripted, offers only one-step prompts, and is difficult to extend with file uploads or tool results. We need to replace the custom interface with ChatKit while preserving the immersive Geuse brand and minimizing backend changes by reusing n8n as the session broker.

## Goals & Objectives
1. Embed ChatKit within the existing Geuse chat entrypoint without breaking the 3D experience or gesture logic.
2. Use n8n to issue ChatKit client secrets so the frontend can authenticate against the OpenAI-hosted workflow.
3. Enable multimodal uploads, widgets, and prompt scaffolding to guide visitors through discovery conversations.
4. Maintain accessibility, performance, and analytics parity with the current chat while expanding observability.

### Success Metrics
- ≥35% increase in qualified chat conversations (defined as session with ≥3 assistant/user exchanges) within 30 days.
- ≥25% of sessions leverage attachments or widgets (signals deeper engagement).
- <2% session initialization failure rate (ChatKit client secret handshake via n8n).
- Lighthouse accessibility score for chat overlay remains ≥95.

### Non-Goals
- Replacing n8n automation flows beyond the session endpoint.
- Migrating deployments away from current Vite static hosting.
- Delivering full CRM hand-off or auth-gated experiences in this phase.

## Stakeholders
- Product: Geuse leadership (vision, prioritization)
- Engineering: Frontend (Three.js/Vite) team, Automation (n8n) owner
- Design/Brand: Visual and interaction designers
- Marketing/Ops: Lead qualification owners
- Compliance/Security: Data handling review

## User Personas
- **Prospective client**: Unauthenticated visitor exploring services; expects polished AI assistance, quick brief collection, ability to share files.
- **Geuse operator**: Internal team member monitoring conversations and n8n flows; needs visibility into session health, transcripts, and conversion metrics.
- **Developer/Integrator**: Maintains site and automation; wants minimal blast radius and clarity on upcoming extensibility.

## Key User Stories
1. As a prospective client, I click the floating Geuse chat icon and immediately see a branded assistant with suggested prompts.
2. As a visitor, I can upload reference files/images that inform the conversation without leaving the widget.
3. As the assistant, I can surface interactive cards (widgets) to collect project requirements and branch into follow-up forms.
4. As a Geuse operator, I can audit that each session was created by n8n with proper rate limits and track errors when ChatKit initialization fails.
5. As an engineer, I can toggle between legacy chat and ChatKit during rollout to validate KPIs.

## Product Scope & Requirements

### Experience Overview
- Retain the existing floating chat trigger created in `src/index.js` (`createChatIconSprite`) so the entry pattern stays consistent across desktop and mobile.
- When activated, load ChatKit within the same container currently used by the `Chat` class, replacing custom DOM rendering with `<ChatKit />` while keeping camera adjustments, gesture handlers, and focus management intact.
- Allow the user to collapse/expand the widget without losing conversation state unless they intentionally start a new thread.

### UX & Interaction Requirements
- Display a start screen greeting, short description of what the assistant can do, and 3–5 starter prompts (configurable via ChatKit options).
- Show conversation history for the active session with timestamps and assistant profile details that match Geuse branding.
- Provide visible indicators for file upload status, streaming responses, and tool/widget outputs.
- Ensure the widget respects the existing theme toggle (light/dark) triggered through `setupThemeToggle` by synchronizing ChatKit theme options with global theme manager state.
- Maintain full keyboard navigation (ARIA roles, focus trap) and provide screen reader hints for attachments, prompts, and widgets.

### Content & Prompting
- Agent instructions managed via OpenAI Agent Builder; include messaging that positions the assistant as “Geuse AI architect”.
- Prompt suggestions should align with marketing funnel (e.g., “Generate a project brief”, “Share my existing assets”, “Estimate implementation scope”).

### Multimodal & Attachments
- Enable hosted upload strategy with constraints: max 3 files per message, 20 MB per file, accepted types: PDF, PNG, JPG, MP4, DOCX.
- Provide user feedback on unsupported file types or size overages with actionable guidance.
- Ensure uploaded files are referenced in the n8n log for follow-up workflows.

### Widgets & Actions
- Support at least two custom widgets:
  - Project Brief form capturing sector, timelines, and budget via a Form card.
  - CTA card with buttons linking to scheduling or email.
- Widgets should use `widgets.onAction` to notify n8n (or downstream APIs) of user selections. Actions triggered within ChatKit must be logged and optionally echoed in the transcript.

### Accessibility & Localization
- ChatKit view must inherit font scaling and high-contrast settings already enforced in `chat.css`, ensuring WCAG 2.1 AA compliance.
- Support locale override (initially `en-US`; architecture should allow future locale switch via `locale` option).

### Error Handling & Fallbacks
- If fetching the client secret fails, show a branded error state with retry option and fallback link to email form.
- Maintain a feature flag to revert to legacy chat if ChatKit fails to initialize.

### Analytics & Observability
- Capture events for session start, session error, attachment upload, widget action, and conversation completion (≥3 exchanges).
- Integrate with existing analytics pipeline (e.g., dataLayer pushes or custom events) without breaking current metrics.
- n8n executions should log request metadata (IP, user agent) and response times for monitoring.

## Technical Requirements

### Architecture Overview
- **Frontend (Vite + Three.js)**: Loads ChatKit React SDK lazily alongside existing 3D scene, handles session token fetch from n8n, manages theming and gestures.
- **n8n Session Service**: Webhook workflow receiving POST requests from frontend, retrieving ChatKit session tokens via OpenAI API, optionally refreshing sessions, and enforcing rate limits/security.
- **OpenAI ChatKit (Host)**: Runs agent workflow defined in Agent Builder using hosted backend.
- Optional future path: self-hosted ChatKit server if advanced requirements emerge (`chatKitAdvanced.md`).

### Frontend Implementation
1. Install `@openai/chatkit-react` and load the ChatKit JS bundle in `index.html`.
2. Refactor `loadChat()` in `src/index.js` to mount a React root (or upgrade to use React within existing lazy-loaded module) that renders `<ChatKit control={control} />`.
3. Implement a new module (e.g., `src/modules/chatkitClient.js`) exporting `useGeuseChatKit` hook:
   - Wrap `useChatKit` to provide `getClientSecret`, `theme`, `starter prompts`, `attachments`, and widget handlers.
   - Sync theme by reading `getCurrentTheme()` and hooking into the MutationObserver already present in `src/index.js`.
4. Update gesture integration so `chat.setGestureHandler` equivalents map to ChatKit open/close events.
5. Remove outdated custom message rendering logic once feature parity is confirmed; keep component behind runtime flag until release.
6. Ensure bundler configuration (Vite) supports dynamic import of ChatKit without affecting initial paint metrics.

### n8n Session Endpoint Requirements
- Trigger: `Webhook` node (POST `/chatkit/session`) requiring a shared secret header to avoid unauthorized usage.
- Pre-processing: `Function` or `Set` node to validate payload (must include `deviceId`, optional `refresh_token`).
- HTTP Request to OpenAI:
  - URL: `https://api.openai.com/v1/chatkit/sessions`
  - Headers: `Authorization: Bearer {{$env.OPENAI_API_KEY}}`, `OpenAI-Beta: chatkit_beta=v1`, `Content-Type: application/json`
  - Body: `{ "workflow": { "id": $env.CHATKIT_WORKFLOW_ID }, "user": {{$json.deviceId}}, "client_secret": {{$json.currentClientSecret}} }` (include `client_secret` only during refresh).
- Post-processing: Map response to `{ "client_secret": $json.client_secret, "expires_at": $json.expires_at }`.
- Response: `Respond to Webhook` node returning HTTP 200 with JSON. On error, return HTTP 500 with sanitized message and log execution data.
- Rate limiting: Add `Rate Limit` node (e.g., max 30 requests/min) and optional queue mechanism to shield against abuse.
- Monitoring: Enable execution logging and connect to existing alerting (Slack/email) for failure notifications.
- Security: Store secrets via n8n environment variables; do not hardcode keys. Implement IP allowlist or captcha verification if bot traffic spikes.

### Security & Compliance
- Ensure frontend only calls n8n endpoint over HTTPS and includes CSRF mitigation (nonce header).
- PII handling: attachments and conversation content routed through OpenAI; update privacy policy accordingly.
- Data retention: define how long n8n retains logs and whether client secrets are redacted post-response.

### Performance
- Lazy-load ChatKit assets only when user interacts with chat icon.
- Maintain <150 ms added latency for session initialization by optimizing n8n workflow and caching device IDs if appropriate.
- Ensure ChatKit iframe/container maintains at least 60 fps in harmony with Three.js scene (pause non-essential animations when chat is open if needed).

### Testing Strategy
- Unit tests: new wrapper functions for `getClientSecret`, theme synchronization.
- Integration tests: Playwright scenario covering opening chat, receiving session token (mock n8n), sending message, uploading file.
- Regression: run existing visual regression tests to confirm Three.js scene unaffected.
- Staging validation: connect to staging Agent Builder workflow and staging n8n endpoint before production cutover.

### Deployment & Rollout
- Feature flag (e.g., `CHATKIT_ENABLED`) controlling whether the new widget loads; default off until QA complete.
- Deploy updated frontend to staging + production via existing Vite build pipeline.
- n8n workflow deployed to staging environment first; once validated, promote to production with versioning.
- Rollout plan: 10% traffic (flag-based), monitor metrics 48 hours, then 100% if KPIs met.

## Dependencies & Assumptions
- OpenAI account with ChatKit beta access and Agent Builder workflow ready by development start.
- n8n environment supports outbound HTTPS to api.openai.com.
- Existing analytics stack can ingest new events without schema changes.
- Team capacity available for React integration work (might require introducing lightweight React root into existing non-React code).

## Milestones & Timeline (Indicative)
| Phase | Target (weeks) | Owner | Key Deliverables |
| --- | --- | --- | --- |
| Discovery & Design | Week 0–1 | Product + Design | Finalized agent prompts, starter prompts, widget blueprints, security requirements |
| n8n Session Service | Week 1–2 | Automation | Webhook workflow, env secrets, unit tests, monitoring |
| Frontend Integration | Week 2–4 | Frontend | ChatKit embed behind flag, theming hookup, attachment UI, analytics events |
| UX Polish & Widgets | Week 4–5 | Frontend + Design | Custom widgets, tool actions, error states, accessibility audit |
| Beta Rollout | Week 5–6 | Product + Engineering | Staging verification, 10% traffic flag, KPI dashboard updates |
| Full Launch | Week 6+ | Cross-functional | Flag to 100%, legacy chat retirement plan, documentation handoff |

## Risks & Mitigations
- **Token issuance failure via n8n**: Implement retries/backoff and monitoring; keep legacy chat fallback ready.
- **Performance impact on 3D scene**: Profile with ChatKit open; throttle animations or adjust renderer quality.
- **Attachment abuse or large uploads**: Enforce size/type checks client-side and in ChatKit options; consider backend scanning.
- **Design misalignment**: Create shared theme tokens and review in ChatKit Studio early; involve design during QA.
- **ChatKit beta changes**: Subscribe to release notes; keep versioned configuration to adjust quickly.

## Open Questions
1. Do we need authenticated sessions (e.g., logged-in clients) in phase one or is anonymous use sufficient?
2. Should transcripts be echoed back into n8n for aggregation, and if so where are they stored?
3. Do we require multi-language support before launch?
4. What is the policy for attachment retention within OpenAI vs. local archival?
5. Will marketing need hooks to trigger follow-up emails automatically when certain widget actions fire?

## Appendix
- Reference docs: `chatkit.md`, `chatkit_custom_theme.md`, `chatKitWidgets.md`, `chatKitActions.md`, `chatKitAdvanced.md`.
- Existing implementation files: `src/index.js`, `src/chat.js`, `config.js`.
- Glossary: ChatKit - OpenAI's hosted chat UI; Agent Builder - visual workflow editor; n8n - automation platform used as Geuse backend.
