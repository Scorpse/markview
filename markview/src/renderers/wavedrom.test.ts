// @vitest-environment jsdom
import { describe, expect, it } from 'vitest';
import { render } from './wavedrom';

const SIGNAL = '{ signal: [ { name: "clk", wave: "p....." }, { name: "data", wave: "x.345x", data: "A B C" } ]}';

describe('wavedrom renderer', () => {
  it('renders an object-literal source to sanitized SVG', async () => {
    const element = await render({ source: SIGNAL, language: 'wavedrom', theme: 'light' });

    expect(element.className).toBe('wavedrom-diagram');
    const svg = element.querySelector('svg');
    expect(svg).not.toBeNull();
    expect(svg?.querySelector('script')).toBeNull();
  });

  it('renders with the dark skin without failing', async () => {
    const element = await render({ source: SIGNAL, language: 'wavedrom', theme: 'dark' });
    expect(element.querySelector('svg')).not.toBeNull();
  });

  it('rejects malformed sources so the block falls back to its source', async () => {
    await expect(render({ source: '{ signal: [ not an object', language: 'wavedrom', theme: 'light' }))
      .rejects.toThrow();
  });
});
