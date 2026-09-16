import { describe, expect, it } from 'vitest';
import { parseAttributes, parseStl, splitAttributes, splitNode } from './parseStl';

describe('parseAttributes', () => {
  it('reads quoted and numeric values', () => {
    expect(parseAttributes('rule="definitional", confidence=0.95')).toEqual({
      rule: 'definitional',
      confidence: '0.95',
    });
  });

  it('keeps commas inside a quoted description', () => {
    const attributes = parseAttributes('description="one, two, three", confidence=0.9');
    expect(attributes.description).toBe('one, two, three');
    expect(attributes.confidence).toBe('0.9');
  });

  it('keeps parentheses and colons inside values', () => {
    const attributes = parseAttributes('source="file:a/b.md", description="see f(x)"');
    expect(attributes.source).toBe('file:a/b.md');
    expect(attributes.description).toBe('see f(x)');
  });

  it('unescapes embedded quotes', () => {
    expect(parseAttributes('description="say \\"hi\\""').description).toBe('say "hi"');
  });
});

describe('parseStl', () => {
  it('parses a relation without a modifier block', () => {
    const doc = parseStl('[A] -> [B]');
    expect(doc.errors).toEqual([]);
    expect(doc.edgeCount).toBe(1);
    expect(doc.sections[0].edges[0].attributes).toEqual({});
  });

  it('accepts the canonical Unicode arrow', () => {
    const doc = parseStl('[黄帝内经] → [素问]');
    expect(doc.errors).toEqual([]);
    expect(doc.sections[0].edges[0]).toMatchObject({
      source: '黄帝内经',
      target: '素问',
    });
  });

  it('expands a chained path and applies the modifier to its final edge', () => {
    const doc = parseStl('[A] -> [B] -> [C] ::mod(confidence=0.85)');
    expect(doc.errors).toEqual([]);
    expect(doc.edgeCount).toBe(2);
    expect(doc.sections[0].edges).toMatchObject([
      { source: 'A', target: 'B', attributes: {} },
      { source: 'B', target: 'C', attributes: { confidence: '0.85' } },
    ]);
  });

  it('merges documented repeated modifier blocks', () => {
    const doc = parseStl(
      '[Action] -> [Result]\n' +
        '  ::mod(time="Present")\n' +
        '  ::mod(confidence=0.85, verified=true)',
    );
    expect(doc.errors).toEqual([]);
    expect(doc.sections[0].edges[0].attributes).toEqual({
      time: 'Present',
      confidence: '0.85',
      verified: 'true',
    });
  });

  it('ignores an inline comment after a statement', () => {
    const doc = parseStl('[A] -> [B] ::mod(rule="causal") # supporting note');
    expect(doc.errors).toEqual([]);
    expect(doc.edgeCount).toBe(1);
    expect(doc.sections[0].edges[0].attributes).toEqual({ rule: 'causal' });
  });

  it('parses a single edge with its attributes', () => {
    const doc = parseStl('[A:One] -> [B:Two] ::mod(rule="logical", confidence=0.95)');
    expect(doc.edgeCount).toBe(1);
    const edge = doc.sections[0].edges[0];
    expect(edge.source).toBe('A:One');
    expect(edge.target).toBe('B:Two');
    expect(edge.attributes).toEqual({ rule: 'logical', confidence: '0.95' });
    expect(edge.line).toBe(1);
  });

  // The real files wrap long edges across lines; a line-by-line parse breaks.
  it('joins an edge whose ::mod( ... ) spans several lines', () => {
    const doc = parseStl(
      '[Project:X] -> [Goal:Y] ::mod(\n' +
        '  rule="definitional", confidence=0.95,\n' +
        '  description="a long one, with commas",\n' +
        '  source="PRD.pdf")\n',
    );
    expect(doc.errors).toEqual([]);
    expect(doc.edgeCount).toBe(1);
    const edge = doc.sections[0].edges[0];
    expect(edge.attributes.description).toBe('a long one, with commas');
    expect(edge.attributes.source).toBe('PRD.pdf');
  });

  it('uses comments as section headings and ignores decoration', () => {
    const doc = parseStl(
      '# Title\n' +
        '# ============\n' +
        '# a note\n' +
        '[A:1] -> [B:1] ::mod(rule="logical")\n' +
        '# --- Second ---\n' +
        '[A:2] -> [B:2] ::mod(rule="causal")\n',
    );
    expect(doc.sections).toHaveLength(2);
    expect(doc.sections[0].title).toBe('Title');
    expect(doc.sections[0].notes).toEqual(['a note']);
    expect(doc.sections[0].edges).toHaveLength(1);
    expect(doc.sections[1].title).toBe('Second');
    expect(doc.sections[1].edges).toHaveLength(1);
  });

  it('strips box-drawing rules from headings', () => {
    const doc = parseStl(
      '# ── 2. Scope ────\n[A:1] -> [B:1] ::mod(rule="logical")',
    );
    expect(doc.sections[0].title).toBe('2. Scope');
  });

  // One sample file documents the grammar in a comment; that must not parse.
  it('does not mistake a grammar example inside a comment for an edge', () => {
    const doc = parseStl(
      '# Grammar: [ns:Anchor] -> [ns:Target] ::mod(action=..., outcome=...)\n' +
        '[A:1] -> [B:1] ::mod(rule="logical")',
    );
    expect(doc.edgeCount).toBe(1);
    expect(doc.errors).toEqual([]);
  });

  it('reports a line it cannot read without losing the rest', () => {
    const doc = parseStl('[A:1] -> [B:1] ::mod(rule="logical")\nnonsense here\n[A:2] -> [B:2] ::mod(rule="causal")');
    expect(doc.edgeCount).toBe(2);
    expect(doc.errors[0]).toContain('Line 2');
  });

  it('reports an unterminated statement', () => {
    const doc = parseStl('[A:1] -> [B:1] ::mod(rule="logical",\n  description="never closed"');
    expect(doc.errors[0]).toContain('unterminated');
    expect(doc.edgeCount).toBe(0);
  });

  it('handles an empty document', () => {
    expect(parseStl('')).toEqual({ sections: [], edgeCount: 0, errors: [] });
  });
});

describe('presentation helpers', () => {
  it('promotes the few attributes worth showing and hides description', () => {
    const { primary, rest } = splitAttributes({
      timestamp: 't',
      confidence: '0.9',
      action: 'decide',
      description: 'body',
      author: 'codex',
    });
    expect(primary.map(([k]) => k)).toEqual(['action', 'confidence']);
    expect(rest.map(([k]) => k)).toEqual(['timestamp', 'author']);
  });

  it('splits a namespaced node', () => {
    expect(splitNode('runekiln:Decision_runtime')).toEqual({
      namespace: 'runekiln',
      name: 'Decision_runtime',
    });
    expect(splitNode('Bare')).toEqual({ namespace: '', name: 'Bare' });
  });
});
