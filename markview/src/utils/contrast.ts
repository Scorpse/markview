interface Rgb {
  r: number;
  g: number;
  b: number;
  a: number;
}

const MIN_CONTRAST = 4.5;
const BLOCK_SELECTOR = 'pre, p, li, td, th, blockquote, dt, dd';

function parseColor(value: string): Rgb | null {
  const color = value.trim().toLowerCase();
  const hex = color.match(/^#([\da-f]{3}|[\da-f]{6})$/i);
  if (hex) {
    const expanded = hex[1].length === 3
      ? [...hex[1]].map((part) => part + part).join('')
      : hex[1];
    return {
      r: Number.parseInt(expanded.slice(0, 2), 16),
      g: Number.parseInt(expanded.slice(2, 4), 16),
      b: Number.parseInt(expanded.slice(4, 6), 16),
      a: 1,
    };
  }

  const rgb = color.match(/^rgba?\(\s*([\d.]+)[, ]+\s*([\d.]+)[, ]+\s*([\d.]+)(?:\s*[,/]\s*([\d.]+))?\s*\)$/);
  if (!rgb) return null;
  return {
    r: Number(rgb[1]),
    g: Number(rgb[2]),
    b: Number(rgb[3]),
    a: rgb[4] === undefined ? 1 : Number(rgb[4]),
  };
}

function composite(foreground: Rgb, background: Rgb): Rgb {
  const alpha = foreground.a + background.a * (1 - foreground.a);
  if (alpha === 0) return { r: 255, g: 255, b: 255, a: 1 };
  return {
    r: (foreground.r * foreground.a + background.r * background.a * (1 - foreground.a)) / alpha,
    g: (foreground.g * foreground.a + background.g * background.a * (1 - foreground.a)) / alpha,
    b: (foreground.b * foreground.a + background.b * background.a * (1 - foreground.a)) / alpha,
    a: alpha,
  };
}

function luminance({ r, g, b }: Rgb): number {
  const channel = (value: number) => {
    const normalized = value / 255;
    return normalized <= 0.04045
      ? normalized / 12.92
      : ((normalized + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b);
}

export function contrastRatio(foreground: string, background: string): number {
  const fg = parseColor(foreground);
  const bg = parseColor(background);
  if (!fg || !bg) return 1;
  const visibleForeground = fg.a < 1 ? composite(fg, bg) : fg;
  const lighter = Math.max(luminance(visibleForeground), luminance(bg));
  const darker = Math.min(luminance(visibleForeground), luminance(bg));
  return (lighter + 0.05) / (darker + 0.05);
}

function rgbString({ r, g, b }: Rgb): string {
  return `rgb(${Math.round(r)}, ${Math.round(g)}, ${Math.round(b)})`;
}

export function readableForeground(foreground: string, background: string): string {
  const fg = parseColor(foreground);
  const bg = parseColor(background);
  if (!fg || !bg || contrastRatio(foreground, background) >= MIN_CONTRAST) return foreground;

  const target = luminance(bg) < 0.5
    ? { r: 255, g: 255, b: 255, a: 1 }
    : { r: 0, g: 0, b: 0, a: 1 };
  let low = 0;
  let high = 1;
  for (let i = 0; i < 12; i++) {
    const amount = (low + high) / 2;
    const candidate = {
      r: fg.r + (target.r - fg.r) * amount,
      g: fg.g + (target.g - fg.g) * amount,
      b: fg.b + (target.b - fg.b) * amount,
      a: 1,
    };
    if (contrastRatio(rgbString(candidate), background) >= MIN_CONTRAST) high = amount;
    else low = amount;
  }
  return rgbString({
    r: fg.r + (target.r - fg.r) * high,
    g: fg.g + (target.g - fg.g) * high,
    b: fg.b + (target.b - fg.b) * high,
    a: 1,
  });
}

function effectiveBackground(element: Element): string {
  let current: Element | null = element;
  let result: Rgb = { r: 255, g: 255, b: 255, a: 1 };
  const layers: Rgb[] = [];
  while (current) {
    const parsed = parseColor(getComputedStyle(current).backgroundColor);
    if (parsed && parsed.a > 0) layers.push(parsed);
    current = current.parentElement;
  }
  for (let i = layers.length - 1; i >= 0; i--) result = composite(layers[i], result);
  return rgbString(result);
}

function hasDirectText(element: Element): boolean {
  return Array.from(element.childNodes).some(
    (node) => node.nodeType === Node.TEXT_NODE && Boolean(node.textContent?.trim()),
  );
}

export function clearContrastAdjustments(root: HTMLElement): void {
  root.querySelectorAll<HTMLElement>('[data-contrast-adjusted="true"]').forEach((element) => {
    const original = element.dataset.contrastOriginalColor ?? '';
    const priority = element.dataset.contrastOriginalPriority ?? '';
    if (original) element.style.setProperty('color', original, priority);
    else element.style.removeProperty('color');
    delete element.dataset.contrastAdjusted;
    delete element.dataset.contrastOriginalColor;
    delete element.dataset.contrastOriginalPriority;
  });
}

export function improveDocumentContrast(root: HTMLElement): number {
  clearContrastAdjustments(root);
  const adjustedBlocks = new Set<Element>();
  const elements = [root, ...root.querySelectorAll<HTMLElement>('*')];

  for (const element of elements) {
    if (!hasDirectText(element) || element.closest('svg') || getComputedStyle(element).display === 'none') continue;
    const foreground = getComputedStyle(element).color;
    const background = effectiveBackground(element);
    if (contrastRatio(foreground, background) >= MIN_CONTRAST) continue;

    element.dataset.contrastOriginalColor = element.style.getPropertyValue('color');
    element.dataset.contrastOriginalPriority = element.style.getPropertyPriority('color');
    element.dataset.contrastAdjusted = 'true';
    element.style.setProperty('color', readableForeground(foreground, background), 'important');
    adjustedBlocks.add(element.closest(BLOCK_SELECTOR) ?? element);
  }

  return adjustedBlocks.size;
}
