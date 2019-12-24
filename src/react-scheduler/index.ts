import { getBrowserEventEmitterisEnabled, setBrowserEventEmitterisEnabled } from '../event/dom/dom-event-listener'
import { resetContextDependences } from '../react-context/fiber-context'
import { Container } from '../react-dom/dom/dom-component'
import {
  computeAsyncExpiration,
  computeInteractiveExpiration,
  ExpirationTime,
  expirationTimeToMS,
  msToExpirationTime,
  Never,
  NoWork,
  Sync,
} from '../react-fiber/expiration-time'
import { createWorkInProgress, Fiber } from '../react-fiber/fiber'
import { Batch, FiberRoot } from '../react-fiber/fiber-root'
import { HooksDispatcherOnEmpty, resetHooks } from '../react-hook/fiber-hook'
import ReactCurrentDispatcher from '../react-hook/rect-current-dispatcher'
import {
  Callback,
  ContentReset,
  Deletion,
  HostEffectMask,
  Incomplete,
  NoEffect,
  Passive,
  PerformedWork,
  Placement,
  PlacementAndUpdate,
  Ref,
  SideEffectTag,
  Snapshot,
  Update,
} from '../react-type/effect-type'
import { HostRoot } from '../react-type/tag-type'
import { ConcurrentMode } from '../react-type/work-type'
import { beginWork } from '../react-work/begin-work'
import {
  commitAttachRef,
  commitBeforeMutationLifecycle,
  commitDeletion,
  commitDetachRef,
  commitLifeCycles,
  commitPassiveHookEffects,
  commitPlacement,
  commitResetTextContent,
  commitWork,
} from '../react-work/commit-work'
import { completeWork } from '../react-work/complete-work'
import { throwException, unwindInterruptedWork, unwindWork } from '../react-work/unwind-work'
import { clearTimeout, noTimeout, now } from '../utils/browser'
import { CallbackNode, cancelDeferredCallback, scheduleDeferredCallback, shouldYield } from './defer-scheduler'
import { didExpireAtExpirationTime, markCommittedPriorityLevels, markPendingPriorityLevel } from './pending-priority'

const NESTED_UPDATE_LIMIT: number = 50
let nestedUpdateCount: number = 0
let lastCommittedRootDuringThisBatch: FiberRoot = null

let callbackExpirationTime: ExpirationTime = NoWork // 异步记录时间
let callbackID: CallbackNode // 异步回调对象

let isRendering: boolean = false
let isWorking: boolean = false
let isCommitting: boolean = false

const originalStartTimeMs: number = now()

let currentRendererTime: ExpirationTime = msToExpirationTime(originalStartTimeMs)
let currentSchedulerTime: ExpirationTime = currentRendererTime

const expirationContext: ExpirationTime = NoWork

let isBatchingUpdates: boolean = false // 批量更新的 flag
let isUnbatchingUpdates: boolean = false // 关闭批量更新的 flag
let isBatchingInteractiveUpdates: boolean = false

let completedBatches: Batch[] = null

function recomputeCurrentRendererTime(canUpdateSchedulerTime: boolean) {
  const currentTimeMs: number = now() - originalStartTimeMs
  currentRendererTime = msToExpirationTime(currentTimeMs)

  if (canUpdateSchedulerTime) {
    currentSchedulerTime = currentRendererTime
  }
}

// 一条需要调度的 FiberRoot 队列
let firstScheduledRoot: FiberRoot = null
let lastScheduledRoot: FiberRoot = null

let nextFlushedRoot: FiberRoot = null // 当前需要调和的 FiberRoot
let nextFlushedExpirationTime: ExpirationTime = NoWork // 全局过期时间
let lowestPriorityPendingInteractiveExpirationTime: ExpirationTime = NoWork

let hasUnhandledError: boolean = false
let unhandledError: any = null

