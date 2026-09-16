/**
 * Parser for Semantic Tension Language documents.
 *
 * An STL file is line-oriented: `#` comments, which authors use as section
 * headings, and edges of the form
 *
 *     [ns:Source] -> [ns:Target] ::mod(key="value", key=number, ...)
 *
 * An edge may wrap across lines, so statements are accumulated until their
 * parentheses balance. Parsing is total: a line that cannot be understood is
 * reported and the rest of the document still parses.
 */

export interface StlEdge {
  source: string;
  target: string;
  attributes: Record<string, string>;
  /** Original text, so the viewer can always fall back to what was written. */
  raw: string;
  line: number;
}

export interface StlSection {
  title: string;
  /** Further comment lines belonging to the same heading. */
  notes: string[];
  edges: StlEdge[];
}

export interface StlDocument {
  sections: StlSection[];
  edgeCount: number;
  errors: string[];
}

/** Attributes worth showing before the reader expands the rest. */
export const PRIMARY_ATTRIBUTES = ['action', 'rule', 'outcome', 'confidence'] as const;

const ANCHOR = /\s*\[([^\]]+)\]/y;
const ARROW = /\s*(?:->|→)/y;
const MODIFIER_START = /\s*::mod\s*\(/y;
const IDENTIFIER = /^[\p{L}\p{N}_][\p{L}\p{N}_-]*$/u;
const NUMBER = /^-?\d+\.?\d*%?$/;
const DATETIME = /^\d{4}-\d{2}-\d{2}(?:T\d{2}:\d{2}:\d{2}(?:Z|[+-]\d{2}:\d{2})?)?$/;
const RESERVED_ANCHORS = new Set([
  'NULL', 'UNDEFINED', 'ANY', 'NONE', 'TRUE', 'FALSE', 'SYSTEM', 'GLOBAL', 'LOCAL',
]);

/**
 * A comment made only of decoration (`# ====`, `# ----`, `# ── x ──`) carries no
 * title. Authors rule off sections with box-drawing characters as well as ASCII.
 */
const DECORATION = /^[-=\s─-╿]+|[-=\s─-╿]+$/g;

function commentText(line: string): string {
  return line.replace(/^\s*#\s?/, '').replace(DECORATION, '').trim();
}

/** Count parentheses outside quoted strings, so `description="f(x)"` is safe. */
function parenBalance(text: string, startBalance: number): number {
  let balance = startBalance;
  let quoted = false;
  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    if (quoted) {
      if (char === '\\') i++;
      else if (char === '"') quoted = false;
      continue;
    }
    if (char === '"') quoted = true;
    else if (char === '(') balance++;
    else if (char === ')') balance--;
  }
  return balance;
}

/** Remove an inline comment without treating a `#` inside a string as syntax. */
function withoutInlineComment(text: string): string {
  let quoted = false;
  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    if (quoted && char === '\\') {
      i++;
    } else if (char === '"') {
      quoted = !quoted;
    } else if (!quoted && char === '#') {
      return text.slice(0, i);
    }
  }
  return text;
}

interface ParsedStatement {
  edges: Omit<StlEdge, 'raw' | 'line'>[];
  error?: string;
}

function validAnchor(anchor: string): boolean {
  if (anchor.length > 64 || /\s/.test(anchor)) return false;
  const parts = anchor.split(':');
  if (parts.length > 2) return false;
  const namespace = parts.length === 2 ? parts[0].split('.') : [];
  const name = parts[parts.length - 1] ?? '';
  return (
    namespace.every((part) => IDENTIFIER.test(part)) &&
    IDENTIFIER.test(name) &&
    !RESERVED_ANCHORS.has(name.toUpperCase())
  );
}

interface AttributeResult {
  attributes: Record<string, string>;
  error?: string;
}

