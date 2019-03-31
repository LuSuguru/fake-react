import { DOCUMENT_NODE } from '../react-type/html-type'
import { isText } from '../utils/getType'
import { getInputProps } from './dom-input'
import { getOptionProps } from './dom-options'
import { getSelectProps } from './dom-select'
import { getTextareaProps } from './dom-textarea'

export type Container = Element | Document
export type HostContext = string

function getOwnerDocumentFromRootContainer(rootContainerElement: any): Document {
  return rootContainerElement.nodeType === DOCUMENT_NODE ? rootContainerElement : rootContainerElement.ownerDocument
}

function createElement(type: string, props: any, rootContainerInstance: Container, parentNamespace: string) {
  const ownerDocument: Document = getOwnerDocumentFromRootContainer(rootContainerInstance)
  let domElement: Element

}

function diffProperties(domElement: Element, tag: string, lastRawProps: object, newRawProps: object, rootContainerElement: Container): any[] {
  let updatePayload: any[] = null

  let lastProps: object = null
  let nextProps: object = null

  switch (tag) {
    case 'input':
      lastProps = getInputProps(domElement, lastRawProps)
      nextProps = getInputProps(domElement, newRawProps)
      updatePayload = []
      break
    case 'option':
      lastProps = getOptionProps(domElement, lastRawProps)
      nextProps = getOptionProps(domElement, newRawProps)
      updatePayload = []
      break
    case 'select':
      lastProps = getSelectProps(domElement, lastRawProps)
      nextProps = getSelectProps(domElement, newRawProps)
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

function createInstance(type: string, props: any, rootContainerInstance: Container, hostContext: any, internalInstanceHandle: Fiber) {
  createElement(type, props, rootContainerInstance, hostContext)
}

export {
  diffProperties,
  createInstance,
}
