import {
  computeAsyncExpiration, computeInteractiveExpiration, ExpirationTime, msToExpirationTime, Never, NoWork, Sync,
} from '../react-fiber/expiration-time'
import { createWorkInProgress, Fiber } from '../react-fiber/fiber'
import { FiberRoot } from '../react-fiber/fiber-root'
import { HostRoot } from '../react-type/tag-type'
import { ConcurrentMode, ProfileMode } from '../react-type/work-type'
import { beginWork } from '../react-work/begin-work'
import { clearTimeout, noTimeout, now } from '../utils/browser'
import { markPendingPriorityLevel } from './pending-priority'

const NESTED_UPDATE_LIMIT: number = 50
let nestedUpdateCount: number = 0
const lastCommittedRootDuringThisBatch: FiberRoot = null

let isRendering: boolean = false
let isWorking: boolean = false
const isCommitting: boolean = false

const originalStartTimeMs: number = now()

let currentRendererTime: ExpirationTime = msToExpirationTime(originalStartTimeMs)
let currentSchedulerTime: ExpirationTime = currentRendererTime

let nextRenderExpirationTime: ExpirationTime = NoWork

const expirationContext: ExpirationTime = NoWork

const isBatchingUpdates: boolean = false
const isUnbatchingUpdates: boolean = false
const isBatchingInteractiveUpdates: boolean = false

function recomputeCurrentRendererTime() {
  const currentTimeMs: number = now() - originalStartTimeMs
  currentRendererTime = msToExpirationTime(currentTimeMs)
}

let firstScheduledRoot: FiberRoot = null
let lastScheduledRoot: FiberRoot = null

let nextFlushedRoot: FiberRoot = null
let nextFlushedExpirationTime: ExpirationTime = NoWork

let lowestPriorityPendingInteractiveExpirationTime: ExpirationTime = NoWork

let nextUnitOfWork: Fiber = null
let nextRoot: FiberRoot = null
let interruptedBy: Fiber = null

function computeExpirationTimeForFiber(currentTime: ExpirationTime, fiber: Fiber): ExpirationTime {
  let expirationTime: ExpirationTime

  if (expirationContext !== NoWork) {
    expirationTime = expirationContext
  } else if (isWorking) {
    expirationTime = isCommitting ? Sync : nextRenderExpirationTime
  } else {
    if (fiber.mode === ConcurrentMode) {
      if (isBatchingInteractiveUpdates) {
        expirationTime = computeInteractiveExpiration(currentTime)
      } else {
        expirationTime = computeAsyncExpiration(currentTime)
      }

      if (nextRoot !== null && expirationTime === nextRenderExpirationTime) {
        expirationTime -= 1
      }
    } else {
      expirationTime = Sync
    }
  }

  if (isBatchingInteractiveUpdates) {
    if (lowestPriorityPendingInteractiveExpirationTime === NoWork
      || expirationTime < lowestPriorityPendingInteractiveExpirationTime) {
      lowestPriorityPendingInteractiveExpirationTime = expirationTime
    }
  }

  return expirationTime
}

