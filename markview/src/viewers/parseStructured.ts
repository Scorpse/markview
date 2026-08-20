/**
 * Parsers for the structured file viewers. All pure so they can be tested
 * without a DOM, and all total: a malformed file yields a result carrying the
 * error rather than throwing, so the viewer can still show the raw source
 * (MARKVIEW_FORK_PLAN.md section 1.5).
 */

export interface TableData {
  columns: string[];
  rows: string[][];
  /** Rows dropped because the file exceeded the row cap, if any. */
  truncatedRows: number;
  /** Per-line problems that did not stop the rest of the file parsing. */
  errors: string[];
}

/** Row cap for tabular views. Large files stay usable instead of locking the UI. */
export const MAX_TABLE_ROWS = 5000;

export function parseJson(source: string): { value: unknown; error?: string } {
  try {
    return { value: JSON.parse(source) };
  } catch (error) {
    return { value: undefined, error: error instanceof Error ? error.message : String(error) };
  }
}

/**
 * Split a delimited file into rows, honouring RFC 4180 quoting: quoted fields
 * may contain the delimiter, newlines, and doubled quotes.
 */
export function parseDelimited(source: string, delimiter: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = '';
  let quoted = false;
  let hadContent = false;

  const endField = () => {
    row.push(field);
    field = '';
  };
  const endRow = () => {
    endField();
    rows.push(row);
    row = [];
    hadContent = false;
  };

  for (let i = 0; i < source.length; i++) {
    const char = source[i];

    if (quoted) {
      if (char === '"') {
        if (source[i + 1] === '"') {
          field += '"';
          i++;
        } else {
          quoted = false;
        }
      } else {
        field += char;
      }
      hadContent = true;
      continue;
    }

    if (char === '"') {
      quoted = true;
      hadContent = true;
    } else if (char === delimiter) {
      endField();
      hadContent = true;
    } else if (char === '\r') {
      // Swallow CR; the following LF ends the row.
    } else if (char === '\n') {
      endRow();
    } else {
      field += char;
      hadContent = true;
    }
  }

  if (hadContent || field.length > 0 || row.length > 0) endRow();
  return rows;
}

export function parseCsv(source: string, delimiter: string): TableData {
  const all = parseDelimited(source, delimiter);
  if (all.length === 0) return { columns: [], rows: [], truncatedRows: 0, errors: [] };

  const columns = all[0];
  const body = all.slice(1);
  const rows = body.slice(0, MAX_TABLE_ROWS).map((row) => {
    if (row.length === columns.length) return row;
    // Pad short rows and keep overflow visible rather than dropping data.
    const padded = row.slice(0, columns.length);
    while (padded.length < columns.length) padded.push('');
    return padded;
  });

  const errors: string[] = [];
  const ragged = body.findIndex((row) => row.length !== columns.length);
  if (ragged !== -1) {
    errors.push(`Row ${ragged + 2} has ${body[ragged].length} fields but the header has ${columns.length}.`);
  }

  return { columns, rows, truncatedRows: Math.max(0, body.length - rows.length), errors };
}

export interface JsonlData {
  records: unknown[];
  truncatedRows: number;
  errors: string[];
}

export function parseJsonl(source: string): JsonlData {
  const lines = source.split(/\r?\n/);
  const records: unknown[] = [];
  const errors: string[] = [];
  let seen = 0;

  lines.forEach((line, index) => {
    if (line.trim() === '') return;
    seen++;
    if (records.length >= MAX_TABLE_ROWS) return;
    try {
      records.push(JSON.parse(line));
    } catch (error) {
      errors.push(`Line ${index + 1}: ${error instanceof Error ? error.message : String(error)}`);
    }
  });

  return { records, truncatedRows: Math.max(0, seen - records.length - errors.length), errors };
}

/** True when every record is a flat-ish object, so a table beats a tree. */
export function isTabular(records: unknown[]): boolean {
  return (
    records.length > 0 &&
    records.every((record) => record !== null && typeof record === 'object' && !Array.isArray(record))
  );
}

/** Column order follows first appearance across records, not alphabetical. */
export function columnsOf(records: unknown[]): string[] {
  const columns: string[] = [];
  for (const record of records) {
    for (const key of Object.keys(record as Record<string, unknown>)) {
      if (!columns.includes(key)) columns.push(key);
    }
  }
  return columns;
}

export function cellText(value: unknown): string {
  if (value === null) return 'null';
  if (value === undefined) return '';
  if (typeof value === 'object') return JSON.stringify(value);
  return String(value);
}

export function recordsToTable(records: unknown[]): TableData {
  const columns = columnsOf(records);
  const rows = records.map((record) =>
    columns.map((column) => cellText((record as Record<string, unknown>)[column])),
  );
  return { columns, rows, truncatedRows: 0, errors: [] };
}

/**
 * Sort table rows by one column. Values that both look numeric compare
 * numerically so `10` sorts after `9`; everything else compares as text.
 */
export function sortRows(rows: string[][], columnIndex: number, direction: 'asc' | 'desc'): string[][] {
  const factor = direction === 'asc' ? 1 : -1;
  return [...rows].sort((left, right) => {
    const a = left[columnIndex] ?? '';
    const b = right[columnIndex] ?? '';
    const numericA = Number(a);
    const numericB = Number(b);
    if (a !== '' && b !== '' && !Number.isNaN(numericA) && !Number.isNaN(numericB)) {
      return (numericA - numericB) * factor;
    }
    return a.localeCompare(b) * factor;
  });
}
