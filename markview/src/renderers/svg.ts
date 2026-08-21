const SVG_NAMESPACE = 'http://www.w3.org/2000/svg';
const BLOCKED_ELEMENTS = 'script, iframe, object, embed';

/**
 * Take renderer-produced SVG text and return a DOM element with active content
 * removed.
 *
 * Parsing is done in HTML mode via a `<template>`, whose content is inert: no
 * script runs and no resource is fetched while it is being built. An XML parse
 * would be stricter but cannot read real renderer output — Mermaid serialises
 * `htmlLabels` inside `<foreignObject>` as HTML, so a node label containing a
 * line break emits a void `<br>` and fails an XML parse outright. Sanitisation
 * does not depend on the parser being strict: it happens on the parsed tree.
 */
export function safeSvgElement(svgText: string): SVGSVGElement {
  const template = document.createElement('template');
  template.innerHTML = svgText;

  // Namespace-checked so an HTML element merely named "svg" cannot pose as one.
  const svg = Array.from(template.content.children).find(
    (element) => element.namespaceURI === SVG_NAMESPACE && element.localName === 'svg',
  );
  if (!svg) throw new Error('Renderer returned invalid SVG');

  svg.querySelectorAll(BLOCKED_ELEMENTS).forEach((node) => node.remove());
  [svg, ...Array.from(svg.querySelectorAll('*'))].forEach((node) => {
    for (const attribute of Array.from(node.attributes)) {
      const name = attribute.name.toLowerCase();
      const value = attribute.value.trim().toLowerCase();
      if (name.startsWith('on') || ((name === 'href' || name.endsWith(':href')) && value.startsWith('javascript:'))) {
        node.removeAttribute(attribute.name);
      }
    }
  });
  return document.importNode(svg, true) as unknown as SVGSVGElement;
}
