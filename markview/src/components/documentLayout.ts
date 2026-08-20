export const DOCUMENT_WIDTHS = ['narrow', 'wide', 'extra-wide', 'full'] as const;

export type DocumentWidth = (typeof DOCUMENT_WIDTHS)[number];

export const DEFAULT_DOCUMENT_WIDTH: DocumentWidth = 'narrow';

const WIDTH_CLASSES: Record<DocumentWidth, string> = {
  narrow: 'max-w-4xl mx-auto',
  wide: 'max-w-6xl mx-auto',
  'extra-wide': 'max-w-[100rem] mx-auto',
  full: 'max-w-none w-full',
};

const WIDTH_LABELS: Record<DocumentWidth, string> = {
  narrow: 'Narrow (readable column)',
  wide: 'Wide',
  'extra-wide': 'Extra wide',
  full: 'Full width',
};

export function documentWidthClass(width: DocumentWidth): string {
  return `p-8 pb-32 ${WIDTH_CLASSES[width]}`;
}

export function documentWidthLabel(width: DocumentWidth): string {
  return WIDTH_LABELS[width];
}

export function nextDocumentWidth(width: DocumentWidth): DocumentWidth {
  return DOCUMENT_WIDTHS[(DOCUMENT_WIDTHS.indexOf(width) + 1) % DOCUMENT_WIDTHS.length];
}

export function isDocumentWidth(value: unknown): value is DocumentWidth {
  return typeof value === 'string' && (DOCUMENT_WIDTHS as readonly string[]).includes(value);
}

/** Preferences written before the width cycle stored a readable-line-length boolean. */
export function documentWidthFromLegacyPreference(readableLineLength: boolean): DocumentWidth {
  return readableLineLength ? 'narrow' : 'full';
}
