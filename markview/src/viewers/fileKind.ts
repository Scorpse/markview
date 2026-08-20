/**
 * Which viewer handles a file. MarkView stays a Markdown reader first: anything
 * it does not positively recognise as structured data is treated as Markdown,
 * which is the behaviour the app had before structured viewers existed.
 */
export type FileKind = 'markdown' | 'json' | 'yaml' | 'jsonl' | 'csv' | 'config';

const EXTENSION_KINDS: Record<string, FileKind> = {
  md: 'markdown',
  mdx: 'markdown',
  markdown: 'markdown',
  json: 'json',
  yaml: 'yaml',
  yml: 'yaml',
  jsonl: 'jsonl',
  ndjson: 'jsonl',
  csv: 'csv',
  tsv: 'csv',
  toml: 'config',
  ini: 'config',
  env: 'config',
  conf: 'config',
  properties: 'config',
};

/** Files whose whole name carries the meaning, with no extension to read. */
const FILENAME_KINDS: Record<string, FileKind> = {
  '.env': 'config',
};

export const STRUCTURED_EXTENSIONS = Object.keys(EXTENSION_KINDS).filter(
  (extension) => EXTENSION_KINDS[extension] !== 'markdown',
);

export const MARKDOWN_EXTENSIONS = Object.keys(EXTENSION_KINDS).filter(
  (extension) => EXTENSION_KINDS[extension] === 'markdown',
);

export const SUPPORTED_EXTENSIONS = Object.keys(EXTENSION_KINDS);

export function fileNameOf(path: string): string {
  return path.split(/[\\/]/).pop() ?? '';
}

export function extensionOf(path: string): string {
  const name = fileNameOf(path);
  const dot = name.lastIndexOf('.');
  return dot <= 0 ? '' : name.slice(dot + 1).toLowerCase();
}

export function fileKindFor(path: string): FileKind {
  const byName = FILENAME_KINDS[fileNameOf(path).toLowerCase()];
  if (byName) return byName;
  return EXTENSION_KINDS[extensionOf(path)] ?? 'markdown';
}

export function isSupportedPath(path: string): boolean {
  const name = fileNameOf(path).toLowerCase();
  return name in FILENAME_KINDS || extensionOf(path) in EXTENSION_KINDS;
}

/** CSV and TSV share a viewer; the extension decides the delimiter. */
export function delimiterFor(path: string): string {
  return extensionOf(path) === 'tsv' ? '\t' : ',';
}

/** highlight.js language for the read-only config view, if it has one. */
export function configLanguageFor(path: string): string | undefined {
  switch (extensionOf(path)) {
    case 'toml':
      return 'ini';
    case 'ini':
    case 'properties':
      return 'ini';
    default:
      return undefined;
  }
}