function findHighestPriorityRoot() {
  let highestPriorityWork: ExpirationTime = NoWork
  let highestPriorityRoot: FiberRoot = null

  if (lastScheduledRoot !== null) {
    let previousScheduledRoot: FiberRoot = lastScheduledRoot
    let root: FiberRoot = firstScheduledRoot

    // 遍历出一条需要scheduled的fiber-root链表
    while (root !== null) {
      const remainingExpirationTime: ExpirationTime = root.expirationTime

      if (remainingExpirationTime === NoWork) {
        if (root === root.nextScheduledRoot) { // 整个链表只有一个fiber root
          root.nextScheduledRoot = null
          firstScheduledRoot = lastScheduledRoot = null
          break

        } else if (root === firstScheduledRoot) {
          const next = root.nextScheduledRoot
          firstScheduledRoot = next
          lastScheduledRoot.nextScheduledRoot = next
          root.nextScheduledRoot = null

        } else if (root === lastScheduledRoot) {
          lastScheduledRoot = previousScheduledRoot
          lastScheduledRoot.nextScheduledRoot = firstScheduledRoot
          root.nextScheduledRoot = null
          break

        } else {
          previousScheduledRoot.nextScheduledRoot = root.nextScheduledRoot
          root.nextScheduledRoot = null
        }

        root = previousScheduledRoot.nextScheduledRoot
      } else {
        if (remainingExpirationTime > highestPriorityWork) {
          highestPriorityWork = remainingExpirationTime
          highestPriorityRoot = root
        }

        if (root === lastScheduledRoot) {
          break
        }

        if (highestPriorityWork === Sync) {
          break // sync是最高级，直接退出
        }

        previousScheduledRoot = root
        root = root.nextScheduledRoot
      }
    }

    nextFlushedRoot = highestPriorityRoot
    nextFlushedExpirationTime = highestPriorityWork
  }
}

function requestCurrentTime(): ExpirationTime {
  if (isRendering) {
    return currentSchedulerTime
  }

  findHighestPriorityRoot()

  if (nextFlushedExpirationTime === NoWork || nextFlushedExpirationTime === Never) {
    recomputeCurrentRendererTime()
    currentSchedulerTime = currentRendererTime
    return currentSchedulerTime
  }

  return currentSchedulerTime
}

function scheduleWorkToRoot(fiber: Fiber, expirationTime: ExpirationTime): FiberRoot | null {
  let { alternate }: { alternate: Fiber } = fiber

  if (fiber.expirationTime < expirationTime) {
    fiber.expirationTime = expirationTime
  }

  if (alternate !== null && alternate.expirationTime < expirationTime) {
    alternate.expirationTime = expirationTime
  }

  let node: Fiber = fiber.return
  let root: FiberRoot = null

  if (node === null && node.tag === HostRoot) {
    root = fiber.stateNode
  } else {
    while (node !== null) {
      ({ alternate } = node)

      if (node.childExpirationTime < expirationTime) {
        node.childExpirationTime = expirationTime
      }

      if (alternate !== null && alternate.childExpirationTime < expirationTime) {
        alternate.childExpirationTime = expirationTime
      }

      if (node === null && node.tag === HostRoot) {
        root = fiber.stateNode
        break
      }

      node = node.return
    }
  }
  return root
}


function scheduleWork(fiber: Fiber, expirationTime: ExpirationTime) {
  const root = scheduleWorkToRoot(fiber, expirationTime)

  if (!isWorking && nextRenderExpirationTime !== NoWork && expirationTime > nextRenderExpirationTime) {
    interruptedBy = fiber
    resetStack() // 待实现
  }

  markPendingPriorityLevel(root, expirationTime)

  if (!isWorking || isCommitting || nextRoot !== root) {
    const rootExpirationTime = root.expirationTime
    requestWork(root, rootExpirationTime)
  }

  if (nestedUpdateCount > NESTED_UPDATE_LIMIT) {
    nestedUpdateCount = 0
  }
}

function requestWork(root: FiberRoot, expirationTime: ExpirationTime) {
  addRootToSchedule(root, expirationTime)
  if (isRendering) {
    return
  }

  if (isBatchingUpdates) {
    if (isUnbatchingUpdates) {
      nextFlushedRoot = root
      nextFlushedExpirationTime = expirationTime
    }
    return
  }

  if (expirationTime === Sync) {
    performSyncWork() // 同步
  } else {
    scheduleCallbackWithExpirationTime(root, expirationTime) // 异步，待实现
  }
}

