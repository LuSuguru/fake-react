import { Component } from './react-component'

class ReactNoopUpdateQueue {
  isMount() {
    return false
  }

  enqueueForceUpdate() {

  }

  enqueueReplaceState() {

  }

  enqueueSetState(publicInstance: Component, partialState: any, callback: any, callerName?: any) {

  }
}

export default ReactNoopUpdateQueue