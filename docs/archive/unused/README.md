# Unused Assets Archive

This directory holds legacy or reference-only files that are no longer part of the runtime bundle. Each item was relocated from the active source tree to keep deployments lean while preserving historical context:

- `accessibility-enhancements.css` (formerly root) – superseded accessibility overrides that were never imported.
- `chat-enhanced.css` (formerly `src/styles/`) – placeholder stylesheet with no runtime usage.
- `dynamicTypeManager.js` (formerly `src/utils/`) – dormant iOS Dynamic Type helper not wired into the app.
- `Refrenceindex.html` (formerly `src/`) – unused HTML mock.
- `GeuseMaker QA Agent.json` (formerly `src/utils/`) – n8n workflow artifact.
- `api-proxy.js` (formerly `api/`) – empty placeholder for proxy logic.
- `test-webhook-fix.html` / `test-webhook.json` – local webhook fixtures.
- `dist/`, `playwright-report/`, `test-results/` – generated artifacts kept only for reference.

If any of these assets becomes relevant again, move it back to the appropriate source directory and update the build to include it.
