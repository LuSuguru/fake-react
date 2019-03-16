import { REACT_ELEMENT_TYPE, REACT_FRAGMENT_TYPE } from '../react-type/react-type'
import { isObject } from '../utils/getType'
import { ExpirationTime } from './expiration-time'
import { Fiber } from './fiber'


function ChildReconciler(shouldTrackSideEffects) {

  return (returnFiber: Fiber, currentFirstChild: Fiber, newChild: any, expirationTime: ExpirationTime): Fiber => {
    // 处理fragment
    const isUnkeyedTopLevelFragment = typeof newChild === 'object' && newChild !== null && newChild.type === REACT_FRAGMENT_TYPE && newChild.key === null
    if (isUnkeyedTopLevelFragment) {
      newChild = newChild.props.children
    }

    if (isObject(newChild)) {
      switch (newChild.$$typeof) {
        case REACT_ELEMENT_TYPE:
          return placeSingleChild(
            reconcileSingleElement(
              returnFiber,
              currentFirstChild,
              newChild,
              expirationTime,
            ),
          )


        default:
          break
      }
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
