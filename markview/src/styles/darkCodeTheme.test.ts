import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { contrastRatio } from '../utils/contrast';

const COLORED_HIGHLIGHT_CLASSES = [
  'doctag', 'keyword', 'template-tag', 'template-variable', 'type',
  'title', 'attr', 'attribute', 'literal', 'meta', 'number', 'operator',
  'variable', 'selector-attr', 'selector-class', 'selector-id', 'regexp',
  'string', 'built_in', 'symbol', 'comment', 'code', 'formula', 'name',
  'quote', 'selector-tag', 'selector-pseudo', 'subst', 'section', 'bullet',
  'emphasis', 'strong', 'addition', 'deletion',
];

describe('dark code palette', () => {
  it('overrides the bundled light Highlight.js foreground and token colors', () => {
    const css = readFileSync(new URL('../index.css', import.meta.url), 'utf8');

    expect(css).toContain("[data-theme='dark'] .markdown-body code.hljs");
    for (const className of COLORED_HIGHLIGHT_CLASSES) {
      expect(css, `missing dark override for .hljs-${className}`).toContain(`.hljs-${className}`);
    }
    expect(css).toContain('color: #cdd6f4');
    expect(css).toContain('background: transparent');

    const colors = [...css.matchAll(/color:\s*(#[\da-f]{6})/gi)].map((match) => match[1]);
    for (const color of colors) {
      expect(contrastRatio(color, '#313244'), `${color} is below 4.5:1`).toBeGreaterThanOrEqual(4.5);
    }
  });
});
