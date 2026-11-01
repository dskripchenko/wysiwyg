/**
 * Syntax highlighting for code blocks and the source view: the tokens of
 * `@dskripchenko/syntax` (some 35 languages and formats, by id or alias) as
 * `<span class="dsk-tok-*">`, everything escaped.
 *
 *   import { highlight } from '@dskripchenko/wysiwyg'
 *   const html = highlight(code, 'js')   // → <span class="dsk-tok-keyword">…</span>
 *
 * In the editor it is applied to a `<pre><code class="language-js">` after
 * a blur. See DskWysiwyg.vue.
 */
import { isSupported, tokenize, type TokenType } from '@dskripchenko/syntax'

/** The editor's eight token colours, for the kinds the tokenizer tells apart. */
const CLASS: Partial<Record<TokenType, string>> = {
  keyword: 'keyword',
  constant: 'keyword',
  heading: 'keyword',
  strong: 'keyword',
  string: 'string',
  regex: 'string',
  escape: 'string',
  inserted: 'string',
  comment: 'comment',
  meta: 'comment',
  debug: 'comment',
  number: 'number',
  date: 'number',
  tag: 'tag',
  deleted: 'tag',
  error: 'tag',
  attribute: 'attr',
  variable: 'attr',
  property: 'attr',
  warning: 'attr',
  function: 'function',
  type: 'function',
  link: 'function',
  info: 'function',
  punctuation: 'punct',
  operator: 'punct',
}

/**
 * The code as HTML with `<span class="dsk-tok-*">` tokens; a language not
 * supported gives the text escaped.
 */
export function highlight(code: string, language?: string): string {
  const lang = (language ?? '').toLowerCase()
  if (!lang || !isSupported(lang)) return escape(code)
  let out = ''
  for (const t of tokenize(code, lang)) {
    const cls = CLASS[t.type]
    out += cls ? `<span class="dsk-tok-${cls}">${escape(t.text)}</span>` : escape(t.text)
  }
  return out
}

function escape(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
}
