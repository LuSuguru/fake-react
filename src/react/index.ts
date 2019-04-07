import { LazyComponent } from '../react-fiber/lazy-component'
import { REACT_FORWARD_REF_TYPE, REACT_FRAGMENT_TYPE, REACT_LAZY_TYPE, REACT_MEMO_TYPE, REACT_STRICT_MODE_TYPE, REACT_SUSPENSE_TYPE } from '../react-type/react-type'

export { Component, PureComponent } from './react-component'
export { createElement } from './react'

interface RefObject {
  current: any
}

function createRef(): object {
  return { current: null }
}

function forwardRef(render: Function): object {
  return {
    $$typeof: REACT_FORWARD_REF_TYPE,
    render,
  }
}

function lazy(ctor: Function): LazyComponent {
  return {
    $$typeof: REACT_LAZY_TYPE,
    _ctor: ctor,
    _status: -1,
    _result: null,
  }
}
function memo(type: any, compare?: Function) {
  return {
    $$typeof: REACT_MEMO_TYPE,
    type,
    compare: compare === undefined ? null : compare,
  }
}

const Fragment = REACT_FRAGMENT_TYPE
const StrictMode = REACT_STRICT_MODE_TYPE
const Suspense = REACT_SUSPENSE_TYPE

export {
  createRef,

  forwardRef,
  lazy,
  memo,

  Fragment,
  StrictMode,
  Suspense,
}
