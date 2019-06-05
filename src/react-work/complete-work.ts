import { popProvider } from '../react-context/fiber-context'
import { getHostContext, getRootHostContainer, popHostContainer, popHostContext } from '../react-context/host-context'
import { Container, createInstance, createTextInstance, diffProperties, finalizeInitialChildren } from '../react-dom/dom/dom-component'
import { Fiber } from '../react-fiber/fiber'
import { DidCapture, NoEffect, Placement, Ref, Update } from '../react-type/effect-type'
import {
  ContextProvider,
  DehydratedSuspenseComponent,
  HostComponent,
  HostPortal,
  HostRoot,
  HostText,
  SuspenseComponent,
} from '../react-type/tag-type'
import { appendChild as appendInitialChild } from '../utils/browser'

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
    } else if (node.child !== null && node.tag !== HostPortal) {
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

function completeWork(current: Fiber, workInProgress: Fiber) {
  const newProps = workInProgress.pendingProps

  switch (workInProgress.tag) {
    case HostRoot: {
      popHostContainer()

      const fiberRoot = workInProgress.stateNode
      if (fiberRoot.pendingContext) {
        fiberRoot.context = fiberRoot.pendingContext
        fiberRoot.pendingContext = null
      }

      if (current === null || current.child === null) {
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

        const instance = createInstance(type, newProps, rootContainerInstance, currentHostContext, workInProgress)

        appendAllChildren(instance, workInProgress)

        // 是否需要获得焦点
        if (finalizeInitialChildren(instance, type, newProps, rootContainerInstance)) {
          workInProgress.effectTag |= Update
        }
        workInProgress.stateNode = instance
      }

      if (workInProgress.ref !== null) {
        workInProgress.effectTag |= Ref
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

        workInProgress.stateNode = createTextInstance(newText, rootContainerInstance, workInProgress)
      }
      break
    }
    case SuspenseComponent: {
      // 待实现
    }
    case HostPortal:
      popHostContainer()
      break
    case ContextProvider:
      popProvider(workInProgress)
      break
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
  }

  return null
}

export {
  completeWork,
}

