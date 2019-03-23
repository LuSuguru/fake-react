import { Component } from './react-component'

export interface ReactUpdateQueue {
  isMounted: (publicInstance: Component) => boolean,
  enqueueForceUpdate: (publicInstance: Component, callback?: any, callerName?: any) => void,
  enqueueReplaceState: (publicInstance: Component, completeState: any, callback?: any, callerName?: any) => void
  enqueueSetState: (publicInstance?: Component, partialState?: any, callback?: any, callerName?: any) => void
}

const ReactNoopUpdateQueue: ReactUpdateQueue = {
  isMounted(publicInstance: Component) {
    return false
  },

  enqueueForceUpdate(publicInstance: Component, callback?: any, callerName?: any) {
    return
  },

  enqueueReplaceState(publicInstance: Component, completeState: any, callback?: any, callerName?: any) {
    return
  },

  enqueueSetState(publicInstance?: Component, partialState?: any, callback?: any, callerName?: any) {
    return
  },
}

export default ReactNoopUpdateQueue

