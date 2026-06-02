import DOMPurify from 'dompurify';

/**
 * Sanitize HTML content to prevent XSS attacks.
 * Preserves safe tags commonly used in educational content (math, images, tables).
 */
export function sanitizeHtml(html: string | undefined | null): string {
  if (!html) return '';
  return DOMPurify.sanitize(html, {
    ALLOWED_TAGS: [
      'p', 'br', 'b', 'i', 'u', 'em', 'strong', 'span', 'div',
      'img', 'sub', 'sup', 'table', 'tr', 'td', 'th', 'tbody', 'thead',
      'ol', 'ul', 'li', 'a', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
      'blockquote', 'pre', 'code', 'hr',
      // MathML elements for formula rendering
      'math', 'mi', 'mn', 'mo', 'ms', 'mtext', 'mfrac', 'msqrt',
      'mroot', 'msub', 'msup', 'msubsup', 'munder', 'mover',
      'munderover', 'mtable', 'mtr', 'mtd', 'mrow', 'menclose',
      'mpadded', 'mphantom', 'mfenced', 'mstyle', 'mspace',
      'annotation', 'semantics',
    ],
    ALLOWED_ATTR: [
      'href', 'src', 'alt', 'title', 'class', 'style', 'id',
      'width', 'height', 'colspan', 'rowspan', 'align', 'valign',
      'target', 'rel',
      // MathML attributes
      'mathvariant', 'mathsize', 'mathcolor', 'mathbackground',
      'displaystyle', 'scriptlevel', 'linethickness', 'notation',
      'open', 'close', 'separators', 'stretchy', 'symmetric',
      'lspace', 'rspace', 'width', 'height', 'depth',
      'encoding', 'definitionURL',
    ],
    ALLOW_DATA_ATTR: false,
  });
}
