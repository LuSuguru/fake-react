import { REACT_ELEMENT_TYPE } from '../react-type/react-type'

export interface ReactElement {
  $$typeof: string,
  type: any,
  key: string | null,
  ref: any,
  props: any
}

/**
 * @param type 标签名
 * @param config jsx 元素上的属性
 * @param children 子元素
 */
function createElement(type: any, config: any = {}, ...children: any[]): ReactElement {
  const {
    key = null,
    ref = null,
    __self: self = null,
    __source = null,
    ...props
  } = config

  if (children.length === 1) {
    props.children = children[0]
  } else if (children.length > 1) {
    props.children = children
  }


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
