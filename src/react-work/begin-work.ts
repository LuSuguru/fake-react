import { constructClassInstance, mountClassInstance, resumeMountClassInstance } from '../react-fiber/class-component'
import { ExpirationTime, NoWork } from '../react-fiber/expiration-time'
import { Fiber } from '../react-fiber/fiber'
import { hasContextChanged } from '../react-fiber/fiber-context'
import { renderWithHooks } from '../react-fiber/fiber-hook'
import { resolveDefaultProps } from '../react-fiber/lazy-component'
import { PerformedWork, Placement } from '../react-type/effect-type'
import { ClassComponent, FunctionComponent, HostRoot, IncompleteClassComponent, LazyComponent } from '../react-type/tag-type'
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

function updateClassComponent(current: Fiber, workInProgress: Fiber, Component: any, nextProps: any, renderExpirationTime: ExpirationTime) {
  // let hasContext  // context操作，待实现
  // if (isLegacyContextProvider(Component)) {
  //   hasContext = true
  //   pushLegacyContextProvider(workInProgress)
  // } else {
  //   hasContext = false
  // }
  // prepareToReadContext(workInProgress, renderExpirationTime)

  const instance = workInProgress.stateNode
  let shouldUpdate: boolean = false

  if (instance === null) {
    if (current !== null) {
      current.alternate = null
      workInProgress.alternate = null
      workInProgress.effectTag |= Placement
    }
    constructClassInstance(workInProgress, Component, nextProps)
    mountClassInstance(workInProgress, Component, nextProps, renderExpirationTime)
    shouldUpdate = true
  } else if (current === null) {
    shouldUpdate = resumeMountClassInstance(workInProgress, Component, nextProps, renderExpirationTime)
  }
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
    case IncompleteClassComponent: // 待实现
      return
    case LazyComponent: // 待实现
      return
    case FunctionComponent: {
      const Component = workInProgress.type
      const unresolveProps = workInProgress.pendingProps
      const resolvedProps = workInProgress.elementType === Component ? unresolveProps : resolveDefaultProps(Component, unresolveProps)
      return updateFunctionComponent(current, workInProgress, Component, resolvedProps, renderExpirationTime)
    }
    case ClassComponent: {
      const Component = workInProgress.type
      const unresolveProps = workInProgress.pendingProps
      const resolvedProps = workInProgress.elementType === Component ? unresolveProps : resolveDefaultProps(Component, unresolveProps)
      return updateClassComponent(current, workInProgress, Component, resolvedProps, renderExpirationTime)
    }
  }
}


export { beginWork }
