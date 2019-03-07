import { Component } from './react-component'

class ReactNoopUpdateQueue {
  isMount() {
    return false
  }

  enqueueForceUpdate(publicInstance?: Component, callback?: any, callerName?: any) {

  }

  enqueueReplaceState() {

  }

  enqueueSetState(publicInstance?: Component, partialState?: any, callback?: any, callerName?: any) {

  }
}

export default ReactNoopUpdateQueue