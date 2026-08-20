import { getRenderer } from './registry';
import type { RendererDefinition, RendererTheme } from './types';

type RendererLookup = (language: string) => RendererDefinition | undefined;

function languageOf(code: Element): string {
  const languageClass = Array.from(code.classList).find((name) => name.startsWith('language-'));
  return languageClass?.slice('language-'.length).toLowerCase() ?? '';
}

function restoreRenderedBlocks(container: HTMLElement) {
  container.querySelectorAll<HTMLElement>('[data-specialized-renderer][data-renderer-source]').forEach((wrapper) => {
    const source = wrapper.getAttribute('data-renderer-source') ?? '';
    const language = wrapper.getAttribute('data-renderer-language') ?? '';
    wrapper.replaceWith(sourceBlock(source, language));
  });
}

function sourceBlock(source: string, language: string): HTMLPreElement {
  const pre = document.createElement('pre');
  const code = document.createElement('code');
  code.className = `language-${language}`;
  code.textContent = source;
  pre.appendChild(code);
  return pre;
}

function controlButton(label: string, onClick: () => void): HTMLButtonElement {
  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'renderer-control';
  button.textContent = label;
  button.addEventListener('click', onClick);
  return button;
}

function copyControl(source: string): HTMLButtonElement {
  const button = controlButton('Copy source', () => {
    navigator.clipboard?.writeText(source).then(
      () => {
        button.textContent = 'Copied';
        window.setTimeout(() => { button.textContent = 'Copy source'; }, 1200);
      },
      () => { button.textContent = 'Copy failed'; },
    );
  });
  return button;
}

function markRenderer(element: HTMLElement, rendererId: string, language: string, source: string) {
  element.setAttribute('data-specialized-renderer', rendererId);
  element.setAttribute('data-renderer-language', language);
  element.setAttribute('data-renderer-source', source);
}

/**
 * Wrap a rendered diagram with a hover toolbar that exposes the original
 * source (MARKVIEW_FORK_PLAN.md section 14.2). Toggling never discards the
 * rendered element, so switching back is free.
 */
function withControls(rendered: HTMLElement, rendererId: string, language: string, source: string): HTMLElement {
  const wrapper = document.createElement('div');
  wrapper.className = 'specialized-renderer';
  markRenderer(wrapper, rendererId, language, source);

  const output = document.createElement('div');
  output.className = 'renderer-output';
  output.appendChild(rendered);

  const sourceView = sourceBlock(source, language);
  sourceView.className = 'renderer-source';
  sourceView.hidden = true;

  const controls = document.createElement('div');
  controls.className = 'renderer-controls no-print';
  const toggle = controlButton('Show source', () => {
    const showingSource = !sourceView.hidden;
    sourceView.hidden = showingSource;
    output.hidden = !showingSource;
    toggle.textContent = showingSource ? 'Show source' : 'Show diagram';
  });
  controls.append(copyControl(source), toggle);

  wrapper.append(controls, output, sourceView);
  return wrapper;
}

function renderError(host: Element, rendererId: string, language: string, source: string, error: unknown) {
  const wrapper = document.createElement('div');
  wrapper.className = 'specialized-renderer specialized-renderer-error';
  markRenderer(wrapper, rendererId, language, source);
  const message = document.createElement('p');
  message.className = 'specialized-renderer-error-message';
  message.textContent = `${rendererId} render error: ${error instanceof Error ? error.message : String(error)}`;
  const controls = document.createElement('div');
  controls.className = 'renderer-controls no-print';
  controls.appendChild(copyControl(source));
  wrapper.append(message, controls, sourceBlock(source, language));
  host.replaceWith(wrapper);
}

export async function renderSpecializedBlocks(
  container: HTMLElement,
  theme: RendererTheme,
  isCancelled: () => boolean = () => false,
  lookup: RendererLookup = getRenderer,
): Promise<void> {
  if (isCancelled()) return;
  restoreRenderedBlocks(container);
  const blocks = Array.from(container.querySelectorAll<HTMLElement>('pre > code[class*="language-"]'));

  for (const code of blocks) {
    if (isCancelled()) return;
    const language = languageOf(code);
    const definition = lookup(language);
    if (!definition) continue;
    const host = code.closest('pre') ?? code;
    const source = code.textContent ?? '';
    host.setAttribute('data-renderer-claimed', definition.id);

    try {
      const module = await definition.load();
      if (isCancelled() || !host.isConnected) continue;
      const rendered = await module.render({ source, language, theme });
      if (isCancelled() || !host.isConnected) continue;
      host.replaceWith(withControls(rendered, definition.id, language, source));
    } catch (error) {
      if (!isCancelled() && host.isConnected) renderError(host, definition.id, language, source, error);
    }
  }
}
