# Changelog

All notable changes to this fork are documented here. This project follows
[Semantic Versioning](https://semver.org/) and continues MarkView's version line.

## [1.3.0] — unreleased

First release of the community continuation. Opens a new minor line carrying every fix and
addition below. Upstream
[scos-lab/markview](https://github.com/scos-lab/markview) became feature-frozen in August 2026;
this fork carries the project forward under the same MIT license.

### Added

- **Structured file viewers.** JSON and YAML render as collapsible trees with copy-value and
  copy-path controls; CSV/TSV and record-shaped JSONL render as sortable tables with sticky
  headers; TOML, INI, `.env`, `.conf` and `.properties` render as highlighted read-only source.
  Every viewer offers a raw-source toggle, and all of them reuse the existing tabs, width
  control, themes and file watching.
- **WaveDrom timing diagrams** (` ```wavedrom `), completing the local diagram set alongside
  Mermaid, Vega-Lite, Graphviz/DOT, D2 and Markmap. Sources are JavaScript object literals, so
  they are parsed with JSON5 rather than `eval` — document content never reaches an interpreter.
- **Hover controls on rendered diagrams** for copying the source or switching between the
  rendered output and its source. The render-error fallback carries a copy control too.
- **Four-step document width cycle** — narrow, wide, extra wide, full width. The choice is
  remembered, and an existing readable-line-length preference migrates on first launch.
- **Click-to-zoom for images.**

### Fixed

- **Relative images never loaded.** `convertFileSrc` was called on a path that had not been
  resolved against the open document's directory. Links and images now resolve correctly on both
  Windows and POSIX paths; relative `.md` links open in a new tab, and other local targets open
  in the system handler.
- **Diagrams did not render at all in packaged builds.** Rendering happened by mutating the DOM
  after React had committed it, and that path never produced output in the release build. All
  diagram formats are now produced in the Markdown pipeline before the HTML reaches React, so a
  diagram travels with its tab's HTML instead of living only in the DOM.
- **Mermaid labels containing a line break** were rejected by the SVG sanitiser. Mermaid
  serialises `htmlLabels` inside `<foreignObject>` as HTML, so a line break emits a void `<br>`,
  which fails a strict XML parse. Parsing now happens in HTML mode through an inert `<template>`;
  the active-content stripping is unchanged.
- **Markmap rendered blank.** It measures the SVG to lay out the tree, which returns zero in an
  inert tree; it now renders offscreen in the live document and is then detached. Its labels are
  also bound to the theme's text colour instead of its own default.
- **Inline base64 images were silently dropped.** The sanitiser allowed only `http`/`https` for
  `src` even though the viewer passes `data:` URLs through untouched. `javascript:` remains
  rejected.
- **The structured source view was unreadable in dark mode**, because the global highlight.js
  stylesheet paints an opaque light background.
- **`devtools` was referenced by a `cfg` but never declared as a Cargo feature**, so the
  `MARKVIEW_DEVTOOLS` hook was compiled out of every build while release bundles still carried
  webview inspector support. It is now a real, opt-in feature and `cargo check --release` is
  warning-free.

### Changed

- Mermaid and Vega now use the Markdown-pipeline rendering path rather than duplicate renderer
  registry entries, matching upstream. The registry covers the added formats only.
- `package.json` and `Cargo.toml` now declare `MIT` explicitly; `THIRD_PARTY_NOTICES.md` records
  `dompurify` and notes that `lightningcss` and `caniuse-lite` are build-time only.
- The README now identifies this repository as the community continuation and points downloads
  here. The upstream Microsoft Store, Snap and Flathub listings are frozen at 1.0.5 and are not
  updated by this fork.

### Upstream

- Merged upstream's final state (`scos-lab/markview` at `434aa23`), which includes the merged
  security hardening (#8), the readable-line-length toggle (#7), the pipeline diagram rendering
  (#5), and upstream's feature-freeze notices. Upstream now links this repository as the
  community continuation; no further releases are cut there.
- Where the two overlapped, this fork's implementations were kept and upstream's duplicates
  removed, so there is a single sanitiser (`renderers/svg.ts`), a single sanitise schema and a
  single diagram path rather than two that could drift apart.

### Notes

- Startup cost is unchanged: the ordinary application chunk stays at 499.38 kB (176.91 kB gzip).
  Every renderer and viewer is lazy-loaded.
- Automated checks: 24 → 100.
- Ships Windows (MSI, NSIS) and Linux (`.deb`, `.rpm`, AppImage) builds through GitHub Releases.
- The Flatpak and Snap manifests, the AppStream metainfo and the Snap desktop entry are
  re-identified from `io.github.scos-lab.MarkView` to `io.github.Scorpse.MarkView`, which this
  project actually owns. Because the new id contains no hyphen, the manifest no longer needs the
  `sed` rewrite that existed only to reconcile the hyphen with Flatpak's underscore rule. Neither
  channel is submitted to yet; the Snap name `markview-reader` is still upstream's registration
  and would need a new name before publishing.
