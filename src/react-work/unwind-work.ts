import { popHostContainer, popHostContext } from '../react-context/host-context'
import { ExpirationTime } from '../react-fiber/expiration-time'
import { Fiber } from '../react-fiber/fiber'
import { DidCapture, ShouldCapture } from '../react-type/effect-type'
import { ClassComponent, ContextProvider, DehydratedSuspenseComponent, HostComponent, HostPortal, HostRoot, SuspenseComponent } from '../react-type/tag-type'

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
}
