# Third-party notices

MarkView remains licensed under the MIT License in `LICENSE`. The fork adds the following direct rendering and Markdown dependencies. Their full license texts are distributed in their npm packages and source repositories.

| Dependency | License | Purpose |
|---|---|---|
| `@terrastruct/d2` | Mozilla Public License 2.0 | Local D2 compilation and SVG rendering |
| `@viz-js/viz` | MIT | Local Graphviz/DOT rendering |
| `markmap-lib`, `markmap-view` | MIT | Local mind-map transformation and display |
| `@marp-team/marp-core` | MIT | Opt-in Marp slide rendering |
| `remark-emoji` | MIT | Emoji shortcodes |
| `remark-frontmatter` | MIT | YAML front-matter recognition |
| `remark-definition-list` | MIT | Definition-list syntax |
| `remark-supersub` | MIT | Subscript and superscript syntax |
| `rehype-raw`, `rehype-sanitize` | MIT | Safe raw-HTML parsing and sanitization |
| `yaml` | ISC | YAML metadata parsing |
| `wavedrom` | MIT | Local digital-timing-diagram rendering |
| `json5` | MIT | Parsing WaveDrom object-literal sources without evaluating them |
| `dompurify` | MPL-2.0 OR Apache-2.0 | Sanitisation inside Mermaid; ships in the Mermaid chunk |

No document or diagram source is sent to a hosted rendering service. D2's MPL-2.0 obligations apply to modifications of D2's covered files; this fork consumes the unmodified npm package as a dynamically loaded dependency.

Build-time tooling carries its own licences that are not distributed with the application binary: `lightningcss` (MPL-2.0) and `caniuse-lite` (CC-BY-4.0) are used only while building. MPL-2.0 obligations attach to modifications of the covered files; this project consumes all of them unmodified.
