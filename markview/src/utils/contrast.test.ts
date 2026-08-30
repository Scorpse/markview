// @vitest-environment jsdom

import { describe, expect, it } from 'vitest';
import {
  clearContrastAdjustments,
  contrastRatio,
  improveDocumentContrast,
  readableForeground,
} from './contrast';

describe('contrast utilities', () => {
  it('calculates WCAG contrast ratios', () => {
    expect(contrastRatio('#000000', '#ffffff')).toBeCloseTo(21, 5);
    expect(contrastRatio('#777777', '#ffffff')).toBeCloseTo(4.478, 2);
  });

  it('finds a readable foreground while retaining the original hue', () => {
    const adjusted = readableForeground('#24292f', '#313244');

    expect(contrastRatio(adjusted, '#313244')).toBeGreaterThanOrEqual(4.5);
    expect(adjusted).not.toBe('#24292f');
  });

  it('adjusts low-contrast text on demand and reports affected blocks', () => {
    const root = document.createElement('div');
    root.style.backgroundColor = 'rgb(49, 50, 68)';
    root.innerHTML = '<pre><code><span style="color: rgb(36, 41, 47)">dark</span><span style="color: rgb(205, 214, 244)"> readable</span></code></pre>';
    document.body.appendChild(root);

    expect(improveDocumentContrast(root)).toBe(1);
    const adjusted = root.querySelector<HTMLElement>('span')!;
    expect(adjusted.dataset.contrastAdjusted).toBe('true');
    expect(contrastRatio(adjusted.style.color, 'rgb(49, 50, 68)')).toBeGreaterThanOrEqual(4.5);

    clearContrastAdjustments(root);
    expect(adjusted.style.color).toBe('rgb(36, 41, 47)');
    expect(adjusted.dataset.contrastAdjusted).toBeUndefined();
  });

  it('does not modify content that already meets the threshold', () => {
    const root = document.createElement('div');
    root.style.backgroundColor = '#313244';
    root.innerHTML = '<p style="color: #cdd6f4">Readable text</p>';
    document.body.appendChild(root);

    expect(improveDocumentContrast(root)).toBe(0);
    expect(root.querySelector('p')!.getAttribute('style')).toBe('color: #cdd6f4');
  });
});
