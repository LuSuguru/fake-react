import { Container } from '../react-dom/dom/dom-component'
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

function getActiveElement(doc?: Document): Element {
  doc = doc || (typeof document !== 'undefined' ? document : undefined)
  if (typeof doc === 'undefined') {
    return null
  }
  try {
    return doc.activeElement || doc.body
  } catch (e) {
    return doc.body
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

function isCustomComponent(tagName: string, props: any) {
  if (tagName.indexOf('-') === -1) {
    return typeof props.is === 'string'
  }
  switch (tagName) {
    case 'annotation-xml':
    case 'color-profile':
    case 'font-face':
    case 'font-face-src':
    case 'font-face-uri':
    case 'font-face-format':
    case 'font-face-name':
    case 'missing-glyph':
      return false
    default:
      return true
  }
}

function isTextInputElement(elem?: HTMLElement): boolean {
  const supportedInputTypes: { [key: string]: true } = {
    'color': true,
    'date': true,
    'datetime': true,
    'datetime-local': true,
    'email': true,
    'month': true,
    'number': true,
    'password': true,
    'range': true,
    'search': true,
    'tel': true,
    'text': true,
    'time': true,
    'url': true,
    'week': true,
  }

  const nodeName = elem && elem.nodeName && elem.nodeName.toLowerCase()

  if (nodeName === 'input') {
    return !!supportedInputTypes[(elem as HTMLInputElement).type]
  }

  if (nodeName === 'textarea') {
    return true
  }

  return
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

function insertInContainerBefore(container: Container, child: Element | Text, beforeChild: Element | Text | Comment): void {
  if (container.nodeType === COMMENT_NODE) {
    container.parentNode.insertBefore(child, beforeChild)
  } else {
    container.insertBefore(child, beforeChild)
  }
}

function removeChild(parentInstance: Element, child: Element | Text | Comment) {
  parentInstance.removeChild(child)
}

function removeChildFromContainer(container: Container, child: Element | Text | Comment) {
  if (container.nodeType === COMMENT_NODE) {
    container.parentNode.removeChild(child)
  } else {
    container.removeChild(child)
  }
}

function setFoucus(domElement: any, type: string, newProps: any) {
  if (shouldAutoFocusHostComponent(type, newProps)) {
    domElement.focus()
  }
}

function addEventBubbledListener(element: Document | Element, eventType: string, listener: any) {
  element.addEventListener(eventType, listener, false)
}

function addEventCaptureListener(element: Document | Element, eventType: string, listener: any) {
  element.addEventListener(eventType, listener, true)
}


export {
  noTimeout,
  clearTimeout,
  getActiveElement,
  isCustomComponent,
  isTextInputElement,
  shouldSetTextContent,
  shouldDeprioritizeSubtree,
  shouldAutoFocusHostComponent,
  appendChild,
  appendChildToContainer,
  insertBefore,
  insertInContainerBefore,
  removeChild,
  removeChildFromContainer,
  setFoucus,
  addEventBubbledListener,
  addEventCaptureListener,
}
