import { describe, expect, it } from 'vitest';
import { parseAttributes, parseStl, splitAttributes, splitNode } from './parseStl';

describe('parseAttributes', () => {
  it('reads quoted and numeric values', () => {
    expect(parseAttributes('rule="definitional", confidence=0.95')).toEqual([
      ['rule', 'definitional'],
      ['confidence', '0.95'],
    ]);
  });

  it('keeps commas inside a quoted description', () => {
    const attributes = parseAttributes('description="one, two, three", confidence=0.9');
    expect(attributes).toEqual([
      ['description', 'one, two, three'],
      ['confidence', '0.9'],
    ]);
  });

  it('keeps parentheses and colons inside values', () => {
    const attributes = parseAttributes('source="file:a/b.md", description="see f(x)"');
    expect(attributes).toEqual([
      ['source', 'file:a/b.md'],
      ['description', 'see f(x)'],
    ]);
  });

  it('unescapes embedded quotes', () => {
    expect(parseAttributes('description="say \\"hi\\""')).toEqual([
      ['description', 'say "hi"'],
    ]);
  });
});

describe('parseStl', () => {
  it('parses a relation without a modifier block', () => {
    const doc = parseStl('[A] -> [B]');
    expect(doc.errors).toEqual([]);
    expect(doc.edgeCount).toBe(1);
    expect(doc.sections[0].edges[0].attributes).toEqual([]);
  });

  it('accepts the canonical Unicode arrow', () => {
    const doc = parseStl('[黄帝内经] → [素问]');
    expect(doc.errors).toEqual([]);
    expect(doc.sections[0].edges[0]).toMatchObject({
      source: '黄帝内经',
      target: '素问',
    });
  });

  it('accepts canonical whitespace between path tokens', () => {
    const doc = parseStl('[A]\n  ->\n[B]');
    expect(doc.errors).toEqual([]);
    expect(doc.sections[0].edges[0]).toMatchObject({ source: 'A', target: 'B' });
  });

  it('continues a chained path whose next arrow starts a new line', () => {
    const doc = parseStl('[A] -> [B]\n  -> [C]');
    expect(doc.errors).toEqual([]);
    expect(doc.sections[0].edges).toMatchObject([
      { source: 'A', target: 'B' },
      { source: 'B', target: 'C' },
    ]);
  });

  it('expands a chained path and applies the modifier to its final edge', () => {
    const doc = parseStl('[A] -> [B] -> [C] ::mod(confidence=0.85)');
    expect(doc.errors).toEqual([]);
    expect(doc.edgeCount).toBe(2);
    expect(doc.sections[0].edges).toMatchObject([
      { source: 'A', target: 'B', attributes: [] },
      { source: 'B', target: 'C', attributes: [['confidence', '0.85']] },
    ]);
  });

  it('merges documented repeated modifier blocks', () => {
    const doc = parseStl(
      '[Action] -> [Result]\n' +
        '  ::mod(time="Present")\n' +
        '  ::mod(confidence=0.85, verified=true)',
    );
    expect(doc.errors).toEqual([]);
    expect(doc.sections[0].edges[0].attributes).toEqual([
      ['time', 'Present'],
      ['confidence', '0.85'],
      ['verified', 'true'],
    ]);
  });

  it('ignores an inline comment after a statement', () => {
    const doc = parseStl('[A] -> [B] ::mod(rule="causal") # supporting note');
    expect(doc.errors).toEqual([]);
    expect(doc.edgeCount).toBe(1);
    expect(doc.sections[0].edges[0].attributes).toEqual([['rule', 'causal']]);
  });

  it('preserves future anchor and modifier forms without knowing their domain', () => {
    const doc = parseStl(
      '[Future Anchor] -> [Domain:Target/v2] ::mod(' +
        'state=queued_v2, vector=[1,2,3], payload={mode:"fast"})',
    );
    expect(doc.errors).toEqual([]);
    expect(doc.sections[0].edges[0]).toMatchObject({
      source: 'Future Anchor',
      target: 'Domain:Target/v2',
      attributes: [
        ['state', 'queued_v2'],
        ['vector', '[1,2,3]'],
        ['payload', '{mode:"fast"}'],
      ],
    });
  });

  it('does not treat parentheses inside a future anchor as modifier structure', () => {
    const doc = parseStl('[Goal (draft] -> [Target]');
    expect(doc.errors).toEqual([]);
    expect(doc.sections[0].edges[0]).toMatchObject({
      source: 'Goal (draft',
      target: 'Target',
    });
  });

  it('preserves unusual and duplicate future keys in exact source order', () => {
    const doc = parseStl('[A] -> [B] ::mod(2=two, __proto__=safe, 2=second)');
    expect(doc.errors).toEqual([]);
    expect(doc.sections[0].edges[0].attributes).toEqual([
      ['2', 'two'],
      ['__proto__', 'safe'],
      ['2', 'second'],
    ]);
  });

  it.each([
    ['[A] -> [B] ::mod(broken)', 'invalid modifier'],
    ['[A] -> [B] ::mod(description="unterminated)', 'unterminated'],
  ])('rejects structurally broken modifier syntax in %s', (source, error) => {
    const doc = parseStl(source);
    expect(doc.edgeCount).toBe(0);
    expect(doc.errors[0]).toContain(error);
  });

  it.each([
    '[A] -> [B] ::mod(payload=[1,2)',
    '[A] -> [B] ::mod(payload={mode:"fast")',
    '[A] -> [B] ::mod(payload=[1,2})',
  ])('rejects unbalanced structured modifier values in %s', (source) => {
    const doc = parseStl(source);
    expect(doc.edgeCount).toBe(0);
    expect(doc.errors[0]).toContain('unbalanced delimiter');
  });

  it('parses a single edge with its attributes', () => {
    const doc = parseStl('[A:One] -> [B:Two] ::mod(rule="logical", confidence=0.95)');
    expect(doc.edgeCount).toBe(1);
    const edge = doc.sections[0].edges[0];
    expect(edge.source).toBe('A:One');
    expect(edge.target).toBe('B:Two');
    expect(edge.attributes).toEqual([['rule', 'logical'], ['confidence', '0.95']]);
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
    expect(edge.attributes).toContainEqual(['description', 'a long one, with commas']);
    expect(edge.attributes).toContainEqual(['source', 'PRD.pdf']);
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
  it('arranges attributes by value shape and source order, not field name', () => {
    const { visible, rest } = splitAttributes([
      ['custom_state', 'queued'],
      ['explanation', 'This domain-specific explanation reads as prose.'],
      ['arbitrary_score', '0.9'],
      ['profile_hint', 'future-v2'],
      ['compact_fourth', 'yes'],
      ['overflow_field', 'kept'],
    ]);
    expect(visible.map(({ key }) => key)).toEqual([
      'custom_state',
      'explanation',
      'arbitrary_score',
      'profile_hint',
    ]);
    expect(visible.map(({ narrative }) => narrative)).toEqual([false, true, false, false]);
    expect(rest).toEqual([['compact_fourth', 'yes'], ['overflow_field', 'kept']]);
  });

  it('splits a namespaced node', () => {
    expect(splitNode('runekiln:Decision_runtime')).toEqual({
      namespace: 'runekiln',
      name: 'Decision_runtime',
    });
    expect(splitNode('Bare')).toEqual({ namespace: '', name: 'Bare' });
  });
});
