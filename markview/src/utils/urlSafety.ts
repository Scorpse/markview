// Raster images only: an <img> or <image> given a data: URL cannot run script,
// but data:text/html and data:image/svg+xml can when they are navigated to.
const RASTER_DATA_URL = /^data:image\/(?:png|jpe?g|gif|webp|avif|bmp)[;,]/;

/**
 * True when a URL attribute value would run or render active content.
 *
 * Browsers ignore whitespace and control characters inside a scheme
 * ("java\nscript:"), so those are removed before the check. `data:` is allowed
 * for raster images, which Marp slides, Vega and Mermaid emit inline.
 */
export function hasUnsafeUrlScheme(value: string): boolean {
  const url = value.replace(/[\u0000- ]/g, '').toLowerCase();
  if (url.startsWith('javascript:') || url.startsWith('vbscript:')) return true;
  return url.startsWith('data:') && !RASTER_DATA_URL.test(url);
}
