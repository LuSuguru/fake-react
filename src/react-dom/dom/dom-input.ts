import { getToStringValue } from '../../utils/lib'
import { setValueForProperty } from './property-operation'

function isControlled(props) {
  const usesChecked = props.type === 'checkbox' || props.type === 'radio'
  return usesChecked ? props.checked != null : props.value != null
}

function initInputProps(element: any, props: any) {
  const defaultValue = props.defaultValue == null ? '' : props.defaultValue

  element._wrapperState = {
    initialChecked: props.checked != null ? props.checked : props.defaultChecked,
    initialValue: getToStringValue(props.value != null ? props.value : defaultValue),
    controlled: isControlled(props),
  }
}


function getInputProps(element: any, props: any) {
  return {
    ...props,
    ...{
      defaultChecked: undefined,
      defaultValue: undefined,
      value: undefined,
      checked: props.checked != null ? props.checked : element._wrapperState.initialChecked,
    },
  }
}

function setInputValue(node: any, props: any) {
  if (props.hasOwnProperty('value') || props.hasOwnProperty('defaultValue')) {
    const { type } = props
    const isButton = type === 'submit' || type === 'reset'

    // Avoid setting value attribute on submit/reset inputs as it overrides the default value provided by the browser.
    if (isButton && (props.value === undefined || props.value === null)) {
      return
    }

    const initialValue = '' + node._wrapperState.initialValue

    if (initialValue !== node.value) {
      node.value = initialValue
    }

    node.defaultValue = initialValue
  }

  // We need to temporarily unset name to avoid disrupting radio button groups.
  const name = node.name
  if (name !== '') {
    node.name = ''
  }


  node.defaultChecked = !node.defaultChecked
  node.defaultChecked = !!node._wrapperState.initialChecked

  if (name !== '') {
    node.name = name
  }
}

function updateInputValue(element: any, props: any) {
  updateChecked(element, props)

  const value = getToStringValue(props.value)
  const type = props.type

  if (value != null) {
    if (type === 'number') {
      if ((value === 0 && element.value === '') || element.value !== value) {
        element.value = '' + value
      }
    } else if (element.value !== '' + value) {
      element.value = '' + value
    }
  } else if (type === 'submit' && type === 'reset') {
    element.removeAttribute('value')
    return
  }

  if (props.hasOwnProperty('value')) {
    setDefaultValue(element, props.type, value)
  } else if (props.hasOwnProperty('defaultValue')) {
    setDefaultValue(element, props.type, getToStringValue(props.defaultValue))
  }

  if (props.checked == null && props.defaultChecked != null) {
    element.defaultChecked = !!props.defaultChecked
  }
}

function updateChecked(element: Element, props: any) {
  const { checked } = props

  if (checked !== null) {
    setValueForProperty(element, 'checked', checked, false)
  }
}

function setDefaultValue(node: any, type: string, value: any) {
  if (type !== 'number' || node.ownerDocument.activeElement !== node) {
    if (value == null) {
      node.defaultValue = '' + node._wrapperState.initialValue
    } else if (node.defaultValue !== '' + value) {
      node.defaultValue = '' + value
    }
  }
}

export {
  initInputProps,
  getInputProps,
  setInputValue,
  updateChecked,
  updateInputValue,
  setDefaultValue,
}
