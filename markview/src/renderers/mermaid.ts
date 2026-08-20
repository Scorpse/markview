import { renderMermaidSource } from '../utils/mermaid';
import type { RenderBlockOptions } from './types';

export async function render({ source, theme }: RenderBlockOptions): Promise<HTMLElement> {
  return renderMermaidSource(source, theme);
}
