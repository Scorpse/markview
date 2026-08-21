import { useEffect, useRef } from 'react';
import { unified } from 'unified';
import remarkParse from 'remark-parse';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import remarkRehype from 'remark-rehype';
import rehypeStringify from 'rehype-stringify';
import rehypeHighlight from 'rehype-highlight';
import rehypeKatex from 'rehype-katex';
import rehypeRaw from 'rehype-raw';
import rehypeSanitize from 'rehype-sanitize';
import { visit } from 'unist-util-visit';
import { useAppStore, Heading } from '../stores/appStore';
import { renderDiagramsInHtml } from '../utils/diagrams';
import { markdownSanitizeSchema } from '../utils/markdownSecurity';

// Build processor once at module level
let headingsCollector: Heading[] = [];
let headingCounter = 0;
const processor = unified()
  .use(remarkParse)
  .use(remarkGfm)
  .use(remarkMath)
  .use(() => (tree: any) => {
    headingsCollector = [];
    headingCounter = 0;
    const usedIds = new Set<string>();
    visit(tree, 'heading', (node: any) => {
      let text = '';
      visit(node, 'text', (textNode: any) => { text += textNode.value; });
      visit(node, 'inlineCode', (codeNode: any) => { text += codeNode.value; });
      // Support Unicode (Chinese, etc.) — keep word chars and Unicode letters
      let id = text.toLowerCase().replace(/[\s]+/g, '-').replace(/[^\p{L}\p{N}_-]+/gu, '');
      if (!id) id = `heading-${headingCounter}`;
      // Deduplicate
      if (usedIds.has(id)) {
        let n = 1;
        while (usedIds.has(`${id}-${n}`)) n++;
        id = `${id}-${n}`;
      }
      usedIds.add(id);
      headingCounter++;
      if (!node.data) node.data = {};
      if (!node.data.hProperties) node.data.hProperties = {};
      node.data.hProperties.id = id;
      headingsCollector.push({ level: node.depth, text, id });
    });
  })
  .use(remarkRehype, { allowDangerousHtml: true })
  .use(rehypeRaw)
  .use(rehypeSanitize, markdownSanitizeSchema)
  .use(rehypeHighlight, { plainText: ['mermaid', 'vega-lite', 'vega'] })
  .use(rehypeKatex)
  .use(rehypeStringify, { allowDangerousHtml: true });

export function useMarkdown() {
  const rawMarkdown = useAppStore((s) => s.rawMarkdown);
  const activeTabId = useAppStore((s) => s.activeTabId);
  const theme = useAppStore((s) => s.theme);
  const pending = useRef(0);

  // Diagrams carry the theme baked into their SVG, so a theme switch has to go
  // back through the pipeline — same path as a content change, no second one.
  useEffect(() => {
    if (rawMarkdown) {
      const id = ++pending.current;
      processor.process(rawMarkdown).then(async (file) => {
        if (id !== pending.current) return; // stale
        // Read the collector before the next await — it is module state and a
        // newer run would overwrite it.
        const headings = [...headingsCollector];
        const html = await renderDiagramsInHtml(String(file), theme);
        if (id !== pending.current) return; // superseded while rendering
        useAppStore.getState().updateActiveTab({ renderedHTML: html, headings });
      }).catch((error) => {
        console.error("Failed to process markdown", error);
      });
    } else if (activeTabId) {
      useAppStore.getState().updateActiveTab({
        renderedHTML: '',
        headings: [],
      });
    }
  }, [rawMarkdown, activeTabId, theme]);
}