function parseAttributeBlock(body: string): AttributeResult {
  const attributes: Record<string, string> = {};
  const pairs: string[] = [];
  let start = 0;
  let quoted = false;

  for (let i = 0; i < body.length; i++) {
    const char = body[i];
    if (quoted && char === '\\') i++;
    else if (char === '"') quoted = !quoted;
    else if (!quoted && char === ',') {
      pairs.push(body.slice(start, i));
      start = i + 1;
    }
  }
  if (quoted) return { attributes, error: 'unterminated quoted string.' };
  pairs.push(body.slice(start));

  for (const pair of pairs) {
    const trimmed = pair.trim();
    if (!trimmed) return { attributes, error: 'empty modifier field.' };
    const equals = trimmed.indexOf('=');
    if (equals <= 0) return { attributes, error: `expected key=value, got "${trimmed}".` };
    const key = trimmed.slice(0, equals).trim();
    const rawValue = trimmed.slice(equals + 1).trim();
    if (!IDENTIFIER.test(key) || !rawValue) {
      return { attributes, error: `invalid key or missing value in "${trimmed}".` };
    }

    if (rawValue.startsWith('"')) {
      try {
        const value = JSON.parse(rawValue);
        if (typeof value !== 'string') throw new Error('not a string');
        attributes[key] = value;
      } catch {
        return { attributes, error: `invalid quoted value for "${key}".` };
      }
    } else if (
      NUMBER.test(rawValue) ||
      DATETIME.test(rawValue) ||
      rawValue === 'true' ||
      rawValue === 'false'
    ) {
      attributes[key] = rawValue;
    } else {
      return { attributes, error: `invalid value for "${key}".` };
    }
  }
  return { attributes };
}

/** Parse one complete path expression, including modifiers on individual edges. */
function parseStatement(statement: string): ParsedStatement {
  const text = withoutInlineComment(statement).trim();
  let cursor = 0;

  ANCHOR.lastIndex = cursor;
  const first = ANCHOR.exec(text);
  if (!first) return { edges: [], error: 'expected a source anchor.' };
  if (!validAnchor(first[1])) return { edges: [], error: `invalid anchor "${first[1]}".` };
  let source = first[1];
  cursor = ANCHOR.lastIndex;
  const edges: Omit<StlEdge, 'raw' | 'line'>[] = [];

  while (cursor < text.length) {
    ARROW.lastIndex = cursor;
    if (!ARROW.exec(text)) return { edges: [], error: 'expected ->, →, or end of statement.' };
    cursor = ARROW.lastIndex;

    ANCHOR.lastIndex = cursor;
    const targetMatch = ANCHOR.exec(text);
    if (!targetMatch) return { edges: [], error: 'expected a target anchor.' };
    if (!validAnchor(targetMatch[1])) {
      return { edges: [], error: `invalid anchor "${targetMatch[1]}".` };
    }
    cursor = ANCHOR.lastIndex;

    const edge = { source, target: targetMatch[1], attributes: {} as Record<string, string> };
    source = targetMatch[1];

    while (true) {
      MODIFIER_START.lastIndex = cursor;
      if (!MODIFIER_START.exec(text)) break;
      const bodyStart = MODIFIER_START.lastIndex;
      let balance = 1;
      let quoted = false;
      let i = bodyStart;
      for (; i < text.length && balance > 0; i++) {
        const char = text[i];
        if (quoted && char === '\\') i++;
        else if (char === '"') quoted = !quoted;
        else if (!quoted && char === '(') balance++;
        else if (!quoted && char === ')') balance--;
      }
      if (balance > 0) return { edges: [], error: 'unterminated ::mod( ... ).' };
      const modifier = parseAttributeBlock(text.slice(bodyStart, i - 1));
      if (modifier.error) return { edges: [], error: `invalid modifier: ${modifier.error}` };
      Object.assign(edge.attributes, modifier.attributes);
      cursor = i;
    }

    edges.push(edge);
    if (!text.slice(cursor).trim()) break;
  }

  return edges.length > 0 ? { edges } : { edges: [], error: 'expected an edge.' };
}

/**
 * Split a `::mod(...)` body into attributes. Commas inside quoted values do not
 * separate attributes, which matters because descriptions are prose.
 */
