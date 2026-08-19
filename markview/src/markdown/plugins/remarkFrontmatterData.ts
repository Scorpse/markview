import { parse } from 'yaml';
import { visit } from 'unist-util-visit';

export function remarkFrontmatterData() {
  return (tree: any, file: any) => {
    file.data.frontmatter = {};
    visit(tree, 'yaml', (node: any) => {
      if (Object.keys(file.data.frontmatter).length > 0) return;
      try {
        const value = parse(node.value);
        file.data.frontmatter = value && typeof value === 'object' && !Array.isArray(value) ? value : {};
      } catch {
        file.data.frontmatter = {};
      }
    });
  };
}
