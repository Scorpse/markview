// @vitest-environment jsdom
import { describe, expect, it } from 'vitest';
import { renderRendererError } from './rendererError';

describe('renderRendererError', () => {
  it('keeps failed renderer source readable and copyable', () => {
    const host = document.createElement('pre');
    document.body.appendChild(host);
    renderRendererError(host, {
      rendererName: 'Mermaid',
      message: 'bad syntax',
      source: 'graph TD ???',
      className: 'mermaid-error',
    });

    expect(document.querySelector('.mermaid-error')?.textContent).toContain('bad syntax');
    expect(document.querySelector('.mermaid-error')?.textContent).toContain('graph TD ???');
    host.remove();
  });
});
