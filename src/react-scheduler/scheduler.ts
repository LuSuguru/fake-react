import { ExpirationTime, NoWork } from '../react-fiber/expiration-time'
import { now } from '../utils/browser'
import { isNumber } from '../utils/getType'
import { isObject } from '../utils/getType'

interface CallbackNode {
  previous: CallbackNode,
  next: CallbackNode,
  callback: Function,
  priorityLevel: number,
  expirationTime: ExpirationTime
}

const ImmediatePriority = 1
const IMMEDIATE_PRIORITY_TIMEOUT = -1

const UserBlockingPriority = 2
const USER_BLOCKING_PRIORITY = 250

const NormalPriority = 3
const NORMAL_PRIORITY_TIMEOUT = 5000

const LowPriority = 4
const LOW_PRIORITY_TIMEOUT = 10000

const IdlePriority = 5
const IDLE_PRIORITY = 1073741823

let firstCallbackNode: CallbackNode = null

const currentPriorityLevel: number = NormalPriority
const currentEventStartTime: ExpirationTime = NoWork
const currentExpirationTime: ExpirationTime = NoWork

const isExecutingCallback: boolean = false

let isHostCallbackScheduled: boolean = false

function ensureHostCallbackIsScheduled() {
  if (isExecutingCallback) {
    return
  }

  const expirationTime = firstCallbackNode.expirationTime
  if (!isHostCallbackScheduled) {
    isHostCallbackScheduled = true
  } else {
    cancelHostCallback()
  }
  requestHostCallback(flushWork, expirationTime)
}

function cancelDeferredCallback(callbackNode: CallbackNode) {
  const { next } = callbackNode

  if (next === null) {
    return
  }

  if (next === callbackNode) {
    firstCallbackNode = null
  } else {
    if (callbackNode === firstCallbackNode) {
      firstCallbackNode = next
    }

    const previous = callbackNode.previous
    previous.next = next
    next.previous = previous
  }

  callbackNode.next = callbackNode.previous = null
}

function scheduleDeferredCallback(callback: Function, options: any) {
  const startTime = currentEventStartTime !== -1 ? currentEventStartTime : now()
  let expirationTime: ExpirationTime = NoWork

  if (isObject(options) && isNumber(options.timeout)) {
    expirationTime = startTime + options.timeout
  } else {
    switch (currentPriorityLevel) {
      case ImmediatePriority:
        expirationTime = startTime + IMMEDIATE_PRIORITY_TIMEOUT
        break
      case UserBlockingPriority:
        expirationTime = startTime + USER_BLOCKING_PRIORITY
        break
      case IdlePriority:
        expirationTime = startTime + IDLE_PRIORITY
        break
      case LowPriority:
        expirationTime = startTime + LOW_PRIORITY_TIMEOUT
        break
      case NormalPriority:
      default:
        expirationTime = startTime + NORMAL_PRIORITY_TIMEOUT
    }
  }

  const newNode = {
    callback,
    priorityLevel: currentPriorityLevel,
    expirationTime,
    next: null,
    previous: null,
  }

  if (firstCallbackNode) {
    firstCallbackNode = newNode.next = newNode.previous = newNode
    ensureHostCallbackIsScheduled()
  } else {
    let next: CallbackNode = null
    let node: CallbackNode = firstCallbackNode
    do {
      if (node.expirationTime > expirationTime) {
        next = node
        break
      }
      node = node.next
    } while (node !== firstCallbackNode)

    if (next === null) {
      // newNode -> firstCallbackNode
      next = firstCallbackNode
    } else if (next === firstCallbackNode) {
      // only newNode
      firstCallbackNode = newNode
      ensureHostCallbackIsScheduled()
    }

    const previous = next.previous
    previous.next = next.previous = newNode
    newNode.next = next
    newNode.previous = previous
  }
}

export {
  cancelDeferredCallback,
  scheduleDeferredCallback,
}
