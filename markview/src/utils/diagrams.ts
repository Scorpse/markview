// Substitutes rendered diagrams into the HTML string produced by the Markdown
// pipeline, before it is handed to React.
//
// This is deliberately the only place Mermaid and Vega output is produced.
// Rendering here — rather than mutating the DOM after React has committed it —
// keeps a single writer for the content: whatever is in renderedHTML is what is
// shown. Switching tabs cannot lose a diagram, because the SVG travels with the
// tab's HTML instead of living only in the DOM.
//
// The extension renderers (Graphviz, D2, Markmap, WaveDrom) come from the
// renderer registry and run over the same inert tree, so every diagram —
// upstream's two formats and the added ones alike — is produced here.

import { renderMermaidToSvg } from './mermaid';
import { renderVegaToSvg } from './vega';
import { safeSvgElement } from '../renderers/svg';
import { renderSpecializedBlocks } from '../renderers/renderBlocks';

const BLOCK_SELECTOR = 'code.language-mermaid, code.language-vega-lite, code.language-vega';

function errorBlock(label: string, kind: string, source: string, message: string) {
  const pre = document.createElement('pre');
  pre.className = `${kind}-error`;
  pre.textContent = `${label} render error:\n${message}\n\nSource:\n${source}`;
  return pre;
}

/**
 * Renderer output is injected after the sanitising pipeline has already run, so
 * it is scrubbed here instead — same treatment the registry renderers get.
 */
function wrap(className: string, svg: string) {
  const div = document.createElement('div');
  div.className = className;
  div.appendChild(safeSvgElement(svg));
  return div;
}

/**
 * Replace every Mermaid / Vega code block in `html` with its rendered SVG and
 * return the rewritten HTML. A block that fails to render becomes an error
 * block carrying its source, so one bad diagram never costs the whole document.
 */
export async function renderDiagramsInHtml(html: string, theme: 'light' | 'dark'): Promise<string> {
  // A <template> parses the markup into an inert tree — not part of the
  // document, nothing renders, nothing is fetched.
  const template = document.createElement('template');
  template.innerHTML = html;

  const blocks = Array.from(template.content.querySelectorAll<HTMLElement>(BLOCK_SELECTOR));

  for (const codeEl of blocks) {
    const source = codeEl.textContent ?? '';
    const host = codeEl.closest('pre') ?? codeEl;

    if (codeEl.classList.contains('language-mermaid')) {
      try {
        host.replaceWith(wrap('mermaid-diagram', await renderMermaidToSvg(source, theme)));
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        host.replaceWith(errorBlock('Mermaid', 'mermaid', source, message));
      }
    } else {
      const mode = codeEl.classList.contains('language-vega') ? 'vega' : 'vega-lite';
      try {
        host.replaceWith(wrap('vega-chart', await renderVegaToSvg(source, mode, theme)));
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        host.replaceWith(errorBlock('Vega', 'vega', source, message));
      }
    }
  }

  // The extension renderers (Graphviz, D2, Markmap, WaveDrom) run over the same
  // inert tree, so every diagram is produced in one place and travels with the
  // tab's HTML rather than living only in the committed DOM.
  await renderSpecializedBlocks(template.content, theme);

  return template.innerHTML;
}
