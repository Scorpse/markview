import { describe, expect, it } from 'vitest';
import {
  DOCUMENT_WIDTHS,
  documentWidthClass,
  documentWidthFromLegacyPreference,
  documentWidthLabel,
  isDocumentWidth,
  nextDocumentWidth,
} from './documentLayout';

describe('documentWidthClass', () => {
  it('uses a centered readable column at the narrow step', () => {
    expect(documentWidthClass('narrow')).toContain('max-w-4xl');
    expect(documentWidthClass('narrow')).toContain('mx-auto');
  });

  it('widens the centered column at the intermediate steps', () => {
    expect(documentWidthClass('wide')).toContain('max-w-6xl');
    expect(documentWidthClass('extra-wide')).toContain('max-w-[100rem]');
  });

  it('uses all available width at the full step', () => {
    expect(documentWidthClass('full')).toContain('max-w-none');
    expect(documentWidthClass('full')).toContain('w-full');
  });

  it('keeps the same page padding at every step', () => {
    DOCUMENT_WIDTHS.forEach((width) => {
      expect(documentWidthClass(width)).toContain('p-8');
      expect(documentWidthClass(width)).toContain('pb-32');
    });
  });
});

describe('nextDocumentWidth', () => {
  it('cycles through every step and wraps around', () => {
    expect(nextDocumentWidth('narrow')).toBe('wide');
    expect(nextDocumentWidth('wide')).toBe('extra-wide');
    expect(nextDocumentWidth('extra-wide')).toBe('full');
    expect(nextDocumentWidth('full')).toBe('narrow');
  });
});

describe('width preference parsing', () => {
  it('accepts known widths only', () => {
    expect(isDocumentWidth('wide')).toBe(true);
    expect(isDocumentWidth('gigantic')).toBe(false);
    expect(isDocumentWidth(true)).toBe(false);
  });

  it('migrates the previous readable-line-length boolean', () => {
    expect(documentWidthFromLegacyPreference(true)).toBe('narrow');
    expect(documentWidthFromLegacyPreference(false)).toBe('full');
  });

  it('labels every step', () => {
    DOCUMENT_WIDTHS.forEach((width) => expect(documentWidthLabel(width).length).toBeGreaterThan(0));
  });
});
