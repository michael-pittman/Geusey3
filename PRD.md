Medium  Priority

public/sw.js:1 & generate-sw.js:19 both implement full service-worker logic independently, yet the generator never reads the template (SW_TEMPLATE_PATH is unused). Maintaining two divergent copies makes bug fixes error-prone—pick a single source (e.g., keep the template and have the generator inject metadata) so cache rules stay in sync.
src/utils/dynamicTypeManager.js:1 is never imported, so none of the iOS Dynamic Type logic (nor its runtime CSS injection) ships. It’s 220+ lines of dormant code that duplicates concerns covered by accessibility-enhancements.css; either wire it into the chat bootstrap or archive it.
src/chat.js:233 (cleanupInputHeightMeasurement) and src/chat.js:651 (getRenderingMetrics, updateMessage, deleteMessage) aren’t referenced anywhere. They read like future-facing hooks but currently add bundle weight without behavior—trim them or add callers/tests to justify their presence.
Low Priority

src/utils/sceneGenerators.js:162 exports sceneGenerators, yet only generateAllScenes is used; drop the map or expose a caller so tree-shaking can eliminate six extra exports.
accessibility-enhancements.css:1 isn’t imported by Vite, so its high-contrast/Dynamic Type overrides never load. If it’s superseded by chat.css, remove it; otherwise add an import in src/index.js.
src/styles/chat-enhanced.css:1 is a placeholder comment that never ships—safe to delete.
api/proxy.js:1 is empty, and nothing references the api/ directory; remove or flesh it out.
src/Refrenceindex.html:1, test-webhook-fix.html:1, and test-webhook.json:1 aren’t linked from the app or build scripts; archive them outside the build tree to avoid accidental deploys.
Remote sprite/gif URLs are hard-coded in three places (index.html:42, src/index.js:179, public/sw.js:19). Exposing a shared constant (or serving from public/media/) would prevent drift.
Unused Assets & Directories

public/media/fire.gif, public/media/glitch.gif, public/media/sprite.png duplicate the CDN assets but are never referenced—either serve them locally or remove the folder.
src/utils/GeuseMaker QA Agent.json:1 and src/BeetleGeusePrompt.md:1 look like n8n/LLM artifacts with no runtime usage; stash them under docs/ if they’re only reference material.
Empty archives: docs/archive/ and scripts/archive/ can be deleted until needed.
Generated output directories (dist/, playwright-report/, test-results/) don’t contribute to hosting the site; consider adding them to .gitignore to keep the repo clean.
.claude/agents/ui-designer.md:1 and root audit docs (ACCESSIBILITY_INTEGRATION_GUIDE.md, FONT_VALIDATION_REPORT.md, etc.) are fine to keep for reference but aren’t part of the deployed bundle.