import { listenTo } from '../../event/dom/browser-event-emitter'
import { registrationNameModules } from '../../event/plugin-registry'
import { Fiber } from '../../react-fiber/fiber'
import { DOCUMENT_FRAGMENT_NODE, DOCUMENT_NODE } from '../../react-type/html-type'
import { isCustomComponent } from '../../utils/browser'
import { shouldAutoFocusHostComponent } from '../../utils/browser'
import { getIntrinsicNamespace, HTML_NAMESPACE } from '../../utils/dom-namespaces'
import { isText } from '../../utils/getType'
import { setValueForStyles } from './css-property-operation'
import { precacheFiberNode, updateFiberProps } from './dom-component-tree'
import { getInputProps, initInputProps, setInputValue, updateChecked, updateInputValue } from './dom-input'
import { getOptionProps, setOptionValue } from './dom-options'
import { getSelectProps, initSelectProps, setSelectValue } from './dom-select'
import { getTextareaProps, initTextareaProps, setTextareaValue, updateTextareaProps } from './dom-textarea'
import { track } from './input-value-track'
import { setInnerHtml, setTextContent, setValueForProperty } from './property-operation'

export type Container = Element | Document
export type HostContext = string

function ensureListeningTo(rootContainerElement: Container, registrationName: string) {
  const isDocumentOrFragment = rootContainerElement.nodeType === DOCUMENT_NODE || rootContainerElement.nodeType === DOCUMENT_FRAGMENT_NODE
  const doc = isDocumentOrFragment ? rootContainerElement : rootContainerElement.ownerDocument

  listenTo(registrationName, doc)
}

function getOwnerDocumentFromRootContainer(rootContainerElement: any): Document {
  return rootContainerElement.nodeType === DOCUMENT_NODE ? rootContainerElement : rootContainerElement.ownerDocument
}

function createElement(type: string, props: any, rootContainerInstance: Container, parentNamespace: string): Element {
  const ownerDocument: Document = getOwnerDocumentFromRootContainer(rootContainerInstance)
  let domElement: any

  let nameSpaceURI: string = parentNamespace
  if (nameSpaceURI === HTML_NAMESPACE) {
    nameSpaceURI = getIntrinsicNamespace(type)
  }

  if (nameSpaceURI === HTML_NAMESPACE) {
    if (type === 'script') {
      const div = ownerDocument.createElement('div')
      div.innerHTML = '<script></script>'
      const firstChild: any = div.firstChild
      domElement = div.removeChild(firstChild)
    } else if (typeof props.is === 'string') {
      domElement = ownerDocument.createElement(type, { is: props.is })
    } else {
      domElement = ownerDocument.createElement(type)

      if (type === 'select' && props.multiple) {
        domElement.multiple = true
      }
    }
  } else {
    domElement = ownerDocument.createElementNS(nameSpaceURI, type)
  }

  return domElement
}

function setInitialDOMProperties(tag: string, domElement: Element, rootContainerElement: Container, nextProps: any, isCustomComponentTag: boolean) {
  Object.keys(nextProps).forEach((propKey) => {
    const nextProp = nextProps[propKey]
    switch (propKey) {
      case 'style':
        setValueForStyles(domElement, nextProp)
        break
      case 'dangerouslySetInnerHTML': {
        const nextHtml = nextProp ? nextProp.__html : undefined
        if (nextHtml != null) {
          setInnerHtml(domElement, nextHtml)
        }
        break
      }
      case 'children': {
        if (typeof nextProp === 'string') {
          const canSetTextContent = tag !== 'textarea' || nextProp !== ''
          if (canSetTextContent) {
            setTextContent(domElement, nextProp)
          }
        } else if (typeof nextProp === 'number') {
          setTextContent(domElement, '' + nextProp)
        }
        break
      }
      case 'suppressContentEditableWarning':
      case 'suppressHydrationWarning':
      case 'autoFocus':
        break
      default: {
        if (registrationNameModules.hasOwnProperty(propKey)) { // 事件处理
          if (nextProp != null) {
            ensureListeningTo(rootContainerElement, propKey)
          }
        } else if (nextProp != null) {
          setValueForProperty(domElement, propKey, nextProp, isCustomComponentTag)
        }
      }
    }
  })
}

function diffProperties(domElement: any, tag: string, lastRawProps: object, newRawProps: object, rootContainerElement: Container): any[] {
  let updatePayload: any[] = null

  let lastProps: any = null
  let nextProps: any = null

  switch (tag) {
    case 'input':
      lastProps = getInputProps(domElement, lastRawProps)
      nextProps = getInputProps(domElement, newRawProps)
      updatePayload = []
      break
    case 'option':
      lastProps = getOptionProps(lastRawProps)
      nextProps = getOptionProps(newRawProps)
      updatePayload = []
      break
    case 'select':
      lastProps = getSelectProps(lastRawProps)
      nextProps = getSelectProps(newRawProps)
      updatePayload = []
      break
    case 'textarea':
      lastProps = getTextareaProps(domElement, lastRawProps)
      nextProps = getTextareaProps(domElement, newRawProps)
      updatePayload = []
      break
    default:
      lastProps = lastRawProps
      nextProps = newRawProps
      if (typeof lastProps.onClick !== 'function' && typeof nextProps.onClick === 'function') {
        domElement.onclick = () => null // safari 不可点击元素点击不冒泡，需特殊处理
      }
      break
  }

  // assertValidProps(tag, nextProps) // Props校验

  let propKey: string
  let styleName: string
  let styleUpdates: object

  for (propKey in lastProps) {
    if (nextProps.hasOwnProperty(propKey) || !lastProps.hasOwnProperty(propKey) || lastProps[propKey] === null) {
      continue
    }

    switch (propKey) {
      case 'style':
        const lastStyle = lastProps[propKey]
        for (styleName in lastStyle) {
          if (lastStyle.hasOwnProperty(styleName)) {
            if (!styleUpdates) {
              styleUpdates = {}
            }
            styleUpdates[styleName] = ''
          }
        }
        break
      case 'dangerouslySetInnerHTML':
      case 'children':
      case 'suppressContentEditableWarning':
      case 'suppressHydrationWarning':
      case 'autoFocus':
        break
      // case registrationNameModules.hasOwnProperty(propKey): { // 事件对象处理
      //   break
      // }
      default:
        (updatePayload = updatePayload || []).push(propKey, null)
        break
    }
  }

  for (propKey in nextProps) {
    const nextProp = nextProps[propKey]
    const lastProp = lastProps !== null ? lastProps[propKey] : undefined

    if (!nextProps.hasOwnProperty(propKey) || nextProp === lastProp || (nextProp === null && lastProp === null)) {
      continue
    }

    switch (propKey) {
      case 'style': {
        if (lastProp) {
          for (styleName in lastProps) {
            if (lastProp.hasOwnProperty(styleName) && (!nextProp || !nextProp.hasOwnProperty(styleName))) {
              if (!styleUpdates) {
                styleUpdates = {}
              }
              styleUpdates[styleName] = ''
            }
          }

          for (styleName in nextProp) {
            if (nextProp.hasOwnProperty(styleName) && lastProp[styleName] !== nextProp[styleName]) {
              if (!styleUpdates) {
                styleUpdates = {}
              }
              styleUpdates[styleName] = nextProp[styleName]
            }
          }
        } else {
          styleUpdates = nextProp
        }
        break
      }
      case 'dangerouslySetInnerHTML': {
        const nextHtml = nextProp ? nextProp.__html : undefined
        const lastHtml = lastProp ? lastProp.__html : undefined
        if (nextHtml != null) {
          if (lastHtml !== nextHtml) {
            (updatePayload = updatePayload || []).push(propKey, '' + nextHtml)
          }
        }
        break
      }
      case 'children': {
        if (lastProp !== nextProp && isText(nextProp)) {
          (updatePayload = updatePayload || []).push(propKey, '' + nextProp)
        }
        break
      }
      case 'suppressContentEditableWarning':
      case 'suppressHydrationWarning':
        break
      // case registrationNameModules.hasOwnProperty(propKey): { // 事件监听
      //   if (nextProp != null) {
      //     ensureListeningTo(rootContainerElement, propKey);
      //   }
      //   break
      // }
      default:
        (updatePayload = updatePayload || []).push(propKey, nextProp)
        break
    }
  }

  if (styleUpdates) {
    (updatePayload = updatePayload || []).push('style', styleUpdates)
  }

  return updatePayload
}

function setInitialProperties(domElement: any, tag: string, rawProps: any, rootContainerElement: Container) {
  const isCustomComponentTag = isCustomComponent(tag, rawProps)
  let props: any

  switch (tag) {
    case 'iframe':
    case 'object':
      // trapBubbledEvent(TOP_LOAD, domElement)
      props = rawProps
      break
    case 'video':
    case 'audio':
      // Create listener for each media event
      // for (let i = 0; i < mediaEventTypes.length; i++) {
      // trapBubbledEvent(mediaEventTypes[i], domElement)
      // }
      props = rawProps
      break
    case 'source':
      // trapBubbledEvent(TOP_ERROR, domElement)
      props = rawProps
      break
    case 'img':
    case 'image':
    case 'link':
      // trapBubbledEvent(TOP_ERROR, domElement)
      // trapBubbledEvent(TOP_LOAD, domElement)
      props = rawProps
      break
    case 'form':
      // trapBubbledEvent(TOP_RESET, domElement)
      // trapBubbledEvent(TOP_SUBMIT, domElement)
      props = rawProps
      break
    case 'details':
      // trapBubbledEvent(TOP_TOGGLE, domElement)
      props = rawProps
      break
    case 'input':
      initInputProps(domElement, rawProps)
      props = getInputProps(domElement, rawProps)
      // trapBubbledEvent(TOP_INVALID, domElement)
      // ensureListeningTo(rootContainerElement, 'onChange')
      break
    case 'textarea':
      initTextareaProps(domElement, rawProps)
      props = getTextareaProps(domElement, rawProps)
      // trapBubbledEvent(TOP_INVALID, domElement)
      // ensureListeningTo(rootContainerElement, 'onChange')
      break
    case 'option':
      props = getOptionProps(rawProps)
      break
    case 'select':
      initSelectProps(domElement, rawProps)
      props = getSelectProps(rawProps)
      // trapBubbledEvent(TOP_INVALID, domElement)
      // ensureListeningTo(rootContainerElement, 'onChange')
      break
    default:
      props = rawProps
  }

  setInitialDOMProperties(tag, domElement, rootContainerElement, props, isCustomComponentTag)

  switch (tag) {
    case 'input':
      track(domElement)
      setInputValue(domElement, rawProps, false)
      break
    case 'textarea':
      track(domElement)
      setTextareaValue(domElement)
      break
    case 'option':
      setOptionValue(domElement, rawProps)
      break
    case 'select':
      setSelectValue(domElement, rawProps)
      break
    default:
      if (typeof props.onClick === 'function') {
        domElement.onclick = () => null
      }
      break
  }
}

function createInstance(type: string, props: any, rootContainerInstance: any, hostContext: any, internalInstanceHandle: Fiber): Element {
  const domElement = createElement(type, props, rootContainerInstance, hostContext)
  precacheFiberNode(internalInstanceHandle, domElement)
  updateFiberProps(domElement, props)

  return domElement
}

function createTextInstance(text: string, rootContainerInstance: any, internalInstanceHandle: Fiber): Text {
  const textNode = getOwnerDocumentFromRootContainer(rootContainerInstance).createTextNode(text)
  precacheFiberNode(internalInstanceHandle, textNode)
  return textNode
}

function finalizeInitialChildren(domElement: Element, type: string, props: any, rootContainerInstance: any): boolean {
  setInitialProperties(domElement, type, props, rootContainerInstance)
  return shouldAutoFocusHostComponent(type, props)
}

function updatePropeties(domElement: Element, updatePayload: any, tag: string, newRawProps: any) {
  if (tag === 'input' && newRawProps.type === 'radio' && newRawProps.name != null) {
    updateChecked(domElement, newRawProps)
  }

  const isCustomComponentTag = isCustomComponent(tag, newRawProps)
  for (let i = 0; i < updatePayload.length; i += 2) {
    const propKey = updatePayload[i]
    const propValue = updateFiberProps[i + 1]

    switch (propKey) {
      case 'style':
        setValueForStyles(domElement, propValue)
        break
      case 'dangerouslySetInnerHTML':
        setInnerHtml(domElement, propValue)
        break
      case 'children':
        setTextContent(domElement, propValue)
        break
      default:
        setValueForProperty(domElement, propKey, propValue, isCustomComponentTag)
    }
  }

  switch (tag) {
    case 'input':
      updateInputValue(domElement, newRawProps)
      break
    case 'textarea':
      updateTextareaProps(domElement, newRawProps)
      break
    case 'select':
      setSelectValue(domElement, newRawProps)
      break
  }
}


export {
  diffProperties,
  createInstance,
  createTextInstance,
  finalizeInitialChildren,
  updatePropeties,
}
