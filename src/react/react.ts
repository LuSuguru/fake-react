import { REACT_ELEMENT_TYPE } from '../react-type/react-type'

export interface ReactElement {
  $$typeof: string,
  type: any,
  key: string | null,
  ref: any,
  props: any
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

    Object.keys(defaultProps).forEach((name) => {
      if (props[name] === undefined) {
        props[name] = defaultProps[name]
      }
    })
  }

  return {
    $$typeof: REACT_ELEMENT_TYPE,
    key,
    props,
    ref,
    type,
  }
}

export { createElement }
