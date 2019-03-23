export const REACT_ELEMENT_TYPE = 'react.element'
export const REACT_FRAGMENT_TYPE = 'react.fragment'
export const REACT_PROFILER_TYPE = 'react.profiler'
export const REACT_PORTAL_TYPE = 'react.portal'
export const REACT_STRICT_MODE_TYPE = 'react.strict_mode'
export const REACT_PROVIDER_TYPE = 'react.provider'
export const REACT_CONTEXT_TYPE = 'react.context'
export const REACT_ASYNC_MODE_TYPE = 'react.async_mode'
export const REACT_CONCURRENT_MODE_TYPE = 'react.concurrent_mode'
export const REACT_FORWARD_REF_TYPE = 'react.forward_ref'
export const REACT_SUSPENSE_TYPE = 'react.suspense'
export const REACT_MEMO_TYPE = 'react.memo'
export const REACT_LAZY_TYPE = 'react.lazy'


export type ReactEmpty = null | void | boolean
export type ReactNodeList = ReactEmpty | any[]

export interface ReactPortal {
  $$typeof: Symbol | number,
  key: null | string,
  containerInfo: any,
  children: ReactNodeList,
  // TODO: figure out the API for cross-renderer implementation.
  implementation: any,
}
