import { COMMENT_NODE } from '../react-type/html-type'

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

function shouldAutoFocusHostComponent(type: string, props: any): boolean {
  switch (type) {
    case 'button':
    case 'input':
    case 'select':
    case 'textarea':
      return !!props.autoFocus
  }
  return false
}

function appendChild(parentInstance: Element, child: Element | Text) {
  parentInstance.appendChild(child)
}

function appendChildToContainer(container: any, child: Element | Text) {
  let parentNode: any = null
  if (container.nodeType === COMMENT_NODE) {
    parentNode = container.parentNode
    parentNode.insertBefore(child, container)
  } else {
    parentNode = container
    parentNode.appendChild(child)
  }
  const reactRootContainer = container._reactRootContainer
  // portal情况下
  if ((reactRootContainer === null || reactRootContainer === undefined) && parentNode.onclick === null) {
    parentNode.onclick = () => null
  }
}

function insertBefore(parentInstance: Element, child: Element | Text, beforeChild: Element | Text | Comment) {
  parentInstance.insertBefore(child, beforeChild)
}

function insertInContainerBefore(container: Document | Element, child: Element | Text, beforeChild: Element | Text | Comment): void {
  if (container.nodeType === COMMENT_NODE) {
    container.parentNode.insertBefore(child, beforeChild)
  } else {
    container.insertBefore(child, beforeChild)
  }
}

export {
  noTimeout,
  clearTimeout,
  shouldSetTextContent,
  shouldDeprioritizeSubtree,
  shouldAutoFocusHostComponent,
  appendChild,
  appendChildToContainer,
  insertBefore,
  insertInContainerBefore,
}
