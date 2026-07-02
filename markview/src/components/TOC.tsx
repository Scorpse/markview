import { useEffect, useState } from 'react';
import { useAppStore } from '../stores/appStore';

// Find the nearest scrollable ancestor so the scroll-spy tracks the element
// that actually scrolls (the content pane), not the window.
function getScrollParent(el: HTMLElement | null): HTMLElement | null {
  let node = el?.parentElement ?? null;
  while (node) {
    const overflowY = getComputedStyle(node).overflowY;
    if (/(auto|scroll|overlay)/.test(overflowY) && node.scrollHeight > node.clientHeight) {
      return node;
    }
    node = node.parentElement;
  }
  return null;
}

export default function TOC() {
  const headings = useAppStore((s) => s.headings);
  const [activeId, setActiveId] = useState<string>('');

  useEffect(() => {
    if (headings.length === 0) return;

    // Active = the last heading above a reading line near the top of the
    // viewport. Elements are looked up fresh on every pass so this stays
    // correct even if the rendered HTML is replaced (search, theme, etc).
    const computeActive = () => {
      const first = document.getElementById(headings[0].id);
      if (!first) return;
      const container = getScrollParent(first);
      const top = container ? container.getBoundingClientRect().top : 0;
      const viewport = container ? container.clientHeight : window.innerHeight;
      const line = top + viewport * 0.2;

      let currentId = headings[0].id;
      for (const h of headings) {
        const el = document.getElementById(h.id);
        if (!el) continue;
        if (el.getBoundingClientRect().top - line <= 1) currentId = h.id;
        else break;
      }

      // At the very bottom the last heading should win even if its section is
      // too short to ever reach the reading line.
      if (container && container.scrollTop + container.clientHeight >= container.scrollHeight - 2) {
        currentId = headings[headings.length - 1].id;
      }

      setActiveId(currentId);
    };

    const first = document.getElementById(headings[0].id);
    const scroller: EventTarget = getScrollParent(first) ?? window;
    scroller.addEventListener('scroll', computeActive, { passive: true });
    window.addEventListener('resize', computeActive);

    // Recompute once layout settles (theme, fonts, diagrams render after the
    // content is injected on a cold start and shift heading positions).
    const content = first?.closest('.markdown-body') ?? getScrollParent(first);
    const resizeObserver = new ResizeObserver(computeActive);
    if (content) resizeObserver.observe(content);

    computeActive();
    const raf = requestAnimationFrame(computeActive);

    return () => {
      cancelAnimationFrame(raf);
      scroller.removeEventListener('scroll', computeActive);
      window.removeEventListener('resize', computeActive);
      resizeObserver.disconnect();
    };
  }, [headings]);

  if (headings.length === 0) {
    return (
      <div className="p-4 text-sm text-gray-500 text-center mt-10">
        No headings found in this document.
      </div>
    );
  }

  const handleClick = (e: React.MouseEvent<HTMLAnchorElement>, id: string) => {
    e.preventDefault();
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth' });
      setActiveId(id);
    }
  };

  return (
    <div className="p-2 select-none">
      {headings.map((heading, i) => (
        <a
          key={i}
          href={`#${heading.id}`}
          onClick={(e) => handleClick(e, heading.id)}
          className={`block py-1 px-2 rounded text-sm truncate ${
            activeId === heading.id
              ? 'bg-[var(--link-color)] text-white font-medium'
              : 'hover:bg-[var(--hover-bg)] text-[var(--text-color)]'
          }`}
          style={{ paddingLeft: `${(heading.level - 1) * 12 + 8}px` }}
          title={heading.text}
        >
          {heading.text}
        </a>
      ))}
    </div>
  );
}
