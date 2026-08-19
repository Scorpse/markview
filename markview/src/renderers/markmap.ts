import type { RenderBlockOptions } from './types';

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
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('aria-label', 'Mind map');
  svg.setAttribute('role', 'img');
  wrapper.appendChild(svg);
  const markmap = Markmap.create(svg, {
    autoFit: true,
    duration: 0,
    color: theme === 'dark'
      ? () => '#8ab4f8'
      : () => '#0969da',
  }, root);
  await markmap.fit();
  return wrapper;
}
