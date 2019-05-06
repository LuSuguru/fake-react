import { getNodeFromInstance } from '../react-dom/dom/dom-component-tree'
import { Fiber } from '../react-fiber/fiber'
import SyntheticEvent from './synthetic-event'

function executeDispatchesInOrder(event: SyntheticEvent) {
  // console.log(1)
  const dispatchListeners = event._dispatchListeners
  const dispatchInstances = event._dispatchInstances

  if (Array.isArray(dispatchListeners)) {
    for (let i = 0; i < dispatchListeners.length; i++) {
      if (event.isPropagationStopped()) {
        break
      }
      // console.log(i)
      executeDispatch(event, dispatchListeners[i], dispatchInstances[i])
    }
  } else if (dispatchListeners) {
    executeDispatch(event, dispatchListeners, dispatchInstances as Fiber)
  }
  event._dispatchListeners = null
  event._dispatchInstances = null
}

function executeDispatch(event: SyntheticEvent, listener: Function, inst: Fiber) {
  event.currentTarget = getNodeFromInstance(inst)
  // console.log(listener)
  // console.log(inst)
  listener(event)
  event.currentTarget = null
}

export {
  executeDispatchesInOrder,
}


