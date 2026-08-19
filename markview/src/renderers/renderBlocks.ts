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
    const pre = document.createElement('pre');
    const code = document.createElement('code');
    code.className = `language-${language}`;
    code.textContent = source;
    pre.appendChild(code);
    wrapper.replaceWith(pre);
  });
}

function renderError(host: Element, rendererId: string, language: string, source: string, error: unknown) {
  const wrapper = document.createElement('div');
  wrapper.className = 'specialized-renderer specialized-renderer-error';
  wrapper.setAttribute('data-specialized-renderer', rendererId);
  wrapper.setAttribute('data-renderer-language', language);
  wrapper.setAttribute('data-renderer-source', source);
  const message = document.createElement('p');
  message.className = 'specialized-renderer-error-message';
  message.textContent = `${rendererId} render error: ${error instanceof Error ? error.message : String(error)}`;
  const pre = document.createElement('pre');
  const code = document.createElement('code');
  code.className = `language-${language}`;
  code.textContent = source;
  pre.appendChild(code);
  wrapper.append(message, pre);
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
      rendered.classList.add('specialized-renderer');
      rendered.setAttribute('data-specialized-renderer', definition.id);
      rendered.setAttribute('data-renderer-language', language);
      rendered.setAttribute('data-renderer-source', source);
      host.replaceWith(rendered);
    } catch (error) {
      if (!isCancelled() && host.isConnected) renderError(host, definition.id, language, source, error);
    }
  }
}
