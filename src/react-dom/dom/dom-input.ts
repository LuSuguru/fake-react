import { getToStringValue } from '../utils/lib'

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

export { initInputProps, getInputProps }
