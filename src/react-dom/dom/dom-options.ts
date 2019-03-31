import { getToStringValue } from '../../utils/lib'

function getOptionProps(props: any) {
  const hostProps = { children: undefined, ...props }
  const content = props.children // flattenChildren(props.children) 暂时忽略这个操作

  if (content) {
    hostProps.children = content
  }

  return hostProps
}

function setOptionValue(element: any, props: any) {
  if (props.value != null) {
    element.setAttribute('value', '' + getToStringValue(props.value))
  }
}
export {
  getOptionProps,
  setOptionValue,
}


