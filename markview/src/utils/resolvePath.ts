/**
 * Path helpers for resolving links and images relative to the document that
 * contains them. Kept string-only so it stays testable outside the webview and
 * works for both Windows and POSIX paths without a Node path polyfill.
 */

const WINDOWS_DRIVE = /^[a-zA-Z]:[\\/]/;
const SEPARATORS = /[\\/]+/;

export function isAbsolutePath(path: string): boolean {
  return path.startsWith('/') || path.startsWith('\\\\') || WINDOWS_DRIVE.test(path);
}

export function directoryOf(filePath: string): string {
  const index = Math.max(filePath.lastIndexOf('/'), filePath.lastIndexOf('\\'));
  return index === -1 ? '' : filePath.slice(0, index);
}

/** Strip a `#anchor` / `?query` suffix so a link target can be treated as a path. */
export function stripLinkSuffix(href: string): { path: string; hash: string } {
  const hashIndex = href.indexOf('#');
  const path = hashIndex === -1 ? href : href.slice(0, hashIndex);
  const hash = hashIndex === -1 ? '' : href.slice(hashIndex + 1);
  return { path: path.split('?')[0], hash };
}

export function isMarkdownPath(path: string): boolean {
  return /\.(md|mdx|markdown)$/i.test(path);
}

/**
 * Resolve `relative` against the directory holding `baseFilePath`. Absolute
 * targets are returned untouched. `..` never escapes the root/drive segment.
 */
export function resolveRelativePath(baseFilePath: string, relative: string): string {
  if (!relative) return relative;
  if (isAbsolutePath(relative)) return relative;

  const windows = WINDOWS_DRIVE.test(baseFilePath) || baseFilePath.includes('\\');
  const separator = windows ? '\\' : '/';
  const segments = `${directoryOf(baseFilePath)}${separator}${relative}`.split(SEPARATORS);

  const resolved: string[] = [];
  for (const segment of segments) {
    if (segment === '.') continue;
    if (segment === '..') {
      if (resolved.length > 1) resolved.pop();
      continue;
    }
    resolved.push(segment);
  }
  return resolved.join(separator);
}
