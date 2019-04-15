let restoreTarget: EventTarget = null
let restoreQueue: EventTarget[] = null

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

export {
  enqueueStateRestore,
}
