import { getToStringValue } from '../../utils/lib'

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

function setInputValue(node: any, props: any, isHydrating: boolean) {
  if (props.hasOwnProperty('value') || props.hasOwnProperty('defaultValue')) {
    const { type } = props
    const isButton = type === 'submit' || type === 'reset'

    // Avoid setting value attribute on submit/reset inputs as it overrides the default value provided by the browser.
    if (isButton && (props.value === undefined || props.value === null)) {
      return
    }

    const initialValue = '' + node._wrapperState.initialValue

    if (!isHydrating) {
      if (initialValue !== node.value) {
        node.value = initialValue
      }
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

export {
  initInputProps,
  getInputProps,
  setInputValue,
}
