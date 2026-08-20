import { visit } from 'unist-util-visit';

const alertMeta = {
  note: { label: 'Note', icon: 'ℹ' },
  tip: { label: 'Tip', icon: '💡' },
  important: { label: 'Important', icon: '❗' },
  warning: { label: 'Warning', icon: '⚠' },
  caution: { label: 'Caution', icon: '⛔' },
} as const;

export function rehypeAlerts() {
  return (tree: any) => {
    visit(tree, 'element', (node: any) => {
      if (node.tagName !== 'blockquote') return;
      const paragraph = node.children?.find((child: any) => child.type === 'element' && child.tagName === 'p');
      const first = paragraph?.children?.[0];
      if (first?.type !== 'text') return;

      const match = /^\[!(NOTE|TIP|IMPORTANT|WARNING|CAUTION)\](?:\s*\n|\s+)/i.exec(first.value);
      if (!match) return;

      const kind = match[1].toLowerCase() as keyof typeof alertMeta;
      const meta = alertMeta[kind];
      first.value = first.value.slice(match[0].length);
      node.properties = {
        ...node.properties,
        className: ['markdown-alert', `markdown-alert-${kind}`],
        role: 'note',
      };
      node.children.unshift({
        type: 'element',
        tagName: 'p',
        properties: { className: ['markdown-alert-title'] },
        children: [
          { type: 'element', tagName: 'span', properties: { ariaHidden: 'true' }, children: [{ type: 'text', value: meta.icon }] },
          { type: 'text', value: ` ${meta.label}` },
        ],
      });
    });
  };
}
