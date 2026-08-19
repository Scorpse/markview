import { describe, expect, it } from 'vitest';
import { getRenderer, specializedLanguages } from './registry';

describe('renderer registry', () => {
  it.each([
    ['mermaid', 'mermaid'],
    ['vega', 'vega'],
    ['vega-lite', 'vega'],
    ['dot', 'graphviz'],
    ['graphviz', 'graphviz'],
    ['d2', 'd2'],
    ['markmap', 'markmap'],
    ['wavedrom', 'wavedrom'],
  ])('maps %s to %s', (language, id) => {
    expect(getRenderer(language)?.id).toBe(id);
  });

  it('leaves ordinary and unknown code alone', () => {
    expect(getRenderer('typescript')).toBeUndefined();
    expect(getRenderer('')).toBeUndefined();
  });

  it('publishes every alias for the syntax-highlighting exclusion list', () => {
    expect(specializedLanguages).toEqual(['mermaid', 'vega', 'vega-lite', 'dot', 'graphviz', 'd2', 'markmap', 'wavedrom']);
  });
});
