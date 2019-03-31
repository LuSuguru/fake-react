export const HTML_NAMESPACE = 'http://www.w3.org/1999/xhtml'
export const MATH_NAMESPACE = 'http://www.w3.org/1998/Math/MathML'
export const SVG_NAMESPACE = 'http://www.w3.org/2000/svg'

export function getIntrinsicNamespace(type: string): string {
  switch (type) {
    case 'svg':
      return SVG_NAMESPACE
    case 'math':
      return MATH_NAMESPACE
    default:
      return HTML_NAMESPACE
  }
}

export function getChildNamespace(parentNamespace: string | null, type: string): string {
  if (parentNamespace == null || parentNamespace === HTML_NAMESPACE) {
    return getIntrinsicNamespace(type)
  }
  if (parentNamespace === SVG_NAMESPACE && type === 'foreignObject') {
    return HTML_NAMESPACE
  }

  return parentNamespace
}
