import { ExpirationTime } from '../react-fiber/expiration-time'
import { createFiberFromElement, createFiberFromText, createWorkInProgress, Fiber } from '../react-fiber/fiber'
import { Deletion, Placement } from '../react-type/effect-type'
import { REACT_ELEMENT_TYPE, REACT_FRAGMENT_TYPE, REACT_PROFILER_TYPE } from '../react-type/react-type'
import { Fragment, HostText } from '../react-type/tag-type'
import { ReactElement } from '../react/react'
import { isObject, isText } from '../utils/getType'

function useFiber(fiber: Fiber, pendingProps: any): Fiber {
  const clone = createWorkInProgress(fiber, pendingProps)

  clone.index = 0
  clone.sibling = null
  return clone
}

function ChildReconciler(shouldTrackSideEffects) {
  function deleteChild(returnFiber: Fiber, childToDelete: Fiber) {
    if (!shouldTrackSideEffects) {
      return
    }

    const last = returnFiber.lastEffect

    if (last !== null) {
      last.nextEffect = childToDelete
      returnFiber.lastEffect = childToDelete
    } else {
      returnFiber.firstEffect = returnFiber.lastEffect = childToDelete
    }

    childToDelete.nextEffect = null
    childToDelete.effectTag = Deletion
  }

  function deleteRemainingChildren(returnFiber: Fiber, currentFirstChild: Fiber) {
    if (!shouldTrackSideEffects) {
      return
    }

    let childToDelete: Fiber = currentFirstChild
    while (childToDelete !== null) {
      deleteChild(returnFiber, childToDelete)
      childToDelete = childToDelete.sibling
    }
  }

  function placeSingleChild(newFiber: Fiber): Fiber {
    if (shouldTrackSideEffects && newFiber.alternate === null) {
      newFiber.effectTag = Placement
    }
    return newFiber
  }

  function reconcileSingleElement(returnFiber: Fiber, currentFirstChild: Fiber, element: ReactElement, expirationTime: ExpirationTime): Fiber {
    let child: Fiber = currentFirstChild

    while (child != null) {
      if (child.key === element.key) {
        if (child.tag === Fragment ? element.type === REACT_FRAGMENT_TYPE : child.elementType === element.type) {
          deleteRemainingChildren(returnFiber, child.sibling)

          const existing = useFiber(child, element.type === REACT_FRAGMENT_TYPE ? element.props.child : element.props)
          // existing.ref = coerceRef(returnFiber, child, element) // 待实现，处理Ref
          existing.return = returnFiber

          return existing
        } else {
          deleteRemainingChildren(returnFiber, child)
          break
        }
      } else {
        deleteChild(returnFiber, child)
      }

      child = child.sibling
    }

    const created = createFiberFromElement(element, returnFiber.mode, expirationTime)
    if (element.type !== REACT_FRAGMENT_TYPE) {
      // created.ref = coerceRef(returnFiber, child, element) // 待实现，处理Ref
    }

    created.return = returnFiber
    return created
  }

  // 待实现
  function reconcileSinglePortal(returnFiber: Fiber, currentFirstChild: Fiber, element: ReactElement, expirationTime: ExpirationTime): Fiber {

  }

  function reconcileSingleTextNode(returnFiber: Fiber, currentFirstChild: Fiber, textContent: string, expirationTime: ExpirationTime): Fiber {
    if (currentFirstChild !== null && currentFirstChild.tag === HostText) {
      deleteRemainingChildren(returnFiber, currentFirstChild.sibling)

      const existing = useFiber(currentFirstChild, textContent)
      existing.return = returnFiber

      return existing
    }

    deleteRemainingChildren(returnFiber, currentFirstChild)
    const created = createFiberFromText(textContent, returnFiber.mode, expirationTime)
    created.return = returnFiber

    return created
  }

  return (returnFiber: Fiber, currentFirstChild: Fiber, newChild: any, expirationTime: ExpirationTime): Fiber => {
    // 处理fragment
    const isUnkeyedTopLevelFragment = isObject(newChild) && newChild.type === REACT_FRAGMENT_TYPE && newChild.key === null
    if (isUnkeyedTopLevelFragment) {
      newChild = newChild.props.children
    }

    if (isObject(newChild)) {
      switch (newChild.$$typeof) {
        case REACT_ELEMENT_TYPE:
          return placeSingleChild(reconcileSingleElement(returnFiber, currentFirstChild, newChild, expirationTime))
        case REACT_PROFILER_TYPE:
          return placeSingleChild(reconcileSinglePortal(returnFiber, currentFirstChild, newChild, expirationTime))

        default:
          break
      }
    }

    if (isText(newChild)) {
      return placeSingleChild(reconcileSingleTextNode(returnFiber, currentFirstChild, newChild, expirationTime))
    }
  }
}

function reconcileChildren(current: Fiber, workInProgress: Fiber, nextChildren: any, renderExpirationTime: ExpirationTime) {
  const mountChildFibers = ChildReconciler(false)
  const reconcileChildFibers = ChildReconciler(true)

  if (current === null) {
    workInProgress.child = mountChildFibers(workInProgress, null, nextChildren, renderExpirationTime)
  } else {
    workInProgress.child = reconcileChildFibers(workInProgress, current.child, nextChildren, renderExpirationTime)
  }
}

export { reconcileChildren }
