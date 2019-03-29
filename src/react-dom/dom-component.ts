import { getInputProps } from './dom-input'
import { getOptionProps } from './dom-options'

function diffProperties(domElement: Element, tag: string, lastRawProps: object, newRawProps: object, rootContainerElement: Element | Document) {
  let updatePayload: any[] = null

  let lastProps: object = null
  let newProps: object = null

  switch (tag) {
    case 'input':
      lastProps = getInputProps(domElement, lastRawProps)
      newProps = getInputProps(domElement, newRawProps)
      updatePayload = []
      break
    case 'option':
      lastProps = getOptionProps(domElement, lastRawProps)
      newProps = getOptionProps(domElement, newRawProps)
      updatePayload = []
      break
    case 'select':

    default:
      break
  }
}

export {
  diffProperties,
}