// render阶段的三个指针
let nextRoot: FiberRoot = null
let nextUnitOfWork: Fiber = null
let nextRenderExpirationTime: ExpirationTime = NoWork

let nextLatestAbsoluteTimeoutMs: number = -1
let nextRenderDidError: boolean = false

let nextEffect: Fiber = null

let rootWithPendingPassiveEffects: FiberRoot = null
let passiveEffectCallbackHandle: any = null
let passiveEffectCallback: any = null

let eventsEnabled: boolean = false

let legacyErrorBoundariesThatAlreadyFailed: Set<any> = null

function resetStack() {
  if (nextUnitOfWork !== null) {
    let interruptedWork: Fiber = nextUnitOfWork.return
    while (interruptedWork !== null) {
      unwindInterruptedWork(interruptedWork)
      interruptedWork = interruptedWork.return
    }
  }

  nextRoot = null
  nextUnitOfWork = null
  nextRenderExpirationTime = NoWork
  nextLatestAbsoluteTimeoutMs = -1
  nextRenderDidError = false
}

function unbatchedUpdates(fn: Function, a?: any): Function {
  if (isBatchingUpdates && !isUnbatchingUpdates) {
    isUnbatchingUpdates = true
    try {
      return fn(a)
    } finally {
      isUnbatchingUpdates = false
    }
  }
  return fn(a)
}

function onUncaughtError(error: any) {
  nextFlushedRoot.expirationTime = NoWork
  if (!hasUnhandledError) {
    hasUnhandledError = true
    unhandledError = error
  }
}

function batchedUpdates<A, R>(fn: (a: A) => R, a: A): R {
  const previousIsBatchingUpdates = isBatchingUpdates
  isBatchingUpdates = true

  try {
    return fn(a)
  } finally {
    isBatchingUpdates = previousIsBatchingUpdates
    if (!isBatchingUpdates && !isRendering) {
      performSyncWork()
    }
  }
}

function interactiveUpdates<A, B, R>(fn: (a: A, b: B) => R, a: A, b: B): R {
  if (isBatchingInteractiveUpdates) {
    return fn(a, b)
  }

  if (!isBatchingUpdates && !isRendering && lowestPriorityPendingInteractiveExpirationTime !== NoWork) {
    performWork(lowestPriorityPendingInteractiveExpirationTime, false)
    lowestPriorityPendingInteractiveExpirationTime = NoWork
  }

  const previousIsBatchingInteractiveUpdates = isBatchingInteractiveUpdates
  const previousIsBatchingUpdates = isBatchingUpdates
  isBatchingInteractiveUpdates = true
  isBatchingUpdates = true

  try {
    return fn(a, b)
  } finally {
    isBatchingInteractiveUpdates = previousIsBatchingInteractiveUpdates
    isBatchingUpdates = previousIsBatchingUpdates
    if (!isBatchingUpdates && !isRendering) {
      performSyncWork()
    }
  }
}

function flushInteractiveUpdates() {
  if (!isRendering && lowestPriorityPendingInteractiveExpirationTime !== NoWork) {
    performWork(lowestPriorityPendingInteractiveExpirationTime, false)
    lowestPriorityPendingInteractiveExpirationTime = NoWork
  }
}

function flushPassiveEffects() {
  if (passiveEffectCallbackHandle !== null) {
    cancelDeferredCallback(passiveEffectCallbackHandle)
  }
  if (passiveEffectCallback !== null) {
    passiveEffectCallback()
  }
}

