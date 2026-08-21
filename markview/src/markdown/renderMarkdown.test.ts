import { describe, expect, it } from 'vitest';
import { renderMarkdown } from './renderMarkdown';

describe('renderMarkdown', () => {
  it('renders GitHub alerts with nested Markdown', async () => {
    const result = await renderMarkdown('> [!WARNING]\n> **Danger** and `code`.');
    expect(result.html).toContain('markdown-alert-warning');
    expect(result.html).toContain('<strong>Danger</strong>');
    expect(result.html).toContain('<code>code</code>');
    expect(result.html).not.toContain('[!WARNING]');
  });

  it('expands known emoji but leaves unknown colon text unchanged', async () => {
    const result = await renderMarkdown(':rocket: :warning: :not_a_markview_emoji:');
    expect(result.html).toContain('🚀');
    expect(result.html).toContain('⚠️');
    expect(result.html).toContain(':not_a_markview_emoji:');
  });

  it('parses and hides YAML front matter', async () => {
    const result = await renderMarkdown('---\ntitle: Architecture\nmarp: true\n---\n# Hello');
    expect(result.frontmatter).toEqual({ title: 'Architecture', marp: true });
    expect(result.html).not.toContain('title: Architecture');
    expect(result.html).toContain('<h1 id="hello">Hello</h1>');
  });

  it('renders definition lists and subscript/superscript alongside math', async () => {
    const result = await renderMarkdown('API\n: Application Programming Interface\n\nH~2~O and x^2^.\n\n$x^2$');
    expect(result.html).toContain('<dl>');
    expect(result.html).toContain('<dt>API</dt>');
    expect(result.html).toContain('<dd>Application Programming Interface');
    expect(result.html).toContain('H<sub>2</sub>O');
    expect(result.html).toContain('x<sup>2</sup>');
    expect(result.html).toContain('class="katex"');
  });

  it('renders only the fixed Lucide icon vocabulary', async () => {
    const result = await renderMarkdown(':lucide-database: DB :lucide-not-real:');
    expect(result.html).toContain('data-lucide-icon="database"');
    expect(result.html).toContain('aria-label="database icon"');
    expect(result.html).toContain(':lucide-not-real:');
  });

  it('sanitizes dangerous raw HTML while retaining safe markup', async () => {
    const source = '<script>alert(1)</script><img src="x" onerror="alert(1)"><a href="javascript:alert(1)">bad</a><iframe src="file:///secret"></iframe><kbd>Ctrl</kbd>';
    const result = await renderMarkdown(source);
    expect(result.html).not.toContain('<script');
    expect(result.html).not.toContain('onerror');
    expect(result.html).not.toContain('javascript:');
    expect(result.html).not.toContain('<iframe');
    expect(result.html).toContain('<kbd>Ctrl</kbd>');
  });

  it('keeps inline base64 images, which MarkView renders', async () => {
    const result = await renderMarkdown('![alt](data:image/png;base64,iVBORw0KGgo=)');
    expect(result.html).toContain('src="data:image/png;base64,iVBORw0KGgo="');
  });

  it('still refuses a javascript: URL on an image', async () => {
    const result = await renderMarkdown('<img src="javascript:alert(1)">');
    expect(result.html).not.toContain('javascript:');
  });

  it('collects stable unique heading ids', async () => {
    const result = await renderMarkdown('# Repeat\n\n## Repeat\n\n# 中文');
    expect(result.headings).toEqual([
      { level: 1, text: 'Repeat', id: 'repeat' },
      { level: 2, text: 'Repeat', id: 'repeat-1' },
      { level: 1, text: '中文', id: '中文' },
    ]);
  });
});
