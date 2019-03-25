import { ExpirationTime, NoWork } from '../react-fiber/expiration-time'
import { Fiber } from '../react-fiber/fiber'
import { Callback } from '../react-type/effect-type'
import Update, { getStateFromUpdate } from './update'

let hasForceUpdate: boolean = false

export function changeHasForceUpdate(flag) {
  hasForceUpdate = flag
}

export class UpdateQueue<State> {
  baseState: State

  firstUpdate: Update<State> = null
  lastUpdate: Update<State> = null

  firstCapturedUpdate: Update<State> = null
  lastCapturedUpdate: Update<State> = null

  firstEffect: Update<State> = null
  lastEffect: Update<State> = null

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
    if (updateExpirationTime < renderExpirationTime) {
      if (newFirstUpdate === null) {
        newFirstUpdate = update
        newBaseState = resultState
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
          queue.lastEffect = update
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






