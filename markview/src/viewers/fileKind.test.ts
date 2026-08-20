import { describe, expect, it } from 'vitest';
import {
  configLanguageFor,
  delimiterFor,
  extensionOf,
  fileKindFor,
  fileNameOf,
  isSupportedPath,
} from './fileKind';

describe('fileKindFor', () => {
  it.each([
    ['notes.md', 'markdown'],
    ['notes.MARKDOWN', 'markdown'],
    ['package.json', 'json'],
    ['config.yaml', 'yaml'],
    ['config.yml', 'yaml'],
    ['events.jsonl', 'jsonl'],
    ['events.ndjson', 'jsonl'],
    ['rows.csv', 'csv'],
    ['rows.tsv', 'csv'],
    ['app.toml', 'config'],
    ['app.ini', 'config'],
    ['app.conf', 'config'],
    ['app.properties', 'config'],
  ])('maps %s to %s', (path, kind) => {
    expect(fileKindFor(path)).toBe(kind);
  });

  it('treats a bare .env file as config', () => {
    expect(fileKindFor('/home/user/project/.env')).toBe('config');
    expect(fileKindFor('C:\\project\\.ENV')).toBe('config');
  });

  it('falls back to markdown for anything unrecognised', () => {
    expect(fileKindFor('README')).toBe('markdown');
    expect(fileKindFor('notes.txt')).toBe('markdown');
  });

  it('reads the extension from full Windows and POSIX paths', () => {
    expect(fileKindFor('I:\\data\\rows.csv')).toBe('csv');
    expect(fileKindFor('/var/data/rows.csv')).toBe('csv');
  });
});

describe('path helpers', () => {
  it('extracts the file name', () => {
    expect(fileNameOf('I:\\a\\b.json')).toBe('b.json');
    expect(fileNameOf('/a/b.json')).toBe('b.json');
    expect(fileNameOf('b.json')).toBe('b.json');
  });

  it('extracts the extension, ignoring a leading dot', () => {
    expect(extensionOf('a.tar.gz')).toBe('gz');
    expect(extensionOf('.env')).toBe('');
    expect(extensionOf('README')).toBe('');
  });

  it('reports which paths the app can open', () => {
    expect(isSupportedPath('a.json')).toBe(true);
    expect(isSupportedPath('.env')).toBe(true);
    expect(isSupportedPath('a.exe')).toBe(false);
  });
});

describe('viewer options', () => {
  it('picks a tab delimiter for tsv only', () => {
    expect(delimiterFor('a.tsv')).toBe('\t');
    expect(delimiterFor('a.csv')).toBe(',');
  });

  it('highlights ini-shaped config formats', () => {
    expect(configLanguageFor('a.toml')).toBe('ini');
    expect(configLanguageFor('a.ini')).toBe('ini');
    expect(configLanguageFor('.env')).toBeUndefined();
  });
});
