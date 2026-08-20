import type { RenderBlockOptions } from './types';
import { safeSvgElement } from './svg';

let d2Promise: Promise<import('@terrastruct/d2').D2> | null = null;

export async function render({ source, theme }: RenderBlockOptions): Promise<HTMLElement> {
  d2Promise ??= import('@terrastruct/d2').then(({ D2 }) => new D2());
  const d2 = await d2Promise;
  const compiled = await (d2.compile as any)(source, {
    layout: 'dagre',
    themeID: theme === 'dark' ? 200 : 0,
    darkThemeID: 200,
  });
  const svgText = await d2.render(compiled.diagram, {
    ...compiled.renderOptions,
    themeID: theme === 'dark' ? 200 : 0,
    darkThemeID: 200,
    center: true,
    pad: 32,
    noXMLTag: true,
  });
  const wrapper = document.createElement('div');
  wrapper.className = 'd2-diagram';
  wrapper.appendChild(safeSvgElement(svgText));
  return wrapper;
}
