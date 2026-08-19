import type { RenderBlockOptions } from './types';
import { safeSvgElement } from './svg';

let vizPromise: ReturnType<typeof import('@viz-js/viz')['instance']> | null = null;

export async function render({ source }: RenderBlockOptions): Promise<HTMLElement> {
  vizPromise ??= import('@viz-js/viz').then(({ instance }) => instance());
  const viz = await vizPromise;
  const generated = viz.renderSVGElement(source);
  const wrapper = document.createElement('div');
  wrapper.className = 'graphviz-diagram';
  wrapper.appendChild(safeSvgElement(generated.outerHTML));
  return wrapper;
}
