import { unified } from 'unified';
import remarkParse from 'remark-parse';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import remarkEmoji from 'remark-emoji';
import remarkFrontmatter from 'remark-frontmatter';
import remarkSupersub from 'remark-supersub';
import { remarkDefinitionList, defListHastHandlers } from 'remark-definition-list';
import remarkRehype from 'remark-rehype';
import rehypeHighlight from 'rehype-highlight';
import rehypeKatex from 'rehype-katex';
import rehypeStringify from 'rehype-stringify';
import { visit } from 'unist-util-visit';
import type { Heading } from '../stores/appStore';
import { rehypeAlerts } from './plugins/rehypeAlerts';
import { remarkFrontmatterData } from './plugins/remarkFrontmatterData';
import { remarkLucideIcons } from './plugins/remarkLucideIcons';
import { specializedLanguages } from '../renderers/registry';
import { renderDiagramsInHtml } from '../utils/diagrams';

export interface RenderedMarkdown {
  html: string;
  headings: Heading[];
  frontmatter: Record<string, unknown>;
}

function headingCollector(headings: Heading[]) {
  return () => (tree: any) => {
    let headingCounter = 0;
    const usedIds = new Set<string>();
    visit(tree, 'heading', (node: any) => {
      let text = '';
      visit(node, (child: any) => {
        if (child !== node && (child.type === 'text' || child.type === 'inlineCode')) text += child.value;
      });
      let id = text.toLowerCase().replace(/[\s]+/g, '-').replace(/[^\p{L}\p{N}_-]+/gu, '');
      if (!id) id = `heading-${headingCounter}`;
      const base = id;
      let suffix = 1;
      while (usedIds.has(id)) id = `${base}-${suffix++}`;
      usedIds.add(id);
      headingCounter++;
      node.data ??= {};
      node.data.hProperties ??= {};
      node.data.hProperties.id = id;
      headings.push({ level: node.depth, text, id });
    });
  };
}

export async function renderMarkdown(
  source: string,
  theme: 'light' | 'dark' = 'light',
): Promise<RenderedMarkdown> {
  const headings: Heading[] = [];
  const processor = unified()
    .use(remarkParse)
    .use(remarkFrontmatter, ['yaml'])
    .use(remarkFrontmatterData)
    .use(remarkSupersub)
    .use(remarkGfm, { singleTilde: false })
    .use(remarkMath)
    .use(remarkDefinitionList)
    .use(remarkEmoji)
    .use(remarkLucideIcons)
    .use(headingCollector(headings))
    .use(remarkRehype, { allowDangerousHtml: true, handlers: defListHastHandlers })
    .use(rehypeAlerts)
    .use(rehypeHighlight, { plainText: ['mermaid', 'vega', 'vega-lite', ...specializedLanguages] })
    .use(rehypeKatex)
    .use(rehypeStringify, { allowDangerousHtml: true });

  const file = await processor.process(source);
  return {
    html: await renderDiagramsInHtml(String(file), theme),
    headings,
    frontmatter: (file.data.frontmatter as Record<string, unknown>) ?? {},
  };
}
