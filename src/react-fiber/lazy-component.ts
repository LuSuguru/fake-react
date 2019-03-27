import { REACT_FORWARD_REF_TYPE, REACT_MEMO_TYPE } from '../react-type/react-type'
import { ClassComponent, ForwardRef, FunctionComponent, IndeterminateComponent, MemoComponent, WorkTag } from '../react-type/tag-type'
import { isEmpty, isFunction } from '../utils/getType'
import { shouldConstruct } from './fiber'

export interface LazyComponent {
  $$typeof: Symbol | number,
  _ctor: any,
  _status: number,
  _result: any,
}

interface ResolvedLazyComponent {
  $$typeof: Symbol | number,
  _ctor: any,
  _status: 1,
  _result: any,
}

const Pending = 0
const Resolved = 1
const Rejected = 2

export function refineResolvedLazyComponent(lazyComponent: LazyComponent): ResolvedLazyComponent {
  return lazyComponent._status === Resolved ? lazyComponent._result : null
}

function resolveDefaultProps(Component: any, baseProps: Object): Object {
  if (Component && Component.defaultProps) {
    const props = { ...baseProps }
    const { defaultProps } = Component

    Object.keys(defaultProps).forEach((name) => {
      if (props[name] === undefined) {
        props[name] = defaultProps[name]
      }
    })
    return props
  }
  return baseProps
}

function readLazyComponentType(lazyComponent: LazyComponent) {
  const status = lazyComponent._status
  const result = lazyComponent._result

  switch (status) {
    case Resolved:
      return result
    case Rejected:
    case Pending:
      throw result
    default: {
      lazyComponent._status = Pending

      const ctor = lazyComponent._ctor
      const thenable = ctor()

      thenable.then(
        (moduleObject: any) => {
          if (lazyComponent._status === Pending) {
            const defaultExport = moduleObject.default

            lazyComponent._status = Resolved
            lazyComponent._result = defaultExport
          }
        },
        (error: any) => {
          if (lazyComponent._status === Pending) {
            lazyComponent._status = Rejected
            lazyComponent._result = error
          }
        },
      )

      switch (lazyComponent._status) {
        case Resolved:
          return lazyComponent._result
        case Rejected:
          throw lazyComponent._result
      }
      lazyComponent._result = thenable
      throw thenable
    }
  }
}

function resolvedLazyComponentTag(Component: any): WorkTag {
  if (isFunction(Component)) {
    return shouldConstruct(Component) ? ClassComponent : FunctionComponent
  } else if (!isEmpty(Component)) {
    const { $$typeof } = Component
    if ($$typeof === REACT_FORWARD_REF_TYPE) {
      return ForwardRef
    }

    if ($$typeof === REACT_MEMO_TYPE) {
      return MemoComponent
    }
  }
  return IndeterminateComponent
}

export {
  resolveDefaultProps,
  readLazyComponentType,
  resolvedLazyComponentTag,
}
