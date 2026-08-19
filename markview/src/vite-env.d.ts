/// <reference types="vite/client" />

declare module 'wavedrom' {
  export const waveSkin: Record<string, unknown>;
  export const onml: { stringify(tree: unknown): string };
  export function renderAny(index: number, source: unknown, skin: Record<string, unknown>): unknown;
}

declare module 'wavedrom/skins/dark.js' {
  const skins: Record<string, unknown>;
  export default skins;
}
