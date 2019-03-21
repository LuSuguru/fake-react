import { ExpirationTime } from '../react-fiber/expiration-time'
import { createFiberFromElement, createFiberFromFragment, createFiberFromPortal, createFiberFromText, createFiberFromTypeAndProps, createWorkInProgress, Fiber } from '../react-fiber/fiber'
import { Deletion, Placement } from '../react-type/effect-type'
import { REACT_ELEMENT_TYPE, REACT_FRAGMENT_TYPE, REACT_PORTAL_TYPE, REACT_PROFILER_TYPE, ReactPortal } from '../react-type/react-type'
import { Fragment, HostPortal, HostText } from '../react-type/tag-type'
import { ReactElement } from '../react/react'
import { isArray } from '../utils/getType'
import { isObject, isText } from '../utils/getType'

function useFiber(fiber: Fiber, pendingProps: any): Fiber {
  const clone = createWorkInProgress(fiber, pendingProps)

  clone.index = 0
  clone.sibling = null
  return clone
}

function mapRemainingChildren(currentFirstChild: Fiber): Map<string | number, Fiber> {
  const existingChildren: Map<string | number, Fiber> = new Map()

  let existingChild: Fiber = currentFirstChild
  while (existingChild !== null) {
    if (existingChild.key !== null) {
      existingChildren.set(existingChild.key, existingChild)
    } else {
      existingChildren.set(existingChild.index, existingChild)
    }
    existingChild = existingChild.sibling
  }
  return existingChildren
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

  function placeChild(newFiber: Fiber, lastPlacedIndex: number, newIdx: number): number {
    newFiber.index = newIdx

    if (!shouldTrackSideEffects) {
      return lastPlacedIndex
    }

    const current = newFiber.alternate
    if (current !== null) {
      const oldIndex = current.index
      if (oldIndex < lastPlacedIndex) {
        newFiber.effectTag = Placement // 需要移动
        return lastPlacedIndex
      } else {
        return oldIndex
      }
    } else {
      newFiber.effectTag = Placement
      return lastPlacedIndex
    }
  }


  function placeSingleChild(newFiber: Fiber): Fiber {
    if (shouldTrackSideEffects && newFiber.alternate === null) {
      newFiber.effectTag = Placement
    }
    return newFiber
  }

  function createChild(returnFiber: Fiber, newChild: any, expirationTime: ExpirationTime): Fiber {
    if (isText(newChild)) {
      const fiber = createFiberFromText('' + newChild, returnFiber.mode, expirationTime)
      fiber.return = returnFiber
      return fiber
    }

    if (isObject(newChild)) {
      switch (newChild.$$typeof) {
        case REACT_ELEMENT_TYPE:
          const created = createFiberFromElement(newChild, returnFiber.mode, expirationTime)
          created.return = returnFiber
          return created
        case REACT_PORTAL_TYPE:
          const fiber = createFiberFromPortal(newChild, returnFiber.mode, expirationTime)
          fiber.return = returnFiber
          return fiber
      }

      if (isArray(newChild)) {
        const fiber = createFiberFromFragment(newChild, returnFiber.mode, expirationTime, null)
        fiber.return = returnFiber
        return fiber
      }
    }

    return null
  }

  function updateFragment(returnFiber: Fiber, current: Fiber, fragment: any, expirationTime: ExpirationTime, key: string | null): Fiber {
    let fiber: Fiber = null
    if (current !== null && current.tag !== Fragment) {
      fiber = createFiberFromFragment(fragment, returnFiber.mode, expirationTime, key)
    } else {
      fiber = useFiber(current, fragment)
    }

    fiber.return = returnFiber
    return fiber
  }

  function updateTextNode(returnFiber: Fiber, current: Fiber, textContent: string, expirationTime: ExpirationTime): Fiber {
    let fiber: Fiber = null
    if (current !== null && current.tag === HostText) {
      fiber = createFiberFromText(textContent, returnFiber.mode, expirationTime)
    } else {
      fiber = useFiber(current, textContent)
    }

    fiber.return = returnFiber
    return fiber
  }

  function updateElement(returnFiber: Fiber, current: Fiber, element: ReactElement, expirationTime: ExpirationTime): Fiber {
    let fiber: Fiber = null
    if (current !== null && current.elementType !== element.type) {
      fiber = createFiberFromElement(element, returnFiber.mode, expirationTime)
    } else {
      fiber = useFiber(current, element.props)
    }

    // fiber.ref = coerceRef(returnFiber, current, element) // 待实现
    fiber.return = returnFiber
    return fiber
  }

  function updatePortal(returnFiber: Fiber, current: Fiber, portal: ReactPortal, expirationTime: ExpirationTime): Fiber {
    let fiber: Fiber = null
    if (current === null || current.tag !== HostPortal || current.stateNode.containerInfo !== portal.containerInfo || current.stateNode.implementation !== portal.implementation) {
      fiber = createFiberFromPortal(portal, returnFiber.mode, expirationTime)
    } else {
      fiber = useFiber(current, portal.children || [])
    }

    fiber.return = returnFiber
    return fiber
  }

  function updateFromMap(returnFiber: Fiber, existingChildren: Map<string | number, Fiber>, newChild: any, newIdx: number, expirationTime: ExpirationTime) {
    if (isText(newChild)) {
      const matchedFiber = existingChildren.get(newIdx) || null
      return updateTextNode(returnFiber, matchedFiber, '' + newChild, expirationTime)
    }

    if (isObject(newChild)) {
      switch (newChild.$$typeof) {
        case REACT_ELEMENT_TYPE: {
          const matchedFiber = existingChildren.get(newChild.key === null ? newIdx : newChild.key) || null
          if (newChild.type === REACT_FRAGMENT_TYPE) {
            return updateFragment(returnFiber, matchedFiber, newChild.props.children, expirationTime, newChild.key)
          }
          return updateElement(returnFiber, matchedFiber, newChild, expirationTime)
        }
        case REACT_PORTAL_TYPE: {
          const matchedFiber = existingChildren.get(newChild.key === null ? newIdx : newChild.key) || null
          return updatePortal(returnFiber, matchedFiber, newChild, expirationTime)
        }
      }

      if (isArray(newChild)) {
        const matchedFiber = existingChildren.get(newIdx) || null
        return updateFragment(returnFiber, matchedFiber, newChild, expirationTime, null)
      }
    }
    return null
  }

  function updateSlot(returnFiber: Fiber, oldFiber: Fiber, newChild: any, expirationTime: ExpirationTime) {
    const key = oldFiber !== null ? oldFiber.key : null

    if (isText(newChild)) {
      if (key !== null) {
        return null
      }

      return updateTextNode(returnFiber, oldFiber, '' + newChild, expirationTime)
    }

    if (isObject(newChild)) {
      switch (newChild.$$typeof) {
        case REACT_ELEMENT_TYPE:
          if (newChild.key === key) {
            if (newChild.type === REACT_FRAGMENT_TYPE) {
              return updateFragment(returnFiber, oldFiber, newChild.props.children, expirationTime, key)
            }

            return updateElement(returnFiber, oldFiber, newChild, expirationTime)
          } else {
            return null
          }
        case REACT_PORTAL_TYPE:
          if (newChild.key === key) {
            return updatePortal(returnFiber, oldFiber, newChild, expirationTime)
          } else {
            return null
          }
      }
    }

    if (isArray(newChild)) {
      if (key !== null) {
        return null
      }

      return updateFragment(returnFiber, oldFiber, newChild, expirationTime, null)
    }

    return null
  }

  function reconcileSingleElement(returnFiber: Fiber, currentFirstChild: Fiber, element: ReactElement, expirationTime: ExpirationTime): Fiber {
    let child: Fiber = currentFirstChild

    while (child != null) {
      if (child.key === element.key) {
        if (child.tag === Fragment ? element.type === REACT_FRAGMENT_TYPE : child.elementType === element.type) {
          deleteRemainingChildren(returnFiber, child.sibling)

          const existing = useFiber(child, element.type === REACT_FRAGMENT_TYPE ? element.props.children : element.props)
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
    // created.ref = coerceRef(returnFiber, child, element) // 待实现，处理Ref
    created.return = returnFiber

    return created
  }

  // 待实现
  function reconcileSinglePortal(returnFiber: Fiber, currentFirstChild: Fiber, portal: ReactElement, expirationTime: ExpirationTime): Fiber {
    return returnFiber
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

  function reconcileChildrenArray(returnFiber: Fiber, currentFirstChild: Fiber, newChildren: any[], expirationTime: ExpirationTime): Fiber {
    let resultingFirstChild: Fiber = null // 要返回的链表头
    let previousNewFiber: Fiber = null // 链表的指针

    let oldFiber: Fiber = currentFirstChild
    let lastPlacedIndex: number = 0

    let newIdx: number = 0
    let nextOldFiber: Fiber = null

    for (; oldFiber !== null && newIdx < newChildren.length; newIdx++) {
      if (oldFiber.index > newIdx) {
        nextOldFiber = oldFiber
        oldFiber = null
      } else {
        nextOldFiber = oldFiber.sibling
      }
      const newFiber = updateSlot(returnFiber, oldFiber, newChildren[newIdx], expirationTime)

      if (newFiber === null) { // 有一个新旧key不相同，直接退出循环
        if (oldFiber === null) {
          oldFiber = nextOldFiber
        }
        break
      }

      if (shouldTrackSideEffects && (oldFiber && newFiber.alternate === null)) {
        deleteChild(returnFiber, oldFiber)
      }

      lastPlacedIndex = placeChild(newFiber, lastPlacedIndex, newIdx)

      if (previousNewFiber === null) {
        resultingFirstChild = previousNewFiber
      } else {
        previousNewFiber.sibling = newFiber
      }
      previousNewFiber = newFiber
      oldFiber = nextOldFiber
    }

    if (newIdx === newChildren.length) { // 新的数组已全部遍历完，删除余下的旧元素，返回
      deleteRemainingChildren(returnFiber, oldFiber)
      return resultingFirstChild
    }

    if (oldFiber === null) { // 旧的遍历完，新的还有，说明后续的都是新增
      for (; newIdx < newChildren.length; newIdx++) {
        const newFiber = createChild(returnFiber, newChildren[newIdx], expirationTime)
        if (!newFiber) {
          continue
        }

        lastPlacedIndex = placeChild(newFiber, lastPlacedIndex, newIdx)

        if (previousNewFiber === null) {
          resultingFirstChild = previousNewFiber
        } else {
          previousNewFiber.sibling = newFiber
        }
        previousNewFiber = newFiber
        return resultingFirstChild
      }
    }

    const existingChildren = mapRemainingChildren(oldFiber)

    for (; newIdx < newChildren.length; newIdx++) {
      const newFiber = updateFromMap(returnFiber, existingChildren, newChildren[newIdx], newIdx, expirationTime)

      if (newFiber) {
        if (shouldTrackSideEffects) {
          if (newFiber.alternate !== null) {
            existingChildren.delete(newFiber.key === null ? newIdx : newFiber.key)
          }
        }

        lastPlacedIndex = placeChild(newFiber, lastPlacedIndex, newIdx)
        if (previousNewFiber) {
          resultingFirstChild = newFiber
        } else {
          previousNewFiber.sibling = newFiber
        }
        previousNewFiber = newFiber
      }
    }

    if (shouldTrackSideEffects) {
      existingChildren.forEach((child: Fiber) => deleteChild(returnFiber, child))
    }
    return resultingFirstChild
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
      }
    }

    if (isText(newChild)) {
      return placeSingleChild(reconcileSingleTextNode(returnFiber, currentFirstChild, newChild, expirationTime))
    }

    if (isArray(newChild)) {
      return reconcileChildrenArray(returnFiber, currentFirstChild, newChild, expirationTime)
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