export function parseAttributes(body: string): Record<string, string> {
  return parseAttributeBlock(body).attributes;
}

export function parseStl(source: string): StlDocument {
  const lines = source.split(/\r?\n/);
  const sections: StlSection[] = [];
  const errors: string[] = [];
  let current: StlSection | null = null;
  let edgeCount = 0;

  const section = (): StlSection => {
    if (!current) {
      current = { title: '', notes: [], edges: [] };
      sections.push(current);
    }
    return current;
  };

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (line.trim() === '') continue;

    if (line.trimStart().startsWith('#')) {
      const text = commentText(line);
      if (!text) continue; // pure decoration
      // A heading after edges opens the next section; before them it is a note.
      if (!current || current.edges.length > 0) {
        current = { title: text, notes: [], edges: [] };
        sections.push(current);
      } else if (!current.title) {
        current.title = text;
      } else {
        current.notes.push(text);
      }
      continue;
    }

    if (!line.trimStart().startsWith('[')) {
      errors.push(`Line ${i + 1}: not a comment or an edge.`);
      continue;
    }

    // Gather continuation lines until modifiers close, including documented
    // repeated modifier blocks on following lines.
    const startLine = i;
    let statement = line;
    let balance = parenBalance(withoutInlineComment(line), 0);
    while (balance > 0 && i + 1 < lines.length) {
      i++;
      statement += `\n${lines[i]}`;
      balance = parenBalance(withoutInlineComment(lines[i]), balance);
    }
    if (balance > 0) {
      errors.push(`Line ${startLine + 1}: unterminated ::mod( ... ).`);
      continue;
    }
    while (i + 1 < lines.length && lines[i + 1].trimStart().startsWith('::mod')) {
      i++;
      statement += `\n${lines[i]}`;
      balance = parenBalance(withoutInlineComment(lines[i]), 0);
      while (balance > 0 && i + 1 < lines.length) {
        i++;
        statement += `\n${lines[i]}`;
        balance = parenBalance(withoutInlineComment(lines[i]), balance);
      }
      if (balance > 0) break;
    }

    let parsed = parseStatement(statement);
    while (i + 1 < lines.length) {
      const next = lines[i + 1].trimStart();
      const continuesWithArrow =
        (!parsed.error || parsed.error === 'expected an edge.') && /^(?:->|→)/.test(next);
      const continuesWithAnchor = parsed.error === 'expected a target anchor.' && next.startsWith('[');
      if (!continuesWithArrow && !continuesWithAnchor) break;
      i++;
      statement += `\n${lines[i]}`;
      parsed = parseStatement(statement);
    }
    if (parsed.error) {
      errors.push(`Line ${startLine + 1}: ${parsed.error}`);
      continue;
    }
    for (const edge of parsed.edges) {
      section().edges.push({ ...edge, raw: statement, line: startLine + 1 });
      edgeCount++;
    }
  }

  return { sections, edgeCount, errors };
}

/** Split an attribute map into the few worth showing and the rest. */
export function splitAttributes(attributes: Record<string, string>): {
  primary: [string, string][];
  rest: [string, string][];
} {
  const primary: [string, string][] = [];
  const rest: [string, string][] = [];
  for (const [key, value] of Object.entries(attributes)) {
    if (key === 'description') continue; // rendered as the edge's body
    if ((PRIMARY_ATTRIBUTES as readonly string[]).includes(key)) primary.push([key, value]);
    else rest.push([key, value]);
  }
  primary.sort(
    (a, b) => PRIMARY_ATTRIBUTES.indexOf(a[0] as never) - PRIMARY_ATTRIBUTES.indexOf(b[0] as never),
  );
  return { primary, rest };
}

/** `ns:Name` reads better split into its namespace and its name. */
export function splitNode(node: string): { namespace: string; name: string } {
  const colon = node.indexOf(':');
  if (colon === -1) return { namespace: '', name: node };
  return { namespace: node.slice(0, colon), name: node.slice(colon + 1) };
}
