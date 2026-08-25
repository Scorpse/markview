import { describe, expect, it } from 'vitest';
import { unified } from 'unified';
import remarkParse from 'remark-parse';
import remarkRehype from 'remark-rehype';
import rehypeRaw from 'rehype-raw';
import rehypeSanitize from 'rehype-sanitize';
import rehypeStringify from 'rehype-stringify';
import { markdownSanitizeSchema } from './markdownSecurity';

function render(source: string) {
  return unified()
    .use(remarkParse)
    .use(remarkRehype, { allowDangerousHtml: true })
    .use(rehypeRaw)
    .use(rehypeSanitize, markdownSanitizeSchema)
    .use(rehypeStringify)
    .process(source);
}

describe('Markdown HTML security', () => {
  it('removes executable HTML while retaining useful safe markup', async () => {
    const source = '<script>alert(1)</script><img src="x" onerror="alert(1)"><a href="javascript:alert(1)">bad</a><iframe src="file:///secret"></iframe><kbd>Ctrl</kbd>';
    const result = await unified()
      .use(remarkParse)
      .use(remarkRehype, { allowDangerousHtml: true })
      .use(rehypeRaw)
      .use(rehypeSanitize, markdownSanitizeSchema)
      .use(rehypeStringify)
      .process(source);

    const html = String(result);
    expect(html).not.toContain('<script');
    expect(html).not.toContain('onerror');
    expect(html).not.toContain('javascript:');
    expect(html).not.toContain('<iframe');
    expect(html).toContain('<kbd>Ctrl</kbd>');
  });

  it('keeps inline base64 images, which MarkView renders', async () => {
    const html = String(await render('![alt](data:image/png;base64,iVBORw0KGgo=)'));
    expect(html).toContain('src="data:image/png;base64,iVBORw0KGgo="');
  });

  it('leaves link protocols untouched when widening image protocols', async () => {
    const html = String(await render('[a](https://example.com) [b](mailto:x@example.com)'));
    expect(html).toContain('href="https://example.com"');
    expect(html).toContain('href="mailto:x@example.com"');
  });

  it('still refuses a javascript: URL on an image', async () => {
    const html = String(await render('<img src="javascript:alert(1)">'));
    expect(html).not.toContain('javascript:');
  });
});
