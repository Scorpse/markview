import { renderVegaSource } from '../utils/vega';
import type { RenderBlockOptions } from './types';

export async function render({ source, language, theme }: RenderBlockOptions): Promise<HTMLElement> {
  return renderVegaSource(source, language === 'vega' ? 'vega' : 'vega-lite', theme);
}
