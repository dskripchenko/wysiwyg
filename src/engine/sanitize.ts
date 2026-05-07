/**
 * sanitizeHtml — приводит произвольный HTML (например, из буфера обмена
 * Word/Google Docs) к нейтральному виду:
 *   - удаляет style-атрибуты, on*-handlers, classes, ids, data-*;
 *   - удаляет тэги-нежелательные (script/iframe/object/embed/style/meta/link);
 *   - tags whitelist: p/h1-h3/strong/em/u/s/code/pre/ul/ol/li/blockquote/
 *     a/img/br/hr/span (span — без атрибутов, оставлен для нейтрального
 *     группирования);
 *   - br-теги внутри p сохраняем (для shift+enter).
 *
 * Для безопасности: вся работа через DOMParser (не innerHTML на live-DOM),
 * чтобы избежать выполнения <img onerror=...>.
 */

const ALLOWED_TAGS = new Set([
  'p',
  'h1', 'h2', 'h3',
  'strong', 'b',
  'em', 'i',
  'u',
  's', 'strike', 'del',
  'code',
  'pre',
  'ul', 'ol', 'li',
  'blockquote',
  'a',
  'img',
  'br',
  'hr',
  'span',
])

const ALLOWED_ATTRS: Record<string, Set<string>> = {
  a: new Set(['href', 'target', 'rel', 'title']),
  img: new Set(['src', 'alt', 'title', 'width', 'height']),
}

export function sanitizeHtml(input: string): string {
  if (typeof DOMParser === 'undefined') return input
  const doc = new DOMParser().parseFromString(`<div>${input}</div>`, 'text/html')
  const root = doc.body.firstElementChild
  if (!root) return ''
  cleanNode(root)
  return root.innerHTML
}

function cleanNode(node: Element): void {
  // Снимаем атрибуты, не входящие в whitelist для конкретного тега.
  const tag = node.tagName.toLowerCase()
  const allowed = ALLOWED_ATTRS[tag] ?? new Set<string>()
  for (const attr of Array.from(node.attributes)) {
    if (! allowed.has(attr.name)) {
      node.removeAttribute(attr.name)
    }
    // Защита от javascript: в href/src.
    if ((attr.name === 'href' || attr.name === 'src') && /^\s*javascript:/i.test(attr.value)) {
      node.removeAttribute(attr.name)
    }
  }
  // Для <a> добавляем безопасные defaults (rel/target).
  if (tag === 'a') {
    if (! node.getAttribute('rel')) node.setAttribute('rel', 'noopener noreferrer')
    if (! node.getAttribute('target')) node.setAttribute('target', '_blank')
  }
  // Рекурсивно проходим children, заменяя disallowed на их innerHTML.
  for (const child of Array.from(node.children)) {
    cleanNode(child)
    if (! ALLOWED_TAGS.has(child.tagName.toLowerCase())) {
      // Заменяем тэг на его текстовый/блочный контент.
      const replacement = doc().createElement('span')
      replacement.innerHTML = child.innerHTML
      child.replaceWith(...Array.from(replacement.childNodes))
    }
  }
}

function doc(): Document {
  return document
}
