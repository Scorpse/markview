# AI Markdown Viewer Extension Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add secure AI-oriented Markdown extensions, fluid-width viewing, and lazy local technical renderers to MarkView.

**Architecture:** Keep Unified responsible for Markdown-to-HTML conversion and route specialized fenced blocks through one DOM renderer registry. Persist the readable-width preference in the existing app store and lazy-load every heavy renderer.

**Tech Stack:** Tauri 2, React 19, TypeScript, Vite, Zustand, Unified/Remark/Rehype, Vitest, jsdom.

**Spec:** `docs/superpowers/specs/2026-08-19-ai-markdown-viewer-design.md`

## Global Constraints

- Keep the app read-only and local-first.
- Preserve GFM, KaTeX, Mermaid, Vega, file associations, and Windows support.
- Sanitize raw HTML before it reaches React.
- Lazy-load Mermaid, Vega, Graphviz, D2, Markmap, and Marp.
- Renderer failure must retain readable source.
- Preserve MIT notices and record non-MIT dependencies.

---

### Task 1: Baseline and audit

**Files:**
- Create: `docs/RENDERER_AUDIT.md`
- Create: `tests/fixtures/markdown/mixed-ai-output.md`
- Modify: `markview/package.json`

**Interfaces:**
- Produces: a recorded baseline, Vitest test command, and repository architecture map used by all later tasks.

- [ ] Record the clean `npm ci && npm run build` result and current chunk sizes.
- [ ] Document parser, renderers, sanitization, theme, lazy loading, tests, and Tauri file commands.
- [ ] Add Vitest/jsdom and a `test` script, then verify an empty harness runs.

### Task 2: Secure Markdown pipeline and compatibility

**Files:**
- Create: `markview/src/markdown/renderMarkdown.ts`
- Create: `markview/src/markdown/plugins/*.ts`
- Test: `markview/src/markdown/renderMarkdown.test.ts`
- Modify: `markview/src/hooks/useMarkdown.ts`
- Modify: `markview/src/styles/markdown.css`

**Interfaces:**
- Produces: `renderMarkdown(source: string): Promise<{ html: string; headings: Heading[]; frontmatter: Record<string, unknown> }>`.
- Consumes: existing `Heading` and store tab-update interfaces.

- [ ] Write failing parser tests for alerts, emoji, front matter, definitions, sub/sup, Lucide allowlisting, math coexistence, and malicious HTML.
- [ ] Run the parser tests and confirm failures are caused by missing behavior.
- [ ] Implement the minimum plugins and sanitized Unified pipeline.
- [ ] Run parser tests and the production build until both pass.

### Task 3: Readable line length

**Files:**
- Modify: `markview/src/stores/appStore.ts`
- Modify: `markview/src/components/Toolbar.tsx`
- Modify: `markview/src/components/MarkdownView.tsx`
- Test: `markview/src/stores/appStore.test.ts`
- Test: `markview/src/components/MarkdownView.test.tsx`

**Interfaces:**
- Produces: `readableLineLength: boolean` and `setReadableLineLength(value: boolean)`.
- Consumes: existing preference persistence and toolbar icon conventions.

- [ ] Write failing tests proving the default is readable, toggling selects fluid width, and persistence restores the value.
- [ ] Run the tests and confirm the new state/UI behavior is absent.
- [ ] Add store state, persistence, toolbar control, and conditional layout classes.
- [ ] Run focused and full tests until green.

### Task 4: Specialized renderer registry

**Files:**
- Create: `markview/src/renderers/types.ts`
- Create: `markview/src/renderers/registry.ts`
- Create: `markview/src/renderers/renderBlocks.ts`
- Test: `markview/src/renderers/registry.test.ts`
- Test: `markview/src/renderers/renderBlocks.test.ts`
- Modify: `markview/src/components/MarkdownView.tsx`
- Modify: `markview/src/utils/mermaid.ts`
- Modify: `markview/src/utils/vega.ts`

**Interfaces:**
- Produces: `getRenderer(language)`, `renderSpecializedBlocks(container, theme, isCancelled)`, and renderer modules implementing one shared contract.

- [ ] Write failing alias, unknown-language, cancellation, and error-fallback tests.
- [ ] Run them and confirm registry behavior is missing.
- [ ] Implement the registry and adapt Mermaid/Vega behind it.
- [ ] Verify tests and confirm Vite emits separate Mermaid/Vega chunks.

### Task 5: Local technical renderers

**Files:**
- Create: `markview/src/renderers/graphviz.ts`
- Create: `markview/src/renderers/d2.ts`
- Create: `markview/src/renderers/markmap.ts`
- Test: `markview/src/renderers/registry.test.ts`
- Modify: `markview/src/styles/markdown.css`
- Modify: `markview/package.json`

**Interfaces:**
- Consumes: the shared fenced renderer contract.
- Produces: aliases `dot`, `graphviz`, `d2`, and `markmap`, all local and lazy.

- [ ] Extend registry tests with literal expected aliases and run red.
- [ ] Add maintained local rendering dependencies after checking licenses.
- [ ] Implement each renderer with SVG output, theme handling where supported, and shared source fallback.
- [ ] Run renderer tests and inspect production chunks.

### Task 6: Marp reader mode

**Files:**
- Create: `markview/src/components/MarpView.tsx`
- Modify: `markview/src/components/MarkdownView.tsx`
- Modify: `markview/src/stores/appStore.ts`
- Test: `markview/src/markdown/renderMarkdown.test.ts`
- Modify: `markview/package.json`

**Interfaces:**
- Consumes: parsed front matter with `marp: true`.
- Produces: an opt-in, lazy-loaded slide view that never changes the source.

- [ ] Write failing Marp detection and reader/slides-mode tests.
- [ ] Add a lazy Marp renderer and explicit mode control.
- [ ] Run tests and verify Marp stays out of the initial chunk.

### Task 7: Fixtures, notices, and final verification

**Files:**
- Create: `tests/fixtures/markdown/*.md`
- Create: `THIRD_PARTY_NOTICES.md`
- Modify: `README.md`

**Interfaces:**
- Consumes: all implemented behavior.
- Produces: a reproducible acceptance corpus and dependency attribution.

- [ ] Add fixtures for alerts, emoji, front matter, definitions, sub/sup, Mermaid, Vega, D2, Graphviz, Markmap, malformed blocks, mixed AI output, and malicious HTML.
- [ ] Run the full test suite and production build from a clean dependency install.
- [ ] Run Rust checks and inspect npm licenses/audit output.
- [ ] Confirm the initial chunk excludes every heavy renderer and document bundle sizes.

