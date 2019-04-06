import { Container } from '../react-dom/dom/dom-component'
import { setTextContent } from '../react-dom/dom/property-operation'
import { Fiber } from '../react-fiber/fiber'
import { resolveDefaultProps } from '../react-fiber/lazy-component'
import { ContentReset, Placement } from '../react-type/effect-type'
import { ClassComponent, DehydratedSuspenseComponent, ForwardRef, FunctionComponent, HostComponent, HostPortal, HostRoot, HostText, SimpleMemoComponent } from '../react-type/tag-type'
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

function commitBeforeMutationLifecycle(current: Fiber, finishWork: Fiber) {
  switch (finishWork.tag) {
    case FunctionComponent:
    case ForwardRef:
    case SimpleMemoComponent:
      // commitHookEffectList(UnmountSnapshot, NoHookEffect, finishedWork) // hook操作
      return
    case ClassComponent: {
      if (current !== null) {
        const prevPrrops = current.memoizedProps
        const prevState = current.memoizedState
        const instance = finishWork.stateNode

        const snapshot = instance.getSnapshotBeforeUpdate(finishWork.elementType === finishWork.type ? prevPrrops : resolveDefaultProps(finishWork.type, prevPrrops), prevState)
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

function commitPlacement(finishWork: Fiber) {
  const parentFiber = getHostParentFiber(finishWork)

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

  const before = getHostSibling(finishWork)
}

export {
  commitBeforeMutationLifecycle,
  commitResetTextContent,
  commitDetachRef,
  commitPlacement,
}
