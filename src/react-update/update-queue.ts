import { ExpirationTime, NoWork } from '../react-fiber/expiration-time'
import { Fiber } from '../react-fiber/fiber'
import { Callback } from '../react-type/effect-type'
import Update, { getStateFromUpdate } from './update'

let hasForceUpdate: boolean = false

export function changeHasForceUpdate(flag: boolean) {
  hasForceUpdate = flag
}

export function getHasForceUpdate() {
  return hasForceUpdate
}

export class UpdateQueue<State> {
  // 记录上一次更新后低优先级的first state,用于调用的基值
  baseState: State

  // 更新对象链表
  firstUpdate: Update<State> = null
  lastUpdate: Update<State> = null

  // 捕获错误的更新对象链表
  firstCapturedUpdate: Update<State> = null
  lastCapturedUpdate: Update<State> = null

  // 有callback的更新对象链表，用于commit callback
  firstEffect: Update<State> = null
  lastEffect: Update<State> = null

  // 同上，捕获错误版
  firstCapturedEffect: Update<State> = null
  lastCapturedEffect: Update<State> = null

  constructor(baseState: State) {
    this.baseState = baseState
  }
}

function cloneUpdateQueue<State>(queue: UpdateQueue<State>): UpdateQueue<State> {
  const updateQueue = new UpdateQueue<State>(queue.baseState)
  updateQueue.firstUpdate = queue.firstUpdate
  updateQueue.lastUpdate = queue.lastUpdate

  return updateQueue
}

function appendUpdateToQueue<State>(queue: UpdateQueue<State>, update: Update<State>) {
  if (queue.lastUpdate === null) {
    queue.firstUpdate = queue.lastUpdate = update
  } else {
    queue.lastUpdate.next = update
    queue.lastUpdate = update
  }
}

function ensureWorkInProcessQueueIsAClone<State>(workInProgress: Fiber, queue: UpdateQueue<State>): UpdateQueue<State> {
  const current = workInProgress.alternate
  if (current !== null) {
    if (queue === current.updateQueue) {
      queue = workInProgress.updateQueue = cloneUpdateQueue(queue)
    }
  }
  return queue
}

/**
 * 将更新对象 update 查到队尾
 */
export function enqueueUpdate<State>(fiber: Fiber, update: Update<State>) {
  const { alternate } = fiber

  let queue1: UpdateQueue<State>
  let queue2: UpdateQueue<State>

  if (alternate === null) {
    queue1 = fiber.updateQueue
    queue2 = null

    if (queue1 === null) {
      queue1 = fiber.updateQueue = new UpdateQueue(fiber.memoizedState)
    }
  } else {
    queue1 = fiber.updateQueue
    queue2 = alternate.updateQueue

    if (queue1 === null && queue2 === null) {
      queue1 = fiber.updateQueue = new UpdateQueue(fiber.memoizedState)
      queue2 = alternate.updateQueue = new UpdateQueue(alternate.memoizedState)
    } else if (queue1 !== null && queue2 === null) {
      queue2 = alternate.updateQueue = cloneUpdateQueue(queue1)
    } else if (queue1 === null && queue2 !== null) {
      queue1 = fiber.updateQueue = cloneUpdateQueue(queue2)
    }
  }

  if (queue2 === null || queue1 === queue2) {
    appendUpdateToQueue(queue1, update)
  } else if (queue1.lastUpdate === null || queue2.lastUpdate === null) {
    appendUpdateToQueue(queue1, update)
    appendUpdateToQueue(queue2, update)
  } else {
    // 两个队列都不为空，它们的last update是相同的
    appendUpdateToQueue(queue1, update)
    queue2.lastUpdate = update
  }
}

export function processUpdateQueue<State>(workInProgress: Fiber, queue: UpdateQueue<State>, props: any, instance: any, renderExpirationTime: ExpirationTime) {
  hasForceUpdate = false

  queue = ensureWorkInProcessQueueIsAClone(workInProgress, queue)

  let newBaseState: State = queue.baseState
  let newFirstUpdate: Update<State> = null
  let newExpirationTime: ExpirationTime = NoWork

  let update: Update<State> = queue.firstUpdate
  let resultState: State = newBaseState

  while (update !== null) {
    const updateExpirationTime = update.expirationTime

    // update 的优先级较低
    if (updateExpirationTime < renderExpirationTime) {
      // 更新 新的 update 链表起点
      if (newFirstUpdate === null) {
        newFirstUpdate = update
        newBaseState = resultState
      }

      // 更新优先级
      if (newExpirationTime < updateExpirationTime) {
        newExpirationTime = updateExpirationTime
      }
    } else {
      // 获取 state
      resultState = getStateFromUpdate(workInProgress, update, resultState, props, instance)

      // callback的处理
      const { callback } = update
      if (callback !== null) {
        workInProgress.effectTag |= Callback

        update.nextEffect = null
        if (queue.lastEffect === null) {
          queue.firstEffect = queue.lastEffect = update
        } else {
          queue.lastEffect.nextEffect = update
          queue.lastEffect = update
        }
      }
    }
    update = update.next
  }

  let newFirstCapturedUpdate: Update<State> = null
  update = queue.firstCapturedUpdate

  while (update !== null) {
    const updateExpirationTime = update.expirationTime
    if (updateExpirationTime < renderExpirationTime) {
      if (newFirstCapturedUpdate === null) {
        newFirstCapturedUpdate = update
        if (newBaseState === null) {
          newBaseState = resultState
        }
      }

      if (newExpirationTime < updateExpirationTime) {
        newExpirationTime = updateExpirationTime
      }
    } else {
      resultState = getStateFromUpdate(workInProgress, update, resultState, props, instance)

      const { callback } = update
      if (callback !== null) {
        workInProgress.effectTag |= Callback

        update.nextEffect = null
        if (queue.lastCapturedEffect === null) {
          queue.lastCapturedEffect = queue.firstCapturedEffect = update
        } else {
          queue.lastCapturedEffect.nextEffect = update
          queue.lastCapturedEffect = update
        }
      }
    }
    update = update.next
  }

  if (newFirstUpdate === null) {
    queue.lastUpdate = null
  }

  if (newFirstCapturedUpdate === null) {
    queue.lastCapturedUpdate = null
  } else {
    workInProgress.effectTag |= Callback
  }

  if (newFirstUpdate === null && newFirstCapturedUpdate === null) {
    newBaseState = resultState
  }

  queue.baseState = newBaseState
  queue.firstUpdate = newFirstUpdate
  queue.firstCapturedUpdate = newFirstCapturedUpdate

  workInProgress.expirationTime = newExpirationTime
  workInProgress.memoizedState = resultState
}

export function commitUpdateQueue<State>(finishedQueue: UpdateQueue<State>, instance: any) {
  if (finishedQueue.firstCapturedUpdate !== null) {
    if (finishedQueue.lastUpdate !== null) {
      finishedQueue.lastUpdate.next = finishedQueue.firstCapturedUpdate
      finishedQueue.lastUpdate = finishedQueue.lastCapturedUpdate
    }
    finishedQueue.firstCapturedUpdate = finishedQueue.lastCapturedUpdate = null
  }

  commitUpdateEffects(finishedQueue.firstEffect, instance)
  finishedQueue.firstEffect = finishedQueue.lastEffect = null

  commitUpdateEffects(finishedQueue.firstCapturedEffect, instance)
  finishedQueue.firstCapturedEffect = finishedQueue.lastCapturedEffect = null
}

function commitUpdateEffects<State>(effect: Update<State>, instance: any) {
  while (effect !== null) {
    const { callback } = effect
    if (callback !== null) {
      effect.callback = null
      callback.call(instance)
    }
    effect = effect.nextEffect
  }
}






