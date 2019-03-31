import { getToStringValue } from '../../utils/lib'

function initTextareaProps(element: any, props: any) {
  let initialValue: string = props.value

  if (initialValue === null) {
    let { defaultValue } = props
    const { children } = props

    if (children !== null) {
      defaultValue = Array.isArray(children) ? children[0] : children
    }

    if (defaultValue == null) {
      defaultValue = ''
    }
    initialValue = defaultValue
  }

  element._wrapperState = { initialValue: getToStringValue(initialValue) }
}

function getTextareaProps(element: any, props: object) {
  return {
    ...props,
    value: undefined,
    defaultValue: undefined,
    children: '' + element._wrapperState.initialValue,
  }
}

function setTextareaValue({ element }: any, props: any) {
  const { textContent } = element

  if (textContent === element._wrapperState.initialValue) {
    element.value = textContent
  }
}

export {
  initTextareaProps,
  getTextareaProps,
  setTextareaValue,
}
