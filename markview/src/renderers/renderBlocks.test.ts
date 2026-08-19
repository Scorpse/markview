// @vitest-environment jsdom
import { describe, expect, it, vi } from 'vitest';
import { renderSpecializedBlocks } from './renderBlocks';

describe('renderSpecializedBlocks', () => {
  it('keeps source readable when a specialized renderer fails', async () => {
    const container = document.createElement('div');
    container.innerHTML = '<pre><code class="language-mermaid">invalid diagram</code></pre>';
    document.body.appendChild(container);
    const loader = vi.fn().mockResolvedValue({
      render: vi.fn().mockRejectedValue(new Error('bad syntax')),
    });

    await renderSpecializedBlocks(container, 'light', () => false, () => ({ id: 'mermaid', languages: ['mermaid'], load: loader }));

    expect(container.querySelector('.specialized-renderer-error')?.textContent).toContain('bad syntax');
    expect(container.textContent).toContain('invalid diagram');
    container.remove();
  });

  it('does not load anything after cancellation', async () => {
    const container = document.createElement('div');
    container.innerHTML = '<pre><code class="language-mermaid">graph TD</code></pre>';
    const loader = vi.fn();

    await renderSpecializedBlocks(container, 'dark', () => true, () => ({ id: 'mermaid', languages: ['mermaid'], load: loader }));

    expect(loader).not.toHaveBeenCalled();
    expect(container.querySelector('code.language-mermaid')).not.toBeNull();
  });
});
