import { describe, expect, it } from 'vitest';
import { hasUnsafeUrlScheme } from './urlSafety';

describe('hasUnsafeUrlScheme', () => {
  it.each([
    'javascript:alert(1)',
    'JavaScript:alert(1)',
    '  javascript:alert(1)',
    'java\nscript:alert(1)',
    'java\tscript:alert(1)',
    'vbscript:msgbox(1)',
    'data:text/html,<script>alert(1)</script>',
    'data:text/html;base64,PHNjcmlwdD4=',
    'data:image/svg+xml,<svg onload="x()"/>',
    'data:application/javascript,alert(1)',
    'data:,alert(1)',
  ])('flags %j', (value) => {
    expect(hasUnsafeUrlScheme(value)).toBe(true);
  });

  it.each([
    'https://example.com/a.png',
    'http://example.com',
    'mailto:someone@example.com',
    '#section',
    'relative/path.png',
    './image.png',
    '/abs/path',
    'data:image/png;base64,iVBORw0KGgo=',
    'data:image/jpeg;base64,/9j/4AAQ',
    'DATA:IMAGE/GIF;base64,R0lGODlh',
    'data:image/webp;base64,UklGR',
  ])('allows %j', (value) => {
    expect(hasUnsafeUrlScheme(value)).toBe(false);
  });
});
