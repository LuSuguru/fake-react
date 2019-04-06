import { setTextContent } from '../react-dom/dom/property-operation'
import { Fiber } from '../react-fiber/fiber'
import { resolveDefaultProps } from '../react-fiber/lazy-component'
import { ContentReset, Placement } from '../react-type/effect-type'
import { ClassComponent, DehydratedSuspenseComponent, ForwardRef, FunctionComponent, HostComponent, HostPortal, HostRoot, HostText, IncompleteClassComponent, MemoComponent, Profiler, SimpleMemoComponent, SuspenseComponent } from '../react-type/tag-type'
import { appendChild, appendChildToContainer, insertBefore, insertInContainerBefore } from '../utils/browser'
import { isFunction } from '../utils/getType'

function isHostParent(fiber: Fiber) {
  return (
    fiber.tag === HostComponent ||
    fiber.tag === HostRoot ||
    fiber.tag === HostPortal
  )
}

function getHostParentFiber(fiber: Fiber): Fiber {
  let parent: Fiber = fiber.return
  while (parent !== null) {
    if (isHostParent(parent)) {
      return parent
    }
    parent = parent.return
  }
}

function getHostSibling(fiber: Fiber): any {
  let node: Fiber = fiber

  siblings: while (true) {
    while (node.sibling === null) {
      if (node.return === null || isHostParent(node.return)) {
        return null
      }
      node = node.return
    }
    node.sibling.return = node.return
    node = node.sibling

    while (node.tag !== HostComponent && node.tag !== HostText && node.tag !== DehydratedSuspenseComponent) {
      if (!(node.effectTag & Placement)) {
        continue siblings
      }

      if (node.child === null || node.tag === HostPortal) {
        continue siblings
      } else {
        node.child.return = node
        node = node.child
      }
    }

    if (!(node.effectTag & Placement)) {
      return node.stateNode
    }
  }
}

function commitBeforeMutationLifecycle(current: Fiber, finishedWork: Fiber) {
  switch (finishedWork.tag) {
    case FunctionComponent:
    case ForwardRef:
    case SimpleMemoComponent:
      // commitHookEffectList(UnmountSnapshot, NoHookEffect, finishedWork) // hook操作
      return
    case ClassComponent: {
      if (current !== null) {
        const prevPrrops = current.memoizedProps
        const prevState = current.memoizedState
        const instance = finishedWork.stateNode

        const snapshot = instance.getSnapshotBeforeUpdate(finishedWork.elementType === finishedWork.type ? prevPrrops : resolveDefaultProps(finishedWork.type, prevPrrops), prevState)
        instance.__reactInternalSnapshotBeforeUpdate = snapshot
      }
      return
    }
  }
}

function commitResetTextContent(current: Fiber) {
  setTextContent(current.stateNode)
}

function commitDetachRef(current: Fiber) {
  const currentRef = current.ref
  if (currentRef !== null) {
    if (isFunction(currentRef)) {
      currentRef(null)
    } else {
      currentRef.current = null
    }
  }
}

function commitPlacement(finishedWork: Fiber) {
  const parentFiber = getHostParentFiber(finishedWork)

  let parent: any = null
  let isContanier: boolean = false

  switch (parentFiber.tag) {
    case HostComponent: {
      parent = parentFiber.stateNode
      isContanier = false
      break
    }
    case HostRoot: {
      parent = parentFiber.stateNode.containerInfo
      isContanier = true
      break
    }
    case HostPortal: {
      parent = parentFiber.stateNode.containerInfo
      isContanier = true
      break
    }
  }

  if (parentFiber.effectTag & ContentReset) {
    setTextContent(parent)
    parentFiber.effectTag &= ~ContentReset
  }

  const before = getHostSibling(finishedWork)
  let node: Fiber = finishedWork

  while (true) {
    if (node.tag === HostComponent || node.tag === HostText) {
      if (before) {
        if (isContanier) {
          insertInContainerBefore(parent, node.stateNode, before)
        } else {
          insertBefore(parent, node.stateNode, before)
        }
      } else {
        if (isContanier) {
          appendChildToContainer(parent, node.stateNode)
        } else {
          appendChild(parent, node.stateNode)
        }
      }
    } else if (node.tag === HostPortal) {
      // 跳过
    } else if (node.child !== null) {
      node.child.return = node
      node = node.child
      continue
    }
    if (node === finishedWork) {
      return
    }
    while (node.sibling === null) {
      if (node.return === null || node.return === finishedWork) {
        return
      }
      node = node.return
    }
    node.sibling.return = node.return
    node = node.sibling
  }
}

function commitWork(current: Fiber, finishedWork: Fiber) {
  switch (finishedWork.tag) {
    case FunctionComponent:
    case ForwardRef:
    case MemoComponent:
    case SuspenseComponent: {
      // commitHookEffectList(UnmountMutation, MountMutation, finishedWork)
      return
    }
    case ClassComponent: {
      return
    }
    case HostComponent: {
      const instance = finishedWork.stateNode
      if (instance !== null) {
        const newProps = finishedWork.memoizedProps
        const oldProps = current !== null ? current.memoizedProps : newProps
        const type = finishedWork.type

        const updatePayload = finishedWork.updateQueue
        finishedWork.updateQueue = null

        if (updatePayload !== null) {
          commitUpdate(instance, updatePayload, type, oldProps, newProps, finishedWork)
        }
      }
      return
    }
    case HostText: {
      const textInstance = finishedWork.stateNode
      const newText = finishedWork.memoizedProps
      const oldText = current !== null ? current.memoizedProps : newText
      commitTextUpdate(textInstance, oldText, newText)
      return
    }
    case SuspenseComponent: {
      // 待实现
    }
    case HostRoot:
    case Profiler:
    case IncompleteClassComponent: {
      return
    }

  }
}

export {
  commitBeforeMutationLifecycle,
  commitResetTextContent,
  commitDetachRef,
  commitPlacement,
  commitWork,
}