function addRootToSchedule(root: FiberRoot, expirationTime: ExpirationTime) {
  if (root.nextScheduledRoot === null) {
    root.expirationTime = expirationTime

    if (lastScheduledRoot === null) {
      firstScheduledRoot = lastScheduledRoot = root
      root.nextScheduledRoot = root
    } else {
      lastScheduledRoot.nextScheduledRoot = root
      lastScheduledRoot = root
      root.nextScheduledRoot = firstScheduledRoot
    }
  } else {
    const remainingExpirationTime = root.expirationTime
    if (expirationTime > remainingExpirationTime) {
      root.expirationTime = expirationTime
    }
  }
}

function performSyncWork() {
  performWork(Sync, false)
}

/**
 * @param isYieldy 是否可以中断
 */
function performWork(minExpirationTime: ExpirationTime, isYieldy: boolean) {
  findHighestPriorityRoot()

  if (isYieldy) {
    // 异步,待实现
  } else { // 同步
    while (nextFlushedRoot !== null && nextFlushedExpirationTime && minExpirationTime <= nextFlushedExpirationTime) {
      performWorkOnRoot(nextFlushedRoot, nextFlushedExpirationTime, false)
      findHighestPriorityRoot()
    }
  }
}

function performWorkOnRoot(root: FiberRoot, expirationTime: ExpirationTime, isYieldy: boolean) {
  isRendering = true

  if (isYieldy) {
    // 异步，待实现
  } else { // 同步
    let { finishedWork }: { finishedWork: Fiber } = root

    if (finishedWork !== null) {
      completeRoot(root, finishedWork, expirationTime)
    } else {
      const { timeoutHandle } = root
      if (timeoutHandle !== noTimeout) {
        root.timeoutHandle = noTimeout
        clearTimeout(timeoutHandle)
      }

      renderRoot(root, isYieldy)
      finishedWork = root.finishedWork

      if (finishedWork !== null) {
        completeRoot(root, finishedWork, expirationTime)
      }
    }
  }
}

function renderRoot(root: FiberRoot, isYieldy: boolean) {
  // flushPassiveEffects() // 事件相关待实现

  isWorking = true
  //  const previousDispatcher = ReactCurrentDispatcher.current
  // ReactCurrentDispatcher.current = ContextOnlyDispatcher

  const expirationTime = root.nextExpirationTimeToWorkOn

  if (expirationTime !== nextRenderExpirationTime || root !== nextRoot || nextUnitOfWork === null) {
    resetStack()

    nextRoot = root
    nextRenderExpirationTime = expirationTime
    nextUnitOfWork = createWorkInProgress(nextRoot.current, null)
    root.pendingCommitExpirationTime = NoWork
  }

  const didFatal: boolean = false

  do {
    try {
      workLoop(isYieldy)
    } catch (thrownValue) {
      // 待实现
    }
    break
  } while (true)

  isWorking = false
  // ReactCurrentDispatcher.current = previousDispatcher
  resetContextDependences() // 待实现
  resetHooks() // 待实现

  if (didFatal) {
    // 待实现
    return
  }
}

function workLoop(isYieldy: boolean) {
  if (isYieldy) {
    // 异步
  } else {
    while (nextUnitOfWork !== null) {
      nextUnitOfWork = performUnitOfWork(nextUnitOfWork)
    }
  }
}

function performUnitOfWork(workInProgress: Fiber): Fiber {
  const current = workInProgress.alternate

  // startWorkTimer(workInProgress) // debug用，待实现

  let next: Fiber = null

  if (workInProgress.mode === ProfileMode) {
    // startProfilerTimer(workInProgress) // 待实现
  }

  next = beginWork(current, workInProgress, nextRenderExpirationTime)
  workInProgress.memoizedProps = workInProgress.pendingProps

  if (workInProgress.mode === ProfileMode) {
    // stopProfilerTimerIfRunningAndRecordDelta(workInProgress, true) // 待实现
  }

  if (next === null) {
    next = completeUnitOfWork(workInProgress)
  }

  // ReactCurrentOwner.current = null
  return next
}

export {
  computeExpirationTimeForFiber,
  requestCurrentTime,
  scheduleWork,
}
