import type { RendererDefinition } from './types';

const renderers: readonly RendererDefinition[] = [
  { id: 'mermaid', languages: ['mermaid'], load: () => import('./mermaid') },
  { id: 'vega', languages: ['vega', 'vega-lite'], load: () => import('./vega') },
  { id: 'graphviz', languages: ['dot', 'graphviz'], load: () => import('./graphviz') },
  { id: 'd2', languages: ['d2'], load: () => import('./d2') },
  { id: 'markmap', languages: ['markmap'], load: () => import('./markmap') },
  { id: 'wavedrom', languages: ['wavedrom'], load: () => import('./wavedrom') },
];

export const specializedLanguages = renderers.flatMap((renderer) => [...renderer.languages]);

export function getRenderer(language: string): RendererDefinition | undefined {
  const normalized = language.toLowerCase();
  return renderers.find((renderer) => renderer.languages.includes(normalized));
}
