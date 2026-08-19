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
