import { ExpirationTime, NoWork } from '../react-fiber/expiration-time'
import { Fiber } from '../react-fiber/fiber'
import { hasContextChanged } from '../react-fiber/fiber-context'
import { renderWithHooks } from '../react-fiber/fiber-hook'
import { resolveDefaultProps } from '../react-fiber/lazy-component'
import { PerformedWork } from '../react-type/effect-type'
import { FunctionComponent, HostRoot, IncompleteClassComponent, LazyComponent } from '../react-type/tag-type'
import { reconcileChildren } from './child-work'

let didReceiveUpdate: boolean = false

function updateFunctionComponent(current: Fiber, workInProgress: Fiber, Component: Function, nextProps: any, renderExpirationTime: ExpirationTime) {
  // context 操作
  // const unmaskedContext = getUnmaskedContext(workInProgress, Component, true)
  // const context = getMaskedContext(workInProgress, unmaskedContext)
  // prepareToReadContext(workInProgress, renderExpirationTime)

  let nextChildren: any = null

  nextChildren = renderWithHooks(current, workInProgress, Comment, nextProps, null, renderExpirationTime)

  if (current !== null && !didReceiveUpdate) {
    // 待实现
  }

  workInProgress.effectTag |= PerformedWork
  reconcileChildren(current, workInProgress, nextChildren, renderExpirationTime)

  return workInProgress.child
}

function beginWork(current: Fiber, workInProgress: Fiber, renderExpirationTime: ExpirationTime): Fiber {
  const updateExpirationTime = workInProgress.expirationTime

  if (current !== null) {
    const oldProps = current.memoizedProps
    const newProps = workInProgress.pendingProps

    if (oldProps !== newProps || hasContextChanged()) {
      didReceiveUpdate = true
    } else if (updateExpirationTime < renderExpirationTime) {
      didReceiveUpdate = false

      // switch (workInProgress.tag) { // stack和context操作，待实现
      //   case HostRoot:

      //     break

      //   default:
      //     break
      // }
    }
  } else {
    didReceiveUpdate = false
  }

  workInProgress.expirationTime = NoWork

  switch (workInProgress.tag) {
    case IncompleteClassComponent:
      return
    case LazyComponent:
      return
    case FunctionComponent: {
      const Component = workInProgress.type
      const unresolveProps = workInProgress.pendingProps
      const resolvedProps = workInProgress.elementType === Component ? unresolveProps : resolveDefaultProps(Component, unresolveProps)
      return updateFunctionComponent(current, workInProgress, Component, resolvedProps, renderExpirationTime)
    }

  }
}


export { beginWork }
