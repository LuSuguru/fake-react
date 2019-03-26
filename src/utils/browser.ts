const noTimeout = -1
const clearTimeout = window.clearTimeout

export function now() {
  const havePerformance: boolean = typeof performance === 'object' && typeof performance.now === 'function'

  if (havePerformance) {
    return performance.now()
  } else {
    return Date.now()
  }
}

function shouldSetTextContent(type: string, props: any): boolean {
  return (
    type === 'textarea'
    || type === 'option'
    || type === 'noscript'
    || typeof props.children === 'string'
    || typeof props.children === 'number'
    || (typeof props.dangerouslySetInnerHTML === 'object' && props.dangerouslySetInnerHTML !== null && props.dangerouslySetInnerHTML.__html != null))
}

function shouldDeprioritizeSubtree(type: string, props: any): boolean {
  return !!props.hidden
}

export {
  noTimeout,
  clearTimeout,
  shouldSetTextContent,
  shouldDeprioritizeSubtree,
}
