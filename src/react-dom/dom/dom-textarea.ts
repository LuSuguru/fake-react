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

function setTextareaValue(element: any) {
  const { textContent } = element

  if (textContent === element._wrapperState.initialValue) {
    element.value = textContent
  }
}

function updateTextareaProps(element: any, props: any) {
  const value = getToStringValue(props.value)
  const defaultValue = getToStringValue(props.defaultValue)
  if (value != null) {
    const newValue = '' + value

    if (newValue !== element.value) {
      element.value = newValue
    }
    if (props.defaultValue == null && element.defaultValue !== newValue) {
      element.defaultValue = newValue
    }
  }
  if (defaultValue != null) {
    element.defaultValue = '' + defaultValue
  }
}

export {
  initTextareaProps,
  getTextareaProps,
  setTextareaValue,
  updateTextareaProps,
}
