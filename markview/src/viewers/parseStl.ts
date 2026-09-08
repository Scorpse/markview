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

const EDGE_START = /^\s*\[([^\]]+)\]\s*->\s*\[([^\]]+)\]\s*::mod\s*\(/;

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

/**
 * Split a `::mod(...)` body into attributes. Commas inside quoted values do not
 * separate attributes, which matters because descriptions are prose.
 */
export function parseAttributes(body: string): Record<string, string> {
  const attributes: Record<string, string> = {};
  let key = '';
  let value = '';
  let inKey = true;
  let quoted = false;

  const commit = () => {
    const name = key.trim();
    if (name) attributes[name] = value.trim();
    key = '';
    value = '';
    inKey = true;
  };

  for (let i = 0; i < body.length; i++) {
    const char = body[i];
    if (quoted) {
      if (char === '\\' && body[i + 1] === '"') {
        value += '"';
        i++;
      } else if (char === '"') {
        quoted = false;
      } else {
        value += char;
      }
      continue;
    }
    if (char === '"') quoted = true;
    else if (inKey && char === '=') inKey = false;
    else if (char === ',') commit();
    else if (inKey) key += char;
    else value += char;
  }
  commit();
  return attributes;
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

    const match = line.match(EDGE_START);
    if (!match) {
      errors.push(`Line ${i + 1}: not a comment or an edge.`);
      continue;
    }

    // Gather continuation lines until the ::mod(...) parentheses close.
    const startLine = i;
    let statement = line;
    let balance = parenBalance(line.slice(line.indexOf('::mod') + 5), 0);
    while (balance > 0 && i + 1 < lines.length) {
      i++;
      statement += `\n${lines[i]}`;
      balance = parenBalance(lines[i], balance);
    }
    if (balance > 0) {
      errors.push(`Line ${startLine + 1}: unterminated ::mod( ... ).`);
      continue;
    }

    const open = statement.indexOf('(', statement.indexOf('::mod'));
    const close = statement.lastIndexOf(')');
    const body = open === -1 || close <= open ? '' : statement.slice(open + 1, close);

    section().edges.push({
      source: match[1].trim(),
      target: match[2].trim(),
      attributes: parseAttributes(body),
      raw: statement,
      line: startLine + 1,
    });
    edgeCount++;
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
