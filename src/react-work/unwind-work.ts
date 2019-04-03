import { popHostContainer, popHostContext } from '../react-context/host-context'
import { ExpirationTime } from '../react-fiber/expiration-time'
import { Fiber } from '../react-fiber/fiber'
import { FiberRoot } from '../react-fiber/fiber-root'
import { DidCapture, Incomplete, ShouldCapture } from '../react-type/effect-type'
import { ClassComponent, ContextProvider, DehydratedSuspenseComponent, HostComponent, HostPortal, HostRoot, SuspenseComponent } from '../react-type/tag-type'

function throwException(root: FiberRoot, returnFiber: Fiber, sourceFiber: Fiber, value: any, renderExpirationTime: ExpirationTime) {
  sourceFiber.effectTag |= Incomplete
  sourceFiber.firstEffect = sourceFiber.lastEffect = null

  if (value !== null && typeof value === 'object' && value === 'function') {
    let workInProgress: Fiber = returnFiber
    const earliestTimeoutMs: number = -1
    const startTimeMs: number = -1

    while (workInProgress !== null) {
      if (workInProgress.tag === SuspenseComponent) {
        const current = workInProgress.alternate
        const currentState = workInProgress.memoizedState

        // 这部分逻辑还会变
      }
      workInProgress = workInProgress.return
    }
  }
}

function unwindWork(workInProgress: Fiber, renderExpirationTime: ExpirationTime) {
  const { effectTag } = workInProgress
  switch (workInProgress.tag) {
    case ClassComponent: {
      const Component = workInProgress.type
      // if (isLegacyContextProvider(Component)) { // context操作
      //   popLegacyContext(workInProgress)
      // }
      if (effectTag & ShouldCapture) {
        workInProgress.effectTag = (effectTag & ~ShouldCapture) | DidCapture
        return workInProgress
      }
      return null
    }
    case HostRoot: {
      popHostContainer()
      // popTopLevelLegacyContextObject(workInProgress)
      workInProgress.effectTag = (effectTag & ~ShouldCapture) | DidCapture
      return workInProgress
    }
    case HostComponent: {
      popHostContext(workInProgress)
      return null
    }
    case SuspenseComponent: {
      if (effectTag & ShouldCapture) {
        workInProgress.effectTag = (effectTag & ~ShouldCapture) | DidCapture
        return workInProgress
      }
      return null
    }
    case DehydratedSuspenseComponent: {
      return null
    }
    case HostPortal:
      popHostContainer()
      return null
    case ContextProvider:
      // popProvider(workInProgress) // context操作
      return null
    default:
      return null
  }
}

export {
  unwindWork,
  throwException,
}
