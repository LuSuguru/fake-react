import { REACT_ELEMENT_TYPE } from '../type/react-type'

type ReactElement = {
  $$typeof: string,
  type: any,
  key: string | null,
  ref: any,
  props: any,
  _owner: any
}

function createElement(type: any, config: any = {}, ...children: any[]): ReactElement {
  const {
    key = null,
    ref = null,
    __self: self = null,
    __source = null,
    ...props } = config

  props.children = children

  if (type && type.defaultProps) {
    const { defaultProps } = type

    Object.keys(defaultProps).forEach(key => {
      if (props[key] === undefined) {
        props[key] = defaultProps[key]
      }
    })
  }

  return {
    $$typeof: REACT_ELEMENT_TYPE,
    type,
    key,
    ref,
    props,
    _owner: 'Fiber'
  }
}

export { createElement }