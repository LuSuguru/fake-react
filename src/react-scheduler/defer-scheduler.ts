import { now } from '../utils/browser'
import { isFunction, isNumber } from '../utils/getType'
import { isObject } from '../utils/getType'
import { cancelHostCallback, requestHostCallback, shouldYieldToHost } from './config'

export interface CallbackNode {
  previous: CallbackNode,
  next: CallbackNode,
  callback: Function,
  priorityLevel: number,
  expirationTime: number
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

let firstCallbackNode: CallbackNode = null // 存储callback双向链表,按过期时间从小到大

let currentDidTimeout: boolean = false

let currentPriorityLevel: number = NormalPriority
let currentExpirationTime: number = 0

const currentEventStartTime: number = 0

let isExecutingCallback: boolean = false // 是否正在工作中的 flag

let isHostCallbackScheduled: boolean = false // 是否初始状态的 flag

function ensureHostCallbackIsScheduled() {
  if (isExecutingCallback) {
    return
  }

  const { expirationTime } = firstCallbackNode
  if (!isHostCallbackScheduled) {
    isHostCallbackScheduled = true
  } else {
    cancelHostCallback()
  }
  requestHostCallback(flushWork, expirationTime)
}

function flushFirstCallback() {
  const flushedNode: CallbackNode = firstCallbackNode

  // 从链表中取出 callbackNode
  let next: CallbackNode = firstCallbackNode.next
  if (firstCallbackNode === next) {
    firstCallbackNode = null
    next = null
  } else {
    const lastCallbackNode: CallbackNode = firstCallbackNode.previous
    firstCallbackNode = lastCallbackNode.next = next
    next.previous = lastCallbackNode
  }
  flushedNode.next = flushedNode.previous = null

  const { callback, expirationTime, priorityLevel } = flushedNode
  const previousPriorityLevel = currentPriorityLevel
  const previousExpirationTime = currentExpirationTime

  currentPriorityLevel = priorityLevel
  currentExpirationTime = expirationTime

  let continuationCallback: any = null

  try {
    continuationCallback = callback(currentDidTimeout)
  } finally {
    currentPriorityLevel = previousPriorityLevel
    currentExpirationTime = previousExpirationTime
  }

  if (isFunction(continuationCallback)) {
    const continuationNode: CallbackNode = {
      callback: continuationCallback,
      priorityLevel,
      expirationTime,
      next: null,
      previous: null,
    }
    scheduleCallNode(continuationNode, expirationTime)
  }
}

function flushImmediateWork() {
  if (currentEventStartTime === -1 && firstCallbackNode !== null && firstCallbackNode.priorityLevel === ImmediatePriority) {
    isExecutingCallback = true

    try {
      do {
        flushFirstCallback()
      } while (firstCallbackNode !== null && firstCallbackNode.priorityLevel === ImmediatePriority)
    } finally {
      isExecutingCallback = false
      if (firstCallbackNode !== null) {
        ensureHostCallbackIsScheduled()
      } else {
        isHostCallbackScheduled = false
      }
    }
  }
}

function flushWork(didTimeout: boolean) {
  isExecutingCallback = true
  const previousDidTimeout = currentDidTimeout
  currentDidTimeout = didTimeout

  try {
    // 处理全部已经过期的callback
    if (didTimeout) {
      while (firstCallbackNode !== null) {
        const currentTime = now()
        if (firstCallbackNode.expirationTime < currentTime) {
          do {
            flushFirstCallback()
          } while (firstCallbackNode !== null && firstCallbackNode.expirationTime <= currentTime)
          continue
        }
        break
      }
    } else {
      // 保持处理直到帧到期
      if (firstCallbackNode !== null) {
        do {
          flushFirstCallback()
        } while (firstCallbackNode !== null && !shouldYieldToHost())
      }
    }
  } finally {
    isExecutingCallback = false
    currentDidTimeout = previousDidTimeout

    // 如果还有任务，继续触发
    if (firstCallbackNode !== null) {
      ensureHostCallbackIsScheduled()
    } else {
      isHostCallbackScheduled = false
    }

    // 处理需要立即执行的任务
    flushImmediateWork()
  }
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

function scheduleCallNode(newNode: CallbackNode, expirationTime: number) {
  if (firstCallbackNode === null) {
    firstCallbackNode = newNode.next = newNode.previous = newNode
    ensureHostCallbackIsScheduled()
  } else {
    let next: CallbackNode = null
    let node: CallbackNode = firstCallbackNode
    do {
      if (node.expirationTime >= expirationTime) {
        next = node
        break
      }
      node = node.next
    } while (node !== firstCallbackNode)

    if (next === null) {
      // 没有找到比当前callback到期时间大的，将当前callback放到链表最后
      next = firstCallbackNode
    } else if (next === firstCallbackNode) {
      // 当前任务过期时间最小
      firstCallbackNode = newNode
      ensureHostCallbackIsScheduled()
    }

    const previous = next.previous
    previous.next = next.previous = newNode
    newNode.next = next
    newNode.previous = previous
  }
}

function scheduleDeferredCallback(callback: Function, options?: any): CallbackNode {
  const startTime = currentEventStartTime !== -1 ? currentEventStartTime : now()
  let expirationTime: number = 0

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

  const newNode: CallbackNode = {
    callback,
    priorityLevel: currentPriorityLevel,
    expirationTime,
    next: null,
    previous: null,
  }

  scheduleCallNode(newNode, expirationTime)
  return newNode
}

function shouldYield(): boolean {
  return (
    !currentDidTimeout &&
    ((firstCallbackNode !== null && firstCallbackNode.expirationTime < currentExpirationTime) || shouldYieldToHost())
  )
}

export {
  cancelDeferredCallback,
  scheduleDeferredCallback,
  shouldYield,
}
