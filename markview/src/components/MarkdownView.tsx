import { lazy, Suspense, useEffect, useRef, useMemo, useState } from 'react';
import { open } from '@tauri-apps/plugin-shell';
import { convertFileSrc } from '@tauri-apps/api/core';
import { useAppStore } from '../stores/appStore';
import { documentWidthClass } from './documentLayout';
import { isMarpDocument } from '../markdown/marp';
import { isAbsolutePath, isMarkdownPath, resolveRelativePath, stripLinkSuffix } from '../utils/resolvePath';

const MarpView = lazy(() => import('./MarpView'));

function escapeRegex(s: string) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/** Markdown link/image targets are percent-encoded; filesystem paths are not. */
function decodeTarget(target: string): string {
  try {
    return decodeURIComponent(target);
  } catch {
    return target;
  }
}

/** True for URLs with a scheme, such as http: or mailto:. */
function isRemote(target: string): boolean {
  return /^[a-z][a-z0-9+.-]*:/i.test(target) && !isAbsolutePath(target);
}

interface MarkdownViewProps {
  loadFile: (path: string) => void;
}

export default function MarkdownView({ loadFile }: MarkdownViewProps) {
  const renderedHTML = useAppStore((s) => s.renderedHTML);
  const searchQuery = useAppStore((s) => s.searchQuery);
  const currentMatch = useAppStore((s) => s.currentMatch);
  const documentWidth = useAppStore((s) => s.documentWidth);
  const currentFile = useAppStore((s) => s.currentFile);
  const frontmatter = useAppStore((s) => s.frontmatter);
  const rawMarkdown = useAppStore((s) => s.rawMarkdown);
  const activeTabId = useAppStore((s) => s.activeTabId);
  const [slidesMode, setSlidesMode] = useState(false);
  const [zoomedImage, setZoomedImage] = useState<string | null>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const marpDocument = isMarpDocument(frontmatter);

  useEffect(() => setSlidesMode(false), [activeTabId]);

  // Compute highlighted HTML from string (no DOM manipulation)
  const { displayHTML, matchCount } = useMemo(() => {
    if (!searchQuery || !renderedHTML) return { displayHTML: renderedHTML, matchCount: 0 };

    let count = 0;
    const escaped = escapeRegex(searchQuery);
    const regex = new RegExp(escaped, 'gi');

    // Split HTML into tags and text, only highlight in text segments
    const parts = renderedHTML.split(/(<[^>]*>)/);
    const highlighted = parts.map(part => {
      if (part.startsWith('<')) return part;
      return part.replace(regex, (match) => {
        count++;
        const bg = count === currentMatch ? '#f97316' : '#fbbf24';
        return `<mark data-search="${count}" style="background-color:${bg};color:#000;border-radius:2px;padding:1px 2px">${match}</mark>`;
      });
    }).join('');

    return { displayHTML: highlighted, matchCount: count };
  }, [renderedHTML, searchQuery, currentMatch]);

  // Sync match count to store
  useEffect(() => {
    const state = useAppStore.getState();
    if (state.searchMatches !== matchCount) {
      state.setSearchMatches(matchCount);
    }
    if (matchCount > 0 && state.currentMatch === 0) {
      state.setCurrentMatch(1);
    }
    if (matchCount === 0 && state.currentMatch !== 0) {
      state.setCurrentMatch(0);
    }
  }, [matchCount]);

  // Scroll to current match
  useEffect(() => {
    if (currentMatch < 1) return;
    requestAnimationFrame(() => {
      const el = contentRef.current?.querySelector(`mark[data-search="${currentMatch}"]`) as HTMLElement;
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    });
  }, [currentMatch, displayHTML]);

  // Link click handler
  useEffect(() => {
    const container = contentRef.current;
    if (!container) return;

    const handleLinkClick = async (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      const anchor = target.closest('a');
      if (!anchor) return;

      const href = anchor.getAttribute('href');
      if (!href) return;

      const scrollToAnchor = (id: string) => {
        const targetEl = document.getElementById(id);
        if (targetEl) targetEl.scrollIntoView({ behavior: 'smooth' });
      };

      if (href.startsWith('http://') || href.startsWith('https://')) {
        e.preventDefault();
        try {
          await open(href);
        } catch (err) {
          console.error('Failed to open external link', err);
        }
        return;
      }

      if (href.startsWith('#')) {
        e.preventDefault();
        scrollToAnchor(href.substring(1));
        return;
      }

      if (isRemote(href)) return;

      // Relative target: resolve against the directory of the open document.
      e.preventDefault();
      const { path, hash } = stripLinkSuffix(decodeTarget(href));
      if (!path) {
        if (hash) scrollToAnchor(hash);
        return;
      }
      if (!currentFile) return;

      const resolved = resolveRelativePath(currentFile, path);
      if (isMarkdownPath(resolved)) {
        loadFile(resolved);
        return;
      }
      try {
        await open(resolved);
      } catch (err) {
        console.error('Failed to open local link', resolved, err);
      }
    };

    container.addEventListener('click', handleLinkClick);
    return () => container.removeEventListener('click', handleLinkClick);
  }, [displayHTML, currentFile, loadFile]);

  // Image src conversion
  useEffect(() => {
    const container = contentRef.current;
    if (!container) return;

    const images = container.querySelectorAll('img');
    images.forEach(img => {
      const src = img.getAttribute('src');
      if (!src || src.startsWith('data:') || isRemote(src)) return;
      const decoded = decodeTarget(src);
      const absolute = currentFile ? resolveRelativePath(currentFile, decoded) : decoded;
      try {
        img.src = convertFileSrc(absolute);
      } catch (e) {
        console.warn("Could not convert image src", absolute);
      }
    });
  }, [displayHTML, currentFile]);

  // Click an image to inspect it at full size.
  useEffect(() => {
    const container = contentRef.current;
    if (!container) return;

    const handleImageClick = (e: MouseEvent) => {
      const image = (e.target as HTMLElement).closest('img');
      if (!image || image.closest('a')) return;
      setZoomedImage(image.src);
    };

    container.addEventListener('click', handleImageClick);
    return () => container.removeEventListener('click', handleImageClick);
  }, [displayHTML]);

  // Escape closes the zoom overlay.
  useEffect(() => {
    if (!zoomedImage) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        setZoomedImage(null);
      }
    };
    window.addEventListener('keydown', handleKey, true);
    return () => window.removeEventListener('keydown', handleKey, true);
  }, [zoomedImage]);

  return (
    <div className={documentWidthClass(documentWidth)}>
      {marpDocument && (
        <div className="marp-mode-toggle no-print" role="group" aria-label="Marp view mode">
          <button className={!slidesMode ? 'active' : ''} onClick={() => setSlidesMode(false)}>Document</button>
          <button className={slidesMode ? 'active' : ''} onClick={() => setSlidesMode(true)}>Slides</button>
        </div>
      )}
      {marpDocument && slidesMode ? (
        <Suspense fallback={<div className="marp-loading">Loading slides…</div>}>
          <MarpView source={rawMarkdown} />
        </Suspense>
      ) : (
      <div
        ref={contentRef}
        className="markdown-body"
        dangerouslySetInnerHTML={{ __html: displayHTML }}
      />
      )}
      {zoomedImage && (
        <div
          className="image-zoom-overlay no-print"
          role="dialog"
          aria-label="Zoomed image"
          onClick={() => setZoomedImage(null)}
        >
          <img src={zoomedImage} alt="" />
        </div>
      )}
    </div>
  );
}
