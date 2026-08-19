import { describe, expect, it } from 'vitest';
import { documentWidthClass } from './documentLayout';

describe('documentWidthClass', () => {
  it('uses a centered readable column when enabled', () => {
    expect(documentWidthClass(true)).toContain('max-w-4xl');
    expect(documentWidthClass(true)).toContain('mx-auto');
  });

  it('uses all available width when readable line length is disabled', () => {
    expect(documentWidthClass(false)).toContain('max-w-none');
    expect(documentWidthClass(false)).toContain('w-full');
  });
});
