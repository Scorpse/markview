// @vitest-environment jsdom
import { describe, expect, it } from 'vitest';
import { sanitizeSvg } from './sanitizeSvg';

describe('sanitizeSvg', () => {
  it('strips scripts, event handlers, and JavaScript links from generated SVG', () => {
    const svg = sanitizeSvg('<svg xmlns="http://www.w3.org/2000/svg" onload="bad()"><script>bad()</script><a href="javascript:bad()"><text>Safe</text></a></svg>');
    expect(svg.querySelector('script')).toBeNull();
    expect(svg.getAttribute('onload')).toBeNull();
    expect(svg.querySelector('a')?.getAttribute('href')).toBeNull();
    expect(svg.textContent).toContain('Safe');
  });
});
