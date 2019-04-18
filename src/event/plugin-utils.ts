import { getNodeFromInstance } from '../react-dom/dom/dom-component-tree'
import { Fiber } from '../react-fiber/fiber'
import SyntheticEvent from './synthetic-event'

function executeDispatchesInOrder(event: SyntheticEvent) {
  const dispatchListeners = event._dispatchListeners
  const dispatchInstances = event._dispatchInstances

  if (Array.isArray(dispatchListeners)) {
    for (let i = 0; i < dispatchListeners.length; i++) {
      if (event.isPropagationStopped()) {
        break
      }

      executeDispatch(event, dispatchListeners[i], dispatchInstances[i])
    }
  } else if (dispatchListeners) {
    executeDispatch(event, dispatchListeners, dispatchInstances)
  }

  event._dispatchListeners = null
  event._dispatchInstances = null
}

function executeDispatch(event: SyntheticEvent, listener: any, inst: Fiber) {
  event.currentTarget = getNodeFromInstance(inst)
  listener(event)
  event.currentTarget = null
}

export {
  executeDispatchesInOrder,
}


