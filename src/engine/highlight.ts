/**
 * A compact syntax highlighter — simple token-based highlighting for the typical
 * languages (js/ts/php/html/css/json).
 *
 * It is NOT a full AST parser but regex tokens with priorities. For a production
 * code review Shiki or Prism would be better, but for the inline snippets of an
 * editor this is enough. About 1.5 KB minified.
 *
 * Usage (a separate function, so that a host can call it by hand):
 *
 *   import { highlight } from '@dskripchenko/wysiwyg'
 *   const html = highlight(code, 'js')   // → <span class="dsk-tok-keyword">…</span>
 *
 * In the editor it is applied automatically when a `<pre>` has the class
 * `language-js` (or `lang-js`). See DskWysiwyg.vue.
 */

interface TokenRule {
  type: 'keyword' | 'string' | 'comment' | 'number' | 'tag' | 'attr' | 'punct' | 'function'
  pattern: RegExp
}

const COMMON_NUMBER = /^-?\d+(?:\.\d+)?(?:e[+-]?\d+)?\b/i
const COMMON_STRING = /^(?:"(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*'|`(?:\\.|[^`\\])*`)/

const RULES: Record<string, TokenRule[]> = {
  js: [
    { type: 'comment', pattern: /^\/\/.*|^\/\*[\s\S]*?\*\// },
    { type: 'string', pattern: COMMON_STRING },
    { type: 'keyword', pattern: /^(?:const|let|var|function|class|extends|implements|interface|type|return|if|else|for|while|do|switch|case|break|continue|throw|try|catch|finally|new|this|super|import|export|from|as|default|typeof|instanceof|in|of|async|await|yield|true|false|null|undefined|void)\b/ },
    { type: 'function', pattern: /^[a-zA-Z_$][\w$]*(?=\s*\()/ },
    { type: 'number', pattern: COMMON_NUMBER },
    { type: 'punct', pattern: /^[{}()[\];,.+\-*/%<>=!&|^~?:]/ },
  ],
  ts: [], // alias to js + types — упрощаем, тот же набор
  php: [
    { type: 'comment', pattern: /^\/\/.*|^#.*|^\/\*[\s\S]*?\*\// },
    { type: 'string', pattern: COMMON_STRING },
    { type: 'keyword', pattern: /^(?:abstract|class|interface|trait|extends|implements|public|protected|private|static|final|function|return|if|else|elseif|for|foreach|while|do|switch|case|break|continue|throw|try|catch|finally|new|self|this|parent|use|namespace|as|true|false|null|echo|print|require|include|require_once|include_once|fn)\b/ },
    { type: 'attr', pattern: /^\$[a-zA-Z_][\w]*/ },  // PHP variables
    { type: 'function', pattern: /^[a-zA-Z_][\w]*(?=\s*\()/ },
    { type: 'number', pattern: COMMON_NUMBER },
    { type: 'punct', pattern: /^[{}()[\];,.+\-*/%<>=!&|^~?:]/ },
  ],
  html: [
    { type: 'comment', pattern: /^<!--[\s\S]*?-->/ },
    { type: 'string', pattern: COMMON_STRING },
    { type: 'tag', pattern: /^<\/?[a-zA-Z][\w-]*/ },
    { type: 'attr', pattern: /^[a-zA-Z-][\w-]*(?==)/ },
    { type: 'punct', pattern: /^[<>=/]/ },
  ],
  css: [
    { type: 'comment', pattern: /^\/\*[\s\S]*?\*\// },
    { type: 'string', pattern: COMMON_STRING },
    { type: 'attr', pattern: /^[a-z-][\w-]*(?=\s*:)/ },
    { type: 'keyword', pattern: /^@[a-z-]+/ },
    { type: 'number', pattern: /^-?\d+(?:\.\d+)?(?:px|em|rem|%|vh|vw|s|ms|deg)?\b/ },
    { type: 'punct', pattern: /^[{};:]/ },
  ],
  json: [
    { type: 'string', pattern: COMMON_STRING },
    { type: 'keyword', pattern: /^(?:true|false|null)\b/ },
    { type: 'number', pattern: COMMON_NUMBER },
    { type: 'punct', pattern: /^[{}[\]:,]/ },
  ],
}

// ts uses the same rules as js (typescript reuses the keywords and adds
// type-only ones; for a compact variant delegating to js is enough).
RULES.ts = RULES.js
RULES.tsx = RULES.js
RULES.jsx = RULES.js

/**
 * Highlights the code and returns an HTML string with
 * <span class="dsk-tok-*">tokens</span>. When the language is not supported we
 * return escaped plain text.
 */
export function highlight(code: string, language?: string): string {
  const lang = (language ?? '').toLowerCase()
  const rules = RULES[lang]
  if (!rules) return escape(code)

  let out = ''
  let pos = 0
  while (pos < code.length) {
    const slice = code.slice(pos)

    // skip whitespace verbatim
    const wsMatch = slice.match(/^\s+/)
    if (wsMatch) {
      out += escape(wsMatch[0])
      pos += wsMatch[0].length
      continue
    }

    let matched: { type: string; len: number } | null = null
    for (const rule of rules) {
      const m = slice.match(rule.pattern)
      if (m) {
        matched = { type: rule.type, len: m[0].length }
        break
      }
    }
    if (matched) {
      const text = slice.slice(0, matched.len)
      out += `<span class="dsk-tok-${matched.type}">${escape(text)}</span>`
      pos += matched.len
    } else {
      // identifier / unknown char
      const ident = slice.match(/^[a-zA-Z_$][\w$]*/)
      if (ident) {
        out += escape(ident[0])
        pos += ident[0].length
      } else {
        out += escape(slice[0])
        pos++
      }
    }
  }
  return out
}

function escape(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
}
