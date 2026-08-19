// @vitest-environment jsdom
import { describe, expect, it, vi } from 'vitest';
import { renderSpecializedBlocks } from './renderBlocks';

function diagramLoader() {
  return vi.fn().mockResolvedValue({
    render: vi.fn().mockImplementation(async () => {
      const element = document.createElement('div');
      element.className = 'mermaid-diagram';
      element.textContent = 'rendered';
      return element;
    }),
  });
}

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

  it('offers copy and source controls beside a rendered diagram', async () => {
    const container = document.createElement('div');
    container.innerHTML = '<pre><code class="language-mermaid">graph TD</code></pre>';
    document.body.appendChild(container);

    await renderSpecializedBlocks(container, 'light', () => false, () => ({ id: 'mermaid', languages: ['mermaid'], load: diagramLoader() }));

    const controls = Array.from(container.querySelectorAll<HTMLButtonElement>('.renderer-controls button'));
    expect(controls.map((button) => button.textContent)).toEqual(['Copy source', 'Show source']);
    expect(container.querySelector('.renderer-source')?.hasAttribute('hidden')).toBe(true);
    container.remove();
  });

  it('toggles between the rendered diagram and its source', async () => {
    const container = document.createElement('div');
    container.innerHTML = '<pre><code class="language-mermaid">graph TD</code></pre>';
    document.body.appendChild(container);

    await renderSpecializedBlocks(container, 'light', () => false, () => ({ id: 'mermaid', languages: ['mermaid'], load: diagramLoader() }));

    const toggle = container.querySelectorAll<HTMLButtonElement>('.renderer-controls button')[1];
    const output = container.querySelector<HTMLElement>('.renderer-output')!;
    const source = container.querySelector<HTMLElement>('.renderer-source')!;

    toggle.click();
    expect(source.hidden).toBe(false);
    expect(output.hidden).toBe(true);
    expect(toggle.textContent).toBe('Show diagram');

    toggle.click();
    expect(source.hidden).toBe(true);
    expect(output.hidden).toBe(false);
    expect(toggle.textContent).toBe('Show source');
    container.remove();
  });

  it('restores the original fence before re-rendering', async () => {
    const container = document.createElement('div');
    container.innerHTML = '<pre><code class="language-mermaid">graph TD</code></pre>';
    document.body.appendChild(container);
    const lookup = () => ({ id: 'mermaid', languages: ['mermaid'], load: diagramLoader() });

    await renderSpecializedBlocks(container, 'light', () => false, lookup);
    await renderSpecializedBlocks(container, 'dark', () => false, lookup);

    expect(container.querySelectorAll('[data-specialized-renderer]')).toHaveLength(1);
    expect(container.querySelector('.renderer-output')?.textContent).toBe('rendered');
    container.remove();
  });
});
