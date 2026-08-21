import type { RenderBlockOptions } from './types';

// Markmap measures the SVG to lay the tree out, so it needs a box with real
// geometry. Diagrams are produced against an inert tree that is never in the
// document, where every measurement would come back zero and the mind map would
// render blank. Render it offscreen in the live document instead, then detach —
// the computed geometry stays on the SVG, so the result travels with the HTML.
const OFFSCREEN_WIDTH = 900;
const OFFSCREEN_HEIGHT = 420;

export async function render({ source, theme }: RenderBlockOptions): Promise<HTMLElement> {
  const [{ Transformer }, { Markmap }] = await Promise.all([
    import('markmap-lib'),
    import('markmap-view'),
  ]);
  const transformer = new Transformer();
  transformer.md.set({ html: false });
  const { root } = transformer.transform(source);

  const wrapper = document.createElement('div');
  wrapper.className = 'markmap-diagram';
  wrapper.style.cssText = `position:fixed;left:-10000px;top:0;width:${OFFSCREEN_WIDTH}px;height:${OFFSCREEN_HEIGHT}px`;

  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('aria-label', 'Mind map');
  svg.setAttribute('role', 'img');
  svg.setAttribute('width', String(OFFSCREEN_WIDTH));
  svg.setAttribute('height', String(OFFSCREEN_HEIGHT));
  wrapper.appendChild(svg);

  document.body.appendChild(wrapper);
  try {
    const markmap = Markmap.create(svg, {
      autoFit: true,
      duration: 0,
      color: theme === 'dark'
        ? () => '#8ab4f8'
        : () => '#0969da',
    }, root);
    await markmap.fit();
  } finally {
    wrapper.remove();
    wrapper.removeAttribute('style');
  }

  return wrapper;
}