function computeExpirationTimeForFiber(currentTime: ExpirationTime, fiber: Fiber): ExpirationTime {
  let expirationTime: ExpirationTime = NoWork

  if (expirationContext !== NoWork) {
    expirationTime = expirationContext
  } else if (isWorking) {
    expirationTime = isCommitting ? Sync : nextRenderExpirationTime
  } else {
    // 判断是否开启异步模式
    if (fiber.mode === ConcurrentMode) {
      // 是否是 Interactive 优先级
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

// 更新当前节点的 childExpirationTime
function updateChildExpirationTime(workInProgress: Fiber, renderTime: ExpirationTime) {
  if (renderTime !== Never && workInProgress.childExpirationTime === Never) { // 子节点hidden的，直接跳过
    return
  }
  let newChildExpiration: ExpirationTime = NoWork
  let child: Fiber = workInProgress.child

  while (child !== null) {
    const childUpdateExpirationTime = child.expirationTime
    const childChildExpirationTime = child.childExpirationTime

    if (childUpdateExpirationTime > newChildExpiration) {
      newChildExpiration = childUpdateExpirationTime
    }

    if (childChildExpirationTime > newChildExpiration) {
      newChildExpiration = childChildExpirationTime
    }
    child = child.sibling
  }
  workInProgress.childExpirationTime = newChildExpiration
}

// 遍历 scheduleRoot 队列，清除掉已经完成调和的FiberRoot，找出当前优先级最高的 FiberRoot
function findHighestPriorityRoot() {
  let highestPriorityWork: ExpirationTime = NoWork
  let highestPriorityRoot: FiberRoot = null

  if (lastScheduledRoot !== null) {
    let previousScheduledRoot: FiberRoot = lastScheduledRoot
    let root: FiberRoot = firstScheduledRoot

    // 遍历出一条需要scheduled的fiber-root链表
    while (root !== null) {
      const remainingExpirationTime: ExpirationTime = root.expirationTime

      // 清除掉已经完成调和的 FiberRoot
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
  }
  nextFlushedRoot = highestPriorityRoot
  nextFlushedExpirationTime = highestPriorityWork
}

function requestCurrentTime(): ExpirationTime {
  if (isRendering) {
    return currentSchedulerTime
  }

  findHighestPriorityRoot()

  if (nextFlushedExpirationTime === NoWork || nextFlushedExpirationTime === Never) {
    recomputeCurrentRendererTime(true)
    return currentSchedulerTime
  }

  return currentSchedulerTime
}

// 更新当前 Fiber的 expirationTime
// 从当前往上遍历，找到 FiberRoot
// 每个遍历过的 Fiber 都更新其 childExpirationTime
function scheduleWorkToRoot(fiber: Fiber, expirationTime: ExpirationTime): FiberRoot {
  let alternate: Fiber = fiber.alternate

  // 更新自身及副本的优先级
  if (fiber.expirationTime < expirationTime) {
    fiber.expirationTime = expirationTime
  }
  if (alternate !== null && alternate.expirationTime < expirationTime) {
    alternate.expirationTime = expirationTime
  }

  let node: Fiber = fiber.return
  let root: FiberRoot = null

  if (node === null && fiber.tag === HostRoot) {
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

      if (node.return === null && node.tag === HostRoot) {
        root = node.stateNode
        break
      }

      node = node.return
    }
  }
  return root
}

function scheduleWork(fiber: Fiber, expirationTime: ExpirationTime) {
  const root: FiberRoot = scheduleWorkToRoot(fiber, expirationTime)

  if (!isWorking && nextRenderExpirationTime !== NoWork && expirationTime > nextRenderExpirationTime) {
    resetStack()
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
      nextFlushedExpirationTime = Sync
      performWorkOnRoot(root, Sync, false)
    }
    return
  }

  if (expirationTime === Sync) {
    performSyncWork() // 同步
  } else {
    scheduleCallbackWithExpirationTime(expirationTime) // 异步
  }
}

// 将当前 FiberRoot 加到 scheduleRoot 队列中
// 如果已在队列中，更新 expirationTime
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

function scheduleCallbackWithExpirationTime(expirationTime: ExpirationTime) {
  if (callbackExpirationTime !== NoWork) {
    if (expirationTime < callbackExpirationTime) {
      return
    } else if (callbackID !== null) {
      cancelDeferredCallback(callbackID)
    }
  }

  callbackExpirationTime = expirationTime
  const currentMs = now() - originalStartTimeMs
  const expirationTimeMs = expirationTimeToMS(expirationTime)
  const timeout = expirationTimeMs - currentMs
  callbackID = scheduleDeferredCallback(performAsyncWork, { timeout })
}

function performAsyncWork(didTimeout: boolean) {
  if (didTimeout) {
    // 当前已超时，更新过期时间小于当前优先级的 FiberRoot
    if (firstScheduledRoot !== null) {
      recomputeCurrentRendererTime(false)

      let root: FiberRoot = firstScheduledRoot
      do {
        didExpireAtExpirationTime(root, currentRendererTime)
        root = root.nextScheduledRoot
      } while (root !== firstScheduledRoot)
    }
  }
  performWork(NoWork, true)
}

/**
 * @param minExpirationTime 超时优先级
 * @param isYieldy 是否异步
 */
function performWork(minExpirationTime: ExpirationTime, isYieldy: boolean) {
  findHighestPriorityRoot()

  if (isYieldy) {
    recomputeCurrentRendererTime(true)

    while (
      nextFlushedRoot !== null
      && nextFlushedExpirationTime !== NoWork
      && minExpirationTime <= nextFlushedExpirationTime
      && (currentRendererTime <= nextFlushedExpirationTime || !shouldYield())
    ) {
      // 当前任务已经超时，就改为同步
      performWorkOnRoot(nextFlushedRoot, nextFlushedExpirationTime, currentRendererTime > nextFlushedExpirationTime)
      findHighestPriorityRoot()
      recomputeCurrentRendererTime(true)
    }
  } else {
    while (
      nextFlushedRoot !== null
      && nextFlushedExpirationTime !== NoWork
      && minExpirationTime <= nextFlushedExpirationTime
    ) {
      performWorkOnRoot(nextFlushedRoot, nextFlushedExpirationTime, false)
      findHighestPriorityRoot()
    }
  }

  // 清除异步标识
  if (isYieldy) {
    callbackExpirationTime = NoWork
    callbackID = null
  }

  if (nextFlushedExpirationTime !== NoWork) {
    scheduleCallbackWithExpirationTime(nextFlushedExpirationTime)
  }

  finishRendering()
}

function finishRendering() {
  nestedUpdateCount = 0
  lastCommittedRootDuringThisBatch = null

  if (completedBatches !== null) {
    const batches = completedBatches
    completedBatches = null

    batches.forEach((batch) => {
      try {
        batch._onComplete()
      } catch (error) {
        console.error(error)
        if (!hasUnhandledError) {
          hasUnhandledError = true
          unhandledError = error
        }
      }
    })
  }

  if (hasUnhandledError) {
    const error = unhandledError
    unhandledError = null
    hasUnhandledError = false
    throw error
  }
}

function performWorkOnRoot(root: FiberRoot, expirationTime: ExpirationTime, isYieldy: boolean) {
  isRendering = true

  let finishedWork: Fiber = root.finishedWork

  if (finishedWork !== null) {
    completeRoot(root, finishedWork, expirationTime)
  } else {
    root.finishedWork = null

    const { timeoutHandle } = root
    if (timeoutHandle !== noTimeout) {
      root.timeoutHandle = noTimeout
      clearTimeout(timeoutHandle)
    }

    renderRoot(root, isYieldy)
    finishedWork = root.finishedWork

    if (finishedWork !== null) {
      if (isYieldy) {
        if (!shouldYield()) {
          completeRoot(root, finishedWork, expirationTime)
        } else {
          root.finishedWork = finishedWork
        }
      } else {
        completeRoot(root, finishedWork, expirationTime)
      }
    }
  }

  isRendering = false
}

function completeRoot(root: FiberRoot, finishedWork: Fiber, expirationTime: ExpirationTime) {
  const { firstBatch } = root
  if (firstBatch !== null && firstBatch._expirationTime >= expirationTime) {
    if (completedBatches === null) {
      completedBatches = [firstBatch]
    } else {
      completedBatches.push(firstBatch)
    }
    if (firstBatch._defer) {
      root.finishedWork = finishedWork
      root.expirationTime = NoWork
      return
    }
  }

  root.finishedWork = null

  if (root === lastCommittedRootDuringThisBatch) {
    nestedUpdateCount++
  } else {
    lastCommittedRootDuringThisBatch = root
    nestedUpdateCount = 0
  }

  commitRoot(root, finishedWork)
}

function prepareForCommit(_containerInfo: Container) {
  eventsEnabled = getBrowserEventEmitterisEnabled()
  // 重新设置焦点，先忽略
  setBrowserEventEmitterisEnabled(false)
}

function resetAfterCommit(_containerInfo: Container) {
  setBrowserEventEmitterisEnabled(eventsEnabled)
  eventsEnabled = false
}

function commitTask(task: Function, firstEffect: Fiber) {
  nextEffect = firstEffect

  while (nextEffect !== null) {
    let didError = false
    let error: Error

    try {
      while (nextEffect !== null) {
        task(nextEffect.effectTag)
        nextEffect = nextEffect.nextEffect
      }
    } catch (e) {
      didError = true
      error = e
      console.error(error)
    }
    if (didError) {
      // captureCommitPhaseError(nextEffect, error)

      if (nextEffect !== null) {
        nextEffect = nextEffect.nextEffect
      }
    }
  }
}

function commitRoot(root: FiberRoot, finishedWork: Fiber) {
  isWorking = true
  isCommitting = true

  root.pendingCommitExpirationTime = NoWork

  const earliestRemainingTimeBeforeCommit = finishedWork.expirationTime > finishedWork.childExpirationTime ? finishedWork.expirationTime : finishedWork.childExpirationTime

  // 更新 FiberRoot 优先级
  markCommittedPriorityLevels(root, earliestRemainingTimeBeforeCommit)

  // 找到遍历 effect 链表的入口
  let firstEffect: Fiber = null
  if (finishedWork.effectTag > PerformedWork) {
    if (finishedWork.lastEffect !== null) {
      finishedWork.lastEffect.nextEffect = finishedWork
      firstEffect = finishedWork.firstEffect
    } else {
      firstEffect = finishedWork
    }
  } else {
    firstEffect = finishedWork.firstEffect
  }

  prepareForCommit(root.containerInfo)

  commitTask(commitBeforeMutationLifecycles, firstEffect)

  // 第一阶段，提交 dom 的操作
  commitTask(commitAllHostEffects, firstEffect)
  resetAfterCommit(root.containerInfo)

  // 第二阶段，调用生命周期，ref
  root.current = finishedWork
  commitTask(commitAllLifeCycles.bind(null, root), firstEffect)

  // useEffect 放到下一个 event loop 调用
  if (firstEffect !== null && rootWithPendingPassiveEffects !== null) {
    const callback = commitPassiveEffects.bind(null, root, firstEffect)
    passiveEffectCallbackHandle = scheduleDeferredCallback(callback)
    passiveEffectCallback = callback
  }

  isCommitting = false
  isWorking = false

  // 更新优先级
  const earliestRemainingTimeAfterCommit = finishedWork.expirationTime > finishedWork.childExpirationTime ? finishedWork.expirationTime : finishedWork.childExpirationTime

  if (earliestRemainingTimeAfterCommit === NoWork) {
    legacyErrorBoundariesThatAlreadyFailed = null
  }

  root.expirationTime = earliestRemainingTimeAfterCommit
  root.finishedWork = null
}

function commitPassiveEffects(root: FiberRoot, firstEffect: Fiber) {
  rootWithPendingPassiveEffects = null
  passiveEffectCallbackHandle = null
  passiveEffectCallback = null

  const previousIsRendering = isRendering
  isRendering = true

  let effect = firstEffect
  do {
    if (effect.effectTag & Passive) {
      let didError: boolean = false
      let error: Error

      try {
        commitPassiveHookEffects(effect)
      } catch (e) {
        didError = true
        error = e
        console.error(error)
      }

      if (didError) {
        // captureCommitPhaseError(effect, error)
      }
    }

    effect = effect.nextEffect
  } while (effect !== null)

  isRendering = previousIsRendering

  const rootExpirationTime = root.expirationTime
  if (rootExpirationTime !== NoWork) {
    requestWork(root, rootExpirationTime)
  }

  if (!isBatchingUpdates && !isRendering) {
    performSyncWork()
  }
}

function commitAllLifeCycles(finishedRoot: FiberRoot, effectTag: SideEffectTag) {
  if (effectTag & (Update | Callback)) {
    const current = nextEffect.alternate
    commitLifeCycles(current, nextEffect)
  }

  if (effectTag & Ref) {
    commitAttachRef(nextEffect)
  }

  if (effectTag & Passive) {
    rootWithPendingPassiveEffects = finishedRoot
  }
}

function commitAllHostEffects(effectTag: SideEffectTag) {
  if (effectTag & ContentReset) {
    commitResetTextContent(nextEffect)
  }

  // ref 引用的还是老的实例，所以有 ref 的先删除老的
  if (effectTag & Ref) {
    const current = nextEffect.alternate
    if (current !== null) {
      commitDetachRef(nextEffect)
    }
  }

  const primaryEffectTag = effectTag & (Placement | Update | Deletion)
  switch (primaryEffectTag) {
    case Placement: {
      commitPlacement(nextEffect)
      nextEffect.effectTag &= ~Placement // 清除placemenet
      break
    }
    case PlacementAndUpdate: {
      commitPlacement(nextEffect)
      nextEffect.effectTag &= ~Placement

      commitWork(nextEffect.alternate, nextEffect)
      break
    }
    case Update: {
      commitWork(nextEffect.alternate, nextEffect)
      break
    }
    case Deletion: {
      commitDeletion(nextEffect)
      break
    }
  }
}

function commitBeforeMutationLifecycles(effectTag: SideEffectTag) {
  if (effectTag & Snapshot) {
    const current = nextEffect.alternate
    commitBeforeMutationLifecycle(current, nextEffect)
  }
}

function renderRoot(root: FiberRoot, isYieldy: boolean) {
  // useEffect的调用
  flushPassiveEffects()

  isWorking = true

  // 清空对 hook 的引用
  const previousDispatcher = ReactCurrentDispatcher.current
  ReactCurrentDispatcher.current = HooksDispatcherOnEmpty

  const expirationTime = root.nextExpirationTimeToWorkOn

  // 上一个任务因为时间片用完了而中断了，这个时候 nextUnitOfWork 是有工作的
  // 到了下一个时间切片，中途没有新的任务进来，那么这些全局变量都没有变过
  // 而如果有新的更新进来，则势必 nextExpirationTimeToWorkOn 或者 root 会变化，那么肯定需要重置变量
  if (expirationTime !== nextRenderExpirationTime || root !== nextRoot || nextUnitOfWork === null) {
    resetStack()

    nextRoot = root
    nextRenderExpirationTime = expirationTime
    nextUnitOfWork = createWorkInProgress(nextRoot.current, null)
    root.pendingCommitExpirationTime = NoWork
  }

  let didFatal: boolean = false

  do {
    try {
      workLoop(isYieldy)
    } catch (thrownValue) {
      console.error(thrownValue)

      resetContextDependences()
      resetHooks()

      if (nextUnitOfWork === null) {
        // 不可预期的错误
        didFatal = true
        onUncaughtError(thrownValue)
      } else {
        const sourceFiber = nextUnitOfWork
        const returnFiber = sourceFiber.return

        if (returnFiber === null) {
          didFatal = true
          onUncaughtError(thrownValue)
        } else {
          throwException(root, returnFiber, sourceFiber, thrownValue, nextRenderExpirationTime) // 错误处理，没完成
          nextUnitOfWork = completeUnitOfWork(sourceFiber)
          continue
        }
      }
    }
    break
  } while (true)

  isWorking = false
  ReactCurrentDispatcher.current = previousDispatcher
  resetContextDependences()
  resetHooks()

  if (didFatal) {
    nextRoot = null
    root.finishedWork = null
    return
  }

  if (nextUnitOfWork !== null) {
    root.finishedWork = null
    return
  }

  nextRoot = null

  if (nextRenderDidError) {
    // 错误处理
  }

  root.pendingCommitExpirationTime = expirationTime
  root.finishedWork = root.current.alternate
}

function workLoop(isYieldy: boolean) {
  if (isYieldy) {
    while (nextUnitOfWork !== null && !shouldYield()) {
      nextUnitOfWork = performUnitOfWork(nextUnitOfWork)
    }
  } else {
    while (nextUnitOfWork !== null) {
      nextUnitOfWork = performUnitOfWork(nextUnitOfWork)
    }
  }
}

function performUnitOfWork(workInProgress: Fiber): Fiber {
  const current = workInProgress.alternate

  let next: Fiber = null

  // 返回它的子节点
  next = beginWork(current, workInProgress, nextRenderExpirationTime)
  workInProgress.memoizedProps = workInProgress.pendingProps

  if (next === null) {
    // 返回它的兄弟节点
    next = completeUnitOfWork(workInProgress)
  }

  return next
}

function completeUnitOfWork(workInProgress: Fiber): Fiber {
  while (true) {
    const current = workInProgress.alternate
    const returnFiber = workInProgress.return
    const siblingFiber = workInProgress.sibling

    if ((workInProgress.effectTag & Incomplete) === NoEffect) {
      nextUnitOfWork = completeWork(current, workInProgress)
      updateChildExpirationTime(workInProgress, nextRenderExpirationTime)

      if (nextUnitOfWork !== null) {
        return nextUnitOfWork
      }

      // 将需要 commit 的 fiber 集成链表放在当前 fiber 的 firstEffect 上
      if (returnFiber !== null && (returnFiber.effectTag & Incomplete) === NoEffect) {
        if (returnFiber.firstEffect === null) {
          returnFiber.firstEffect = workInProgress.firstEffect
        }

        if (workInProgress.lastEffect !== null) {
          if (returnFiber.lastEffect !== null) {
            returnFiber.lastEffect.nextEffect = workInProgress.firstEffect
          }
          returnFiber.lastEffect = workInProgress.lastEffect
        }

        const { effectTag } = workInProgress
        if (effectTag > PerformedWork) {
          if (returnFiber.lastEffect !== null) {
            returnFiber.lastEffect.nextEffect = workInProgress
          } else {
            returnFiber.firstEffect = workInProgress
          }
          returnFiber.lastEffect = workInProgress
        }
      }
    } else {
      const next = unwindWork(workInProgress, nextRenderExpirationTime)

      if (next !== null) {
        next.effectTag &= HostEffectMask
        return next
      }

      if (returnFiber !== null) {
        returnFiber.firstEffect = returnFiber.lastEffect = null
        returnFiber.effectTag |= Incomplete
      }
    }

    if (siblingFiber !== null) {
      return siblingFiber
    } else if (returnFiber !== null) {
      workInProgress = returnFiber
      continue
    } else {
      return null
    }
  }
}

export {
  unbatchedUpdates,
  batchedUpdates,
  interactiveUpdates,
  flushInteractiveUpdates,
  computeExpirationTimeForFiber,
  requestCurrentTime,
  scheduleWork,
  flushPassiveEffects,
}
