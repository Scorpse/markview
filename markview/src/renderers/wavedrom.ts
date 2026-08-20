import type { RenderBlockOptions, RendererTheme } from './types';
import { safeSvgElement } from './svg';

// WaveDrom sources are JavaScript object literals rather than strict JSON.
// JSON5 parses that syntax without evaluating it, so document content never
// reaches an interpreter (see MARKVIEW_FORK_PLAN.md section 18).
type Json5 = { parse(text: string): unknown };

let wavedromPromise: Promise<typeof import('wavedrom')> | null = null;
let darkSkinPromise: Promise<Record<string, unknown>> | null = null;
let json5Promise: Promise<Json5> | null = null;

let nextIndex = 0;

async function loadJson5(): Promise<Json5> {
  const module = await import('json5');
  return (module as unknown as { default?: Json5 }).default ?? (module as unknown as Json5);
}

async function skinsFor(theme: RendererTheme, wavedrom: typeof import('wavedrom')) {
  if (theme !== 'dark') return wavedrom.waveSkin;
  darkSkinPromise ??= import('wavedrom/skins/dark.js').then((module) => module.default ?? module);
  return { ...wavedrom.waveSkin, ...(await darkSkinPromise) };
}

/** Opt the diagram into the dark skin unless the document picked one itself. */
function withSkin(source: Record<string, unknown>, theme: RendererTheme): Record<string, unknown> {
  if (theme !== 'dark') return source;
  const config = (source.config ?? {}) as Record<string, unknown>;
  if (config.skin) return source;
  return { ...source, config: { ...config, skin: 'dark' } };
}

export async function render({ source, theme }: RenderBlockOptions): Promise<HTMLElement> {
  wavedromPromise ??= import('wavedrom');
  json5Promise ??= loadJson5();
  const [wavedrom, json5] = await Promise.all([wavedromPromise, json5Promise]);

  const parsed = json5.parse(source) as Record<string, unknown>;
  const skins = await skinsFor(theme, wavedrom);
  const tree = wavedrom.renderAny(nextIndex++, withSkin(parsed, theme), skins);

  const wrapper = document.createElement('div');
  wrapper.className = 'wavedrom-diagram';
  wrapper.appendChild(safeSvgElement(wavedrom.onml.stringify(tree)));
  return wrapper;
}
