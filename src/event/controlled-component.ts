import { getFiberCurrentPropsFromNode, getInstanceFromNode } from '../react-dom/dom/dom-component-tree'

let restoreTarget: EventTarget = null
let restoreQueue: EventTarget[] = null
let restoreImpl: Function = () => null

function restoreStateOfTarget(target: any) {
  const internalInstance = getInstanceFromNode(target)
  if (!internalInstance) {
    return
  }

  const props = getFiberCurrentPropsFromNode(internalInstance.stateNode)

  // restoreImpl(internalInstance.stateNode, internalInstance.type, props)
}

export function setRestoreImplementation(impl: (domElement: Element, tag: string, props: Object) => void): void {
  restoreImpl = impl
}

function enqueueStateRestore(target: EventTarget) {
  if (restoreTarget) {
    if (restoreQueue) {
      restoreQueue.push(restoreTarget)
    } else {
      restoreQueue = [restoreTarget]
    }
  } else {
    restoreTarget = target
  }
}

function needsStateRestore(): boolean {
  return restoreTarget !== null || restoreQueue !== null
}

function restoreStateIfNeeded() {
  if (!restoreTarget) {
    return
  }
  const target = restoreTarget
  const queuedTargets = restoreQueue
  restoreTarget = null
  restoreQueue = null

  restoreStateOfTarget(target)
  if (queuedTargets) {
    for (let i = 0; i < queuedTargets.length; i++) {
      restoreStateOfTarget(queuedTargets[i])
    }
  }
}

export {
  enqueueStateRestore,
  needsStateRestore,
  restoreStateIfNeeded,
}
