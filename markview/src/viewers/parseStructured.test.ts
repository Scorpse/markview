import { describe, expect, it } from 'vitest';
import {
  MAX_TABLE_ROWS,
  cellText,
  columnsOf,
  isTabular,
  parseCsv,
  parseDelimited,
  parseJson,
  parseJsonl,
  recordsToTable,
  sortRows,
} from './parseStructured';

describe('parseJson', () => {
  it('parses valid JSON', () => {
    expect(parseJson('{"a":1}')).toEqual({ value: { a: 1 } });
  });

  it('reports the error instead of throwing', () => {
    const result = parseJson('{ not json');
    expect(result.value).toBeUndefined();
    expect(result.error).toBeTruthy();
  });
});

describe('parseDelimited', () => {
  it('splits simple rows', () => {
    expect(parseDelimited('a,b\n1,2', ',')).toEqual([['a', 'b'], ['1', '2']]);
  });

  it('honours quoted fields containing the delimiter', () => {
    expect(parseDelimited('a,b\n"x,y",2', ',')).toEqual([['a', 'b'], ['x,y', '2']]);
  });

  it('honours quoted fields containing newlines', () => {
    expect(parseDelimited('a,b\n"line1\nline2",2', ',')).toEqual([['a', 'b'], ['line1\nline2', '2']]);
  });

  it('unescapes doubled quotes', () => {
    expect(parseDelimited('a\n"say ""hi"""', ',')).toEqual([['a'], ['say "hi"']]);
  });

  it('handles CRLF line endings', () => {
    expect(parseDelimited('a,b\r\n1,2\r\n', ',')).toEqual([['a', 'b'], ['1', '2']]);
  });

  it('supports a tab delimiter', () => {
    expect(parseDelimited('a\tb\n1\t2', '\t')).toEqual([['a', 'b'], ['1', '2']]);
  });
});

describe('parseCsv', () => {
  it('uses the first row as the header', () => {
    const table = parseCsv('name,age\nada,36', ',');
    expect(table.columns).toEqual(['name', 'age']);
    expect(table.rows).toEqual([['ada', '36']]);
    expect(table.errors).toEqual([]);
  });

  it('pads ragged rows and reports the first one', () => {
    const table = parseCsv('a,b,c\n1,2', ',');
    expect(table.rows).toEqual([['1', '2', '']]);
    expect(table.errors[0]).toContain('Row 2');
  });

  it('caps very large files and reports what was dropped', () => {
    const source = ['n', ...Array.from({ length: MAX_TABLE_ROWS + 10 }, (_, i) => String(i))].join('\n');
    const table = parseCsv(source, ',');
    expect(table.rows).toHaveLength(MAX_TABLE_ROWS);
    expect(table.truncatedRows).toBe(10);
  });

  it('returns an empty table for empty input', () => {
    expect(parseCsv('', ',').columns).toEqual([]);
  });
});

describe('parseJsonl', () => {
  it('parses one record per line and skips blank lines', () => {
    const result = parseJsonl('{"a":1}\n\n{"a":2}\n');
    expect(result.records).toEqual([{ a: 1 }, { a: 2 }]);
    expect(result.errors).toEqual([]);
  });

  it('keeps good records when one line is malformed', () => {
    const result = parseJsonl('{"a":1}\nnot json\n{"a":3}');
    expect(result.records).toEqual([{ a: 1 }, { a: 3 }]);
    expect(result.errors[0]).toContain('Line 2');
  });
});

describe('record shaping', () => {
  it('detects tabular record sets', () => {
    expect(isTabular([{ a: 1 }, { a: 2 }])).toBe(true);
    expect(isTabular([{ a: 1 }, 5])).toBe(false);
    expect(isTabular([[1, 2]])).toBe(false);
    expect(isTabular([])).toBe(false);
  });

  it('collects columns in first-appearance order', () => {
    expect(columnsOf([{ b: 1 }, { a: 2, b: 3 }])).toEqual(['b', 'a']);
  });

  it('renders cells as readable text', () => {
    expect(cellText(null)).toBe('null');
    expect(cellText(undefined)).toBe('');
    expect(cellText({ a: 1 })).toBe('{"a":1}');
    expect(cellText(3)).toBe('3');
  });

  it('builds a table from records with missing keys', () => {
    const table = recordsToTable([{ a: 1 }, { b: 2 }]);
    expect(table.columns).toEqual(['a', 'b']);
    expect(table.rows).toEqual([['1', ''], ['', '2']]);
  });
});

describe('sortRows', () => {
  it('sorts numeric columns numerically', () => {
    const rows = [['9'], ['10'], ['1']];
    expect(sortRows(rows, 0, 'asc')).toEqual([['1'], ['9'], ['10']]);
    expect(sortRows(rows, 0, 'desc')).toEqual([['10'], ['9'], ['1']]);
  });

  it('sorts text columns as text', () => {
    const rows = [['pear'], ['apple']];
    expect(sortRows(rows, 0, 'asc')).toEqual([['apple'], ['pear']]);
  });

  it('does not mutate the input', () => {
    const rows = [['b'], ['a']];
    sortRows(rows, 0, 'asc');
    expect(rows).toEqual([['b'], ['a']]);
  });
});
