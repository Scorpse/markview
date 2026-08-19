# AI Markdown Viewer Extension Design

## Goal

Extend MarkView into a fast, read-only viewer for common AI-generated Markdown while preserving its Tauri/React/Unified architecture and adding an Obsidian-style readable-line-length preference.

## Scope

The first release adds GitHub alerts, emoji shortcodes, YAML front matter, definition lists, subscript/superscript, a safe fixed vocabulary of Lucide icons, a persisted readable-line-length toggle, a centralized lazy fenced-block renderer registry, local Graphviz/DOT, D2, and Markmap rendering, and opt-in Marp slides. Mermaid and Vega move behind the same registry without behavior loss.

PlantUML, WaveDrom, structured non-Markdown viewers, and HTML preview are deferred. Raw HTML embedded in Markdown is parsed and sanitized; scripts, event handlers, dangerous URL protocols, iframe, object, and embed content remain blocked.

## Architecture

`renderMarkdown` owns the Unified pipeline and returns HTML, headings, and parsed front matter. Lightweight Remark plugins transform Markdown extensions before `remark-rehype`; `rehype-raw` and `rehype-sanitize` establish the security boundary before highlighting, KaTeX, and serialization.

Fenced blocks remain ordinary `<pre><code class="language-*">` output. `rendererRegistry` maps language aliases to lazy DOM renderer modules. A single document effect renders matching blocks, rerenders theme-sensitive blocks after theme changes, and preserves source plus a readable error on failure.

The Zustand store owns `readableLineLength`, defaulting to `true`. Existing app preference persistence stores it alongside theme and font size. MarkdownView selects either the current centered readable width or a fluid width with normal page padding.

## UX

The toolbar exposes a readable-line-length button with a clear tooltip and pressed state. Disabling it expands the document to all available content width. Re-enabling it restores the centered readable column. The choice survives restart.

Front matter is hidden from normal document flow but passed to Marp detection. Marp documents retain reader mode by default and expose an explicit slides mode. Invalid specialized blocks show an inline error and their source.

## Performance

Only the lightweight Markdown extensions are part of the normal path. Mermaid, Vega, Graphviz, D2, Markmap, and Marp packages are loaded through literal dynamic imports only when a matching block or mode exists. The production bundle report must show separate chunks for these engines.

## Testing

Vitest and jsdom cover parser behavior, sanitization, front matter, icon allowlisting, renderer lookup/aliases, error fallback, preference state, and width classes. Markdown fixtures cover individual extensions, mixed AI output, malformed renderers, and security inputs. Final verification runs the complete test suite, TypeScript/Vite production build, Rust checks, and dependency-license review.

