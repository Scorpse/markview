import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

describe('dark code palette', () => {
  it('overrides the bundled light Highlight.js foreground and token colors', () => {
    const css = readFileSync(new URL('../index.css', import.meta.url), 'utf8');

    expect(css).toContain("[data-theme='dark'] .markdown-body code.hljs");
    expect(css).toContain("[data-theme='dark'] .markdown-body .hljs-keyword");
    expect(css).toContain('color: #cdd6f4');
    expect(css).toContain('background: transparent');
  });
});
