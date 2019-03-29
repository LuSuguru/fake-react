import { Container, createInstance, diffProperties } from '../react-dom/dom-component'
import { ExpirationTime } from '../react-fiber/expiration-time'
import { Fiber } from '../react-fiber/fiber'
import { Placement, Ref, Update } from '../react-type/effect-type'
import {
  ClassComponent,
  FunctionComponent,
  HostComponent,
  HostRoot,
  IndeterminateComponent,
  LazyComponent,
  SimpleMemoComponent,
} from '../react-type/tag-type'

function updateHostComponent(current: Fiber, workInProgress: Fiber | any, type: string, newProps: any, rootContainerInstance: Container) {
  const oldProps = current.memoizedProps
  if (oldProps === newProps) {
    return
  }

  const { stateNode: instance } = workInProgress
  const updatePayload = diffProperties(instance, type, oldProps, newProps, rootContainerInstance)
  workInProgress.updateQueue = updatePayload

  if (updatePayload) {
    workInProgress.effectTag |= Update
  }
}

function completeWork(current: Fiber, workInProgress: Fiber, renderExpirationTime: ExpirationTime) {
  const newProps = workInProgress.pendingProps

  switch (workInProgress.tag) {
    case IndeterminateComponent:
    case LazyComponent:
    case SimpleMemoComponent:
    case FunctionComponent:
      break
    case ClassComponent: {
      // const Component = workInProgress.type //context操作
      // if (isLegacyContextProvider(Component)) {
      //   popLegacyContext(workInProgress)
      // }
      break
    }
    case HostRoot: {
      // popHostContainer(workInProgress) // context操作
      // popTopLevelLegacyContextObject(workInProgress)

      const fiberRoot = workInProgress.stateNode
      // if (fiberRoot.pendingContext) {
      //   fiberRoot.context = fiberRoot.pendingContext
      //   fiberRoot.pendingContext = null
      // }

      if (current === null || current.child === null) {
        // popHydrationState(workInProgress)
        workInProgress.effectTag &= ~Placement
      }
      break
    }
    case HostComponent: {
      // popHostContext(workInProgress) // context操作
      const rootContainerInstance = {} // getRootHostContainer()
      const { type } = workInProgress

      if (current !== null && workInProgress.stateNode !== null) {
        updateHostComponent(current, workInProgress, type, newProps, rootContainerInstance)

        if (current.ref !== workInProgress.ref) {
          workInProgress.effectTag |= Ref
        }
      } else {
        if (!newProps) {
          break
        }

        const currentHostContext = getHostContext() // context操作
        const wasHydrated = popHydrationState(workInProgress)

        if (wasHydrated) {
          // hydrated模式的操作
          //   if (prepareToHydrateHostInstance(workInProgress, rootContainerInstance, currentHostContext)) {
          //     workInProgress.effectTag |= Update
          //   }
        } else {
          const instance = createInstance(type, newProps, rootContainerInstance, currentHostContext, workInProgress)
        }
      }

      break
    }
  }
}

