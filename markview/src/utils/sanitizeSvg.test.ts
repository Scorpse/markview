// @vitest-environment jsdom
import { beforeAll, describe, expect, it } from 'vitest';
import { sanitizeSvg } from './sanitizeSvg';

describe('sanitizeSvg', () => {
  it('strips scripts, event handlers, and JavaScript links from generated SVG', () => {
    const svg = sanitizeSvg('<svg xmlns="http://www.w3.org/2000/svg" onload="bad()"><script>bad()</script><a href="javascript:bad()"><text>Safe</text></a></svg>');
    expect(svg.querySelector('script')).toBeNull();
    expect(svg.getAttribute('onload')).toBeNull();
    expect(svg.querySelector('a')?.getAttribute('href')).toBeNull();
    expect(svg.textContent).toContain('Safe');
  });

  it('strips active content smuggled inside foreignObject HTML', () => {
    const svg = sanitizeSvg(
      '<svg xmlns="http://www.w3.org/2000/svg"><foreignObject>' +
        '<div xmlns="http://www.w3.org/1999/xhtml">' +
        '<script>bad()</script>' +
        '<img src="x" onerror="bad()"/>' +
        '<iframe src="file:///etc/passwd"></iframe>' +
        '<p>Visible</p>' +
        '</div></foreignObject></svg>',
    );
    expect(svg.querySelector('script')).toBeNull();
    expect(svg.querySelector('iframe')).toBeNull();
    expect(svg.querySelector('img')?.getAttribute('onerror')).toBeNull();
    expect(svg.textContent).toContain('Visible');
  });

  it('strips javascript: in xlink:href', () => {
    const svg = sanitizeSvg('<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink"><a xlink:href="javascript:bad()"><text>x</text></a></svg>');
    expect(svg.querySelector('a')?.getAttribute('xlink:href')).toBeNull();
  });

  it('rejects input whose root is not an SVG element', () => {
    expect(() => sanitizeSvg('<div>not svg</div>')).toThrow('Renderer returned invalid SVG');
    expect(() => sanitizeSvg('')).toThrow('Renderer returned invalid SVG');
  });

  it('preserves camelCase SVG attributes that renderers depend on', () => {
    const svg = sanitizeSvg('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 10 20" preserveAspectRatio="xMidYMid meet"></svg>');
    expect(svg.getAttribute('viewBox')).toBe('0 0 10 20');
    expect(svg.getAttribute('preserveAspectRatio')).toBe('xMidYMid meet');
  });

  // Regression: Mermaid serialises htmlLabels inside <foreignObject> as HTML,
  // so a line break emits a void <br>. An XML parse rejects that outright,
  // which replaced the whole diagram with a render error.
  it('accepts the void <br> that Mermaid emits for line-broken labels', () => {
    const svg = sanitizeSvg(
      '<svg xmlns="http://www.w3.org/2000/svg"><g class="node"><foreignObject width="100" height="40">' +
        '<div xmlns="http://www.w3.org/1999/xhtml" style="text-align: center;">' +
        '<span class="nodeLabel"><p>Line1<br>Line2</p></span>' +
        '</div></foreignObject></g></svg>',
    );
    expect(svg.textContent).toContain('Line1');
    expect(svg.textContent).toContain('Line2');
    expect(svg.querySelector('br')).not.toBeNull();
  });
});

// Hand-written fixtures cannot catch a serialisation detail of the real
// library, which is how the <br> case was missed. These drive Mermaid itself.
describe('sanitizeSvg against real Mermaid output', () => {
  beforeAll(() => {
    // jsdom implements no SVG layout; Mermaid only needs these to measure text.
    (SVGElement.prototype as unknown as Record<string, unknown>).getBBox = () => ({ x: 0, y: 0, width: 100, height: 20 });
    (SVGElement.prototype as unknown as Record<string, unknown>).getComputedTextLength = () => 100;
    (SVGElement.prototype as unknown as Record<string, unknown>).getScreenCTM = () => ({ a: 1, b: 0, c: 0, d: 1, e: 0, f: 0 });
  });

  async function renderMermaid(id: string, source: string): Promise<string> {
    const mermaid = (await import('mermaid')).default;
    mermaid.initialize({ startOnLoad: false, securityLevel: 'strict' });
    const { svg } = await mermaid.render(id, source);
    return svg;
  }

  it('survives a flowchart whose node label contains a line break', async () => {
    const svgText = await renderMermaid('t-br', 'flowchart TD\n  A[Line1<br/>Line2] --> B[End]');
    // Guard the premise: if Mermaid stops emitting a void <br>, this test would
    // otherwise keep passing while no longer covering the regression.
    expect(svgText).toMatch(/<br\s*\/?>/i);

    const svg = sanitizeSvg(svgText);
    expect(svg.localName).toBe('svg');
    expect(svg.textContent).toContain('Line1');
    expect(svg.textContent).toContain('End');
  }, 120000);

  it('survives an ordinary flowchart with no HTML in its labels', async () => {
    const svgText = await renderMermaid('t-plain', 'flowchart LR\n  UI --> API\n  API --> DB[(Postgres)]');
    const svg = sanitizeSvg(svgText);
    expect(svg.localName).toBe('svg');
    expect(svg.textContent).toContain('API');
  }, 120000);
});
