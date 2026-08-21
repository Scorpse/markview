// Substitutes rendered diagrams into the HTML string produced by the markdown
// pipeline, before it is handed to React.
//
// This is deliberately the only place diagrams are produced. Rendering them
// here — rather than mutating the DOM after React has committed it — keeps a
// single writer for the content: whatever is in renderedHTML is what is shown.
// Switching tabs cannot lose a diagram, because the SVG travels with the tab's
// HTML instead of living only in the DOM.

import { renderMermaidToSvg } from './mermaid';
import { renderVegaToSvg } from './vega';
import { renderRendererError } from './rendererError';
import { sanitizeSvg } from './sanitizeSvg';

const BLOCK_SELECTOR =
  'code.language-mermaid, code.language-vega-lite, code.language-vega';

function wrap(className: string, svg: string) {
  const div = document.createElement('div');
  div.className = className;
  div.replaceChildren(sanitizeSvg(svg));
  return div;
}

/**
 * Replace every mermaid / vega code block in `html` with its rendered SVG.
 * Returns the rewritten HTML. Blocks that fail to render become error blocks,
 * so one bad diagram never costs us the rest of the document.
 */
export async function renderDiagramsInHtml(
  html: string,
  theme: 'light' | 'dark',
): Promise<string> {
  // A <template> parses the markup into an inert tree — not part of the
  // document, nothing renders, nothing observes it.
  const tpl = document.createElement('template');
  tpl.innerHTML = html;

  const blocks = Array.from(
    tpl.content.querySelectorAll<HTMLElement>(BLOCK_SELECTOR),
  );
  if (blocks.length === 0) return html;

  for (const codeEl of blocks) {
    const source = codeEl.textContent ?? '';
    const host = codeEl.closest('pre') ?? codeEl;

    if (codeEl.classList.contains('language-mermaid')) {
      try {
        host.replaceWith(wrap('mermaid-diagram', await renderMermaidToSvg(source, theme)));
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        renderRendererError(host, {
          rendererName: 'Mermaid', message: msg, source, className: 'mermaid-error',
        });
      }
    } else {
      const mode = codeEl.classList.contains('language-vega') ? 'vega' : 'vega-lite';
      try {
        host.replaceWith(wrap('vega-chart', await renderVegaToSvg(source, mode, theme)));
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        renderRendererError(host, {
          rendererName: 'Vega', message: msg, source, className: 'vega-error',
        });
      }
    }
  }

  return tpl.innerHTML;
}
