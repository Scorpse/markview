import { useEffect, useRef } from 'react';
import { useAppStore } from '../stores/appStore';
import { renderMarkdown } from '../markdown/renderMarkdown';

export function useMarkdown() {
  const rawMarkdown = useAppStore((s) => s.rawMarkdown);
  const activeTabId = useAppStore((s) => s.activeTabId);
  const pending = useRef(0);

  useEffect(() => {
    if (rawMarkdown) {
      const id = ++pending.current;
      renderMarkdown(rawMarkdown).then((result) => {
        if (id !== pending.current) return; // stale
        useAppStore.getState().updateActiveTab({
          renderedHTML: result.html,
          headings: result.headings,
          frontmatter: result.frontmatter,
        });
      }).catch((error) => {
        console.error("Failed to process markdown", error);
      });
    } else if (activeTabId) {
      useAppStore.getState().updateActiveTab({
        renderedHTML: '',
        headings: [],
        frontmatter: {},
      });
    }
  }, [rawMarkdown, activeTabId]);
}
