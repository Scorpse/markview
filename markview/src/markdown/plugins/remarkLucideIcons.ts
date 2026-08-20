import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { Brain, Database, Rocket, Server, Shield, TriangleAlert } from 'lucide-react';
import { visit } from 'unist-util-visit';

const icons = {
  brain: Brain,
  database: Database,
  rocket: Rocket,
  server: Server,
  shield: Shield,
  warning: TriangleAlert,
} as const;

export function remarkLucideIcons() {
  return (tree: any) => {
    visit(tree, 'text', (node: any, index: number | undefined, parent: any) => {
      if (index === undefined || !parent || typeof node.value !== 'string') return;
      const pattern = /:lucide-([a-z0-9-]+):/g;
      const children: any[] = [];
      let cursor = 0;
      let match: RegExpExecArray | null;

      while ((match = pattern.exec(node.value))) {
        const Icon = icons[match[1] as keyof typeof icons];
        if (!Icon) continue;
        if (match.index > cursor) children.push({ type: 'text', value: node.value.slice(cursor, match.index) });
        children.push({
          type: 'html',
          value: renderToStaticMarkup(createElement(Icon as any, {
            size: 16,
            className: 'markdown-lucide-icon',
            'data-lucide-icon': match[1],
            'aria-label': `${match[1]} icon`,
            role: 'img',
          })),
        });
        cursor = pattern.lastIndex;
      }

      if (children.length === 0) return;
      if (cursor < node.value.length) children.push({ type: 'text', value: node.value.slice(cursor) });
      parent.children.splice(index, 1, ...children);
      return index + children.length;
    });
  };
}
