// @vitest-environment jsdom
import { describe, expect, it } from 'vitest';
import { safeSvgElement } from './svg';

describe('safeSvgElement', () => {
  it('strips active content from renderer-produced SVG', () => {
    const svg = safeSvgElement('<svg xmlns="http://www.w3.org/2000/svg" onload="bad()"><script>bad()</script><a href="javascript:bad()"><text>Safe label</text></a></svg>');
    expect(svg.querySelector('script')).toBeNull();
    expect(svg.getAttribute('onload')).toBeNull();
    expect(svg.querySelector('a')?.getAttribute('href')).toBeNull();
    expect(svg.textContent).toContain('Safe label');
  });
});
