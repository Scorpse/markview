# Renderer Audit

## Baseline

Audited upstream commit `3365b0b` (MarkView 1.0.5). `npm ci && npm run build` succeeds. Upstream has no test script or test files. The baseline Vite build emits an 859.40 kB main JavaScript chunk (260.44 kB gzip), a 758.81 kB Vega embed chunk, and multiple lazy Mermaid chunks. Vite reports chunks above 500 kB. `npm audit` reports 8 dependency findings (2 low, 3 moderate, 3 high) before fork changes.

## Current architecture

1. `src/hooks/useMarkdown.ts` is the Markdown entry point. It owns one module-level Unified processor and writes serialized HTML plus collected headings to the active Zustand tab.
2. The pipeline is `remark-parse` → `remark-gfm` → `remark-math` → custom heading collector → `remark-rehype` → `rehype-highlight` → `rehype-katex` → `rehype-stringify`.
3. Fenced blocks serialize as highlighted `<pre><code class="language-*">`. `MarkdownView.tsx` scans the resulting DOM after injection.
4. Mermaid rendering is in `src/utils/mermaid.ts` and is dynamically imported only after a Mermaid code block is found.
5. Vega/Vega-Lite rendering is in `src/utils/vega.ts` and dynamically imports `vega-embed` only after a matching block is found.
6. KaTeX is implemented with `remark-math`, `rehype-katex`, and globally imported KaTeX CSS.
7. Syntax highlighting uses `rehype-highlight` plus the GitHub highlight stylesheet. Mermaid and Vega languages are excluded from highlighting.
8. The current HTML policy is unsafe: `allowDangerousHtml` is enabled in both Remark-Rehype and stringification, no raw-HTML parser/sanitizer exists, and the result is passed to React through `dangerouslySetInnerHTML`.
9. Theme is stored in Zustand and passed from `MarkdownView` to Mermaid/Vega rerender functions. Renderer-specific colors otherwise come from shared CSS variables.
10. Mermaid and Vega use dynamic imports, but the baseline main chunk remains 859.40 kB gzip 260.44 kB. Mermaid diagram definitions are split into many chunks.
11. No test framework or coverage exists upstream.
12. Relevant Tauri commands are `read_file`, `open_file_dialog`, `watch_file`, `unwatch_file`, and `get_initial_file`. File association handling is in `src-tauri/src/lib.rs` and Windows registration helpers in `commands.rs`.
13. Specialized handling is hard-coded as two imports and two calls in one `MarkdownView` effect, with separate but nearly parallel DOM scanning/error/theme logic in `utils/mermaid.ts` and `utils/vega.ts`.

## Minimal refactor

Extract Markdown conversion into a testable function, add sanitization at the HAST boundary, and retain the hook only for store synchronization. Add a small registry whose entries contain language aliases and dynamic module loaders; keep DOM rendering because it matches the existing application and avoids replacing the Markdown pipeline or introducing a parallel React AST renderer. Move shared claim/source/error behavior into one runner while allowing each renderer to own library-specific rendering and theme configuration. Persist readable line length through the same preference path as theme and font size.

## Implemented result

The refactor above is implemented. The final ordinary application chunk is 499.38 kB (176.92 kB gzip), down from the 859.40 kB (260.44 kB gzip) baseline. Mermaid, Vega, Graphviz, D2, Markmap, and Marp are emitted as separate lazy chunks. D2's local compiler is the largest payload at 8.19 MB (5.99 MB gzip), but it is loaded only when a D2 fence exists. Marp is 3.63 MB (1.20 MB gzip) and loads only after the user selects Slides on a Marp document.

The fork adds 24 automated checks across Markdown behavior, sanitization, icon allowlisting, heading stability, renderer aliases/fallback, SVG active-content stripping, Marp detection, preference state, and document-width selection. A clean npm install reports zero vulnerabilities. `cargo check` succeeds with the upstream pre-existing warning that `devtools` is referenced as an undeclared Cargo feature.

## Follow-up pass

A later pass closed the remaining plan items that were still open after the first fork release.

1. WaveDrom joins the registry as the final Phase D renderer (`src/renderers/wavedrom.ts`). Sources are JavaScript object literals, so they are parsed with JSON5 rather than `eval` or WaveDrom's own `eva` helper; document content never reaches an interpreter. The generated SVG passes through the same `safeSvgElement` scrubber as Graphviz. Dark mode swaps in WaveDrom's `dark` skin, which is fetched as its own 44.11 kB chunk only when a dark-theme diagram exists.
2. `renderMarkdown.ts` no longer keeps its own copy of the specialized-language list; it imports `specializedLanguages` from the registry so the syntax-highlighting exclusion list cannot drift from the renderer aliases.
3. Rendered diagram blocks gain the hover toolbar from plan section 14.2. `renderBlocks.ts` now wraps each rendered element in a `.specialized-renderer` container holding a controls bar, the rendered output, and a hidden source `<pre>`. Copy and show-source/show-diagram toggling never discard the rendered element, and the existing restore-before-rerender path is unchanged because the data attributes still live on the wrapper.
4. Relative links and images now resolve against the directory of the open document (plan sections 14.3 and 14.4). `src/utils/resolvePath.ts` holds the string-only path logic for both Windows and POSIX; previously `convertFileSrc` was called on an unresolved relative path, so relative images did not load at all. Relative `.md` targets open in a MarkView tab, other local targets go to the OS handler, and clicking an image opens a full-size overlay.
5. The readable-line-length boolean becomes a four-step width cycle (narrow, wide, extra wide, full). The stored preference migrates from the old boolean on first launch.

The ordinary application chunk stays at 499.38 kB (176.91 kB gzip), unchanged from the previous fork build, because every addition is either lazy-loaded or pure CSS and path logic. Automated checks rise from 24 to 46.

## Structured viewers (plan section 10)

Phase G is implemented for JSON, YAML, JSONL, CSV/TSV and the read-only config formats. The shell, tabs, width control, theme tokens, recent files and file watching are reused; nothing here forks a second application architecture.

1. `src/viewers/fileKind.ts` maps a path to a `FileKind`. Anything not positively recognised as structured stays Markdown, so the previous behaviour for unknown extensions is unchanged. `src-tauri/src/lib.rs` carries the same extension list for the CLI argument and single-instance paths, and `open_file_dialog` gained matching filters.
2. `Tab` carries its `kind`, and `useMarkdown` only runs the Unified pipeline for Markdown tabs. Structured files never touch the Markdown parser.
3. `src/viewers/parseStructured.ts` holds every parser as a pure, total function: a malformed file returns its error rather than throwing. The delimited parser implements RFC 4180 quoting, so embedded delimiters, newlines and doubled quotes survive. JSONL keeps the good records when one line is bad.
4. `ValueTree` renders JSON and YAML as a collapsible tree with copy-value and copy-path controls. `DataTable` renders CSV and record-shaped JSONL with sticky headers and three-state sorting (ascending, descending, back to file order); numeric columns compare numerically.
5. Large-file safety is a 5,000-row cap on tabular views, and the row count reports how many rows were left out rather than silently truncating.
6. `StructuredView` is lazy-loaded from `App`, so none of this is in the startup path. The ordinary application chunk stays at 499.38 kB (176.91 kB gzip).

Not done in this pass: MarkView does not register as the OS handler for these extensions, since that would take `.json` away from the user's editor. In-document search still targets the Markdown HTML only, so it does not yet search structured views.

Automated checks rise from 46 to 93.
