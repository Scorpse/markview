import { describe, expect, it } from 'vitest';
import {
  directoryOf,
  isAbsolutePath,
  isMarkdownPath,
  resolveRelativePath,
  stripLinkSuffix,
} from './resolvePath';

describe('resolveRelativePath', () => {
  it('resolves a sibling file next to a Windows document', () => {
    expect(resolveRelativePath('I:\\docs\\guide.md', 'images/logo.png')).toBe('I:\\docs\\images\\logo.png');
  });

  it('resolves a sibling file next to a POSIX document', () => {
    expect(resolveRelativePath('/home/user/docs/guide.md', './images/logo.png')).toBe('/home/user/docs/images/logo.png');
  });

  it('walks up with ..', () => {
    expect(resolveRelativePath('/home/user/docs/guide.md', '../assets/a.png')).toBe('/home/user/assets/a.png');
  });

  it('never escapes the root or drive', () => {
    expect(resolveRelativePath('/a/b.md', '../../../x.png')).toBe('/x.png');
    expect(resolveRelativePath('C:\\a\\b.md', '..\\..\\..\\x.png')).toBe('C:\\x.png');
  });

  it('leaves absolute targets untouched', () => {
    expect(resolveRelativePath('/a/b.md', '/etc/hosts')).toBe('/etc/hosts');
    expect(resolveRelativePath('/a/b.md', 'D:\\x\\y.png')).toBe('D:\\x\\y.png');
  });
});

describe('path predicates', () => {
  it('detects absolute paths on both platforms', () => {
    expect(isAbsolutePath('/tmp/a')).toBe(true);
    expect(isAbsolutePath('C:/tmp/a')).toBe(true);
    expect(isAbsolutePath('\\\\server\\share')).toBe(true);
    expect(isAbsolutePath('images/a.png')).toBe(false);
  });

  it('finds the containing directory', () => {
    expect(directoryOf('I:\\docs\\guide.md')).toBe('I:\\docs');
    expect(directoryOf('guide.md')).toBe('');
  });

  it('splits anchors and queries off a link target', () => {
    expect(stripLinkSuffix('./other.md#section')).toEqual({ path: './other.md', hash: 'section' });
    expect(stripLinkSuffix('./other.md')).toEqual({ path: './other.md', hash: '' });
  });

  it('recognises markdown targets', () => {
    expect(isMarkdownPath('a.md')).toBe(true);
    expect(isMarkdownPath('a.MARKDOWN')).toBe(true);
    expect(isMarkdownPath('a.txt')).toBe(false);
  });
});
