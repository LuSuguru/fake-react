import { getHostContext, getRootHostContainer, popHostContainer, popHostContext } from '../react-context/host-context'
import { appendInitialChild, Container, createInstance, createTextInstance, diffProperties, finalizeInitialChildren } from '../react-dom/dom/dom-component'
import { ExpirationTime } from '../react-fiber/expiration-time'
import { Fiber } from '../react-fiber/fiber'
import { DidCapture, NoEffect, Placement, Ref, Update } from '../react-type/effect-type'
import {
  ClassComponent,
  ContextConsumer,
  ContextProvider,
  DehydratedSuspenseComponent,
  ForwardRef,
  Fragment,
  FunctionComponent,
  HostComponent,
  HostPortal,
  HostRoot,
  HostText,
  IncompleteClassComponent,
  IndeterminateComponent,
  LazyComponent,
  MemoComponent,
  Mode,
  Profiler,
  SimpleMemoComponent,
  SuspenseComponent,
} from '../react-type/tag-type'

function updateHostComponent(current: Fiber, workInProgress: Fiber | any, type: string, newProps: any, rootContainerInstance: Container | any) {
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

function updateHostText(workInProgress: Fiber, oldText: string, newText: string) {
  if (oldText !== newText) {
    workInProgress.effectTag |= Update
  }
}

function appendAllChildren(parent: any, workInProgress: Fiber) {
  let node: Fiber = workInProgress.child

  while (node !== null) {
    if (node.tag === HostComponent || node.tag === HostText) {
      appendInitialChild(parent, node.stateNode)
    } else if (node.tag === HostPortal) {
      // 这个会渲染到外面，这里忽略
    } else if (node.child !== null) {
      node.child.return = node
      node = node.child
      continue
    }
    if (node === workInProgress) {
      return
    }

    while (node.sibling === null) {
      if (node.return === null || node.return === workInProgress) {
        return
      }
      node = node.return
    }

    node.sibling.return = node.return
    node = node.sibling
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
      popHostContainer()
      // popTopLevelLegacyContextObject(workInProgress)

      const fiberRoot = workInProgress.stateNode
      if (fiberRoot.pendingContext) {
        fiberRoot.context = fiberRoot.pendingContext
        fiberRoot.pendingContext = null
      }

      if (current === null || current.child === null) {
        // popHydrationState(workInProgress)
        workInProgress.effectTag &= ~Placement
      }
      break
    }
    case HostComponent: {
      popHostContext(workInProgress)
      const rootContainerInstance = getRootHostContainer()
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

        const currentHostContext = getHostContext()
        const wasHydrated = popHydrationState(workInProgress)

        if (wasHydrated) {
          // hydrated模式的操作
          //   if (prepareToHydrateHostInstance(workInProgress, rootContainerInstance, currentHostContext)) {
          //     workInProgress.effectTag |= Update
          //   }
        } else {
          const instance = createInstance(type, newProps, rootContainerInstance, currentHostContext, workInProgress)

          appendAllChildren(instance, workInProgress)

          if (finalizeInitialChildren(instance, type, newProps, rootContainerInstance)) {
            workInProgress.effectTag |= Update
          }
          workInProgress.stateNode = instance
        }

        if (workInProgress.ref !== null) {
          workInProgress.effectTag |= Ref
        }
      }
      break
    }
    case HostText: {
      const newText: string = newProps

      if (current && workInProgress.stateNode !== null) {
        const oldText = current.memoizedProps
        updateHostText(workInProgress, oldText, newText)
      } else {
        const rootContainerInstance = getRootHostContainer()
        const wasHydrated = popHydrationState(workInProgress)

        if (wasHydrated) {
          // if (prepareToHydrateHostTextInstance(workInProgress)) {
          //   workInProgress.effectTag |= Update
          // }
        } else {
          workInProgress.stateNode = createTextInstance(newText, rootContainerInstance, workInProgress)
        }
      }
      break
    }
    case SuspenseComponent: {
      // 待实现
    }
    case HostPortal:
      popHostContainer()
      // updateHostContainer(workInProgress)
      break
    case ContextProvider:
      // popProvider(workInProgress)
      break
    case IncompleteClassComponent: {
      const Component = workInProgress.type
      // if (isLegacyContextProvider(Component)) {
      //   popLegacyContext(workInProgress)
      // }
      break
    }
    case DehydratedSuspenseComponent: {
      if ((workInProgress.effectTag & DidCapture) === NoEffect) {
        current.alternate = null
        workInProgress.alternate = null
        workInProgress.tag = SuspenseComponent
        workInProgress.memoizedState = null
        workInProgress.stateNode = null
      }
      break
    }
    case ForwardRef:
      break
    case Fragment:
      break
    case Mode:
      break
    case Profiler:
      break
    case ContextConsumer:
      break
    case MemoComponent:
      break
    default:
      break
  }

  return null
}

export {
  completeWork,
}

