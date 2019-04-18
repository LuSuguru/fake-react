import { getToStringValue } from '../../utils/lib'

function updateOptions(node: HTMLSelectElement, multiple: boolean, propValue: any, setDefaultSelected: boolean) {
  const { options } = node

  if (multiple) {
    const selectedValues = propValue
    const selectedValue = {}

    for (let i = 0; i < selectedValues.length; i++) {
      selectedValue['$' + selectedValues[i]] = true
    }

    for (let i = 0; i < options.length; i++) {
      const selected = selectedValue.hasOwnProperty('$' + options[i].value)
      if (options[i].selected !== selected) {
        options[i].selected = selected
      }
      if (selected && setDefaultSelected) {
        options[i].defaultSelected = true
      }
    }
  } else {
    const selectedValue = '' + getToStringValue(propValue)
    let defaultSelected = null

    for (let i = 0; i < options.length; i++) {
      if (options[i].value === selectedValue) {
        options[i].selected = true
        if (setDefaultSelected) {
          options[i].defaultSelected = true
        }
        return
      }

      if (defaultSelected === null && !options[i].disabled) {
        defaultSelected = options[i]
      }
    }
    if (defaultSelected !== null) {
      defaultSelected.selected = true
    }
  }
}

function initSelectProps(element: any, props: any) {
  element._wrapperState = { wasMultiple: !!props.multiple }
}

function getSelectProps(props: object) {
  return {
    ...props,
    value: undefined,
  }
}

function setSelectValue(node: any, props: any) {
  node.multiple = !!props.multiple
  const value = props.value

  if (value != null) {
    updateOptions(node, !!props.multiple, value, false)
  } else if (props.defaultValue != null) {
    updateOptions(node, !!props.multiple, props.defaultValue, true)
  }
}

function restoreSelectControlledState(node: any, props: any) {
  const { value } = props
  if (value !== null) {
    updateOptions(node, !!props.multiple, value, false)
  }
}

export {
  initSelectProps,
  getSelectProps,
  setSelectValue,
  restoreSelectControlledState,
}
