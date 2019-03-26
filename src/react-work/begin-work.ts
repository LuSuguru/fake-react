import { constructClassInstance, mountClassInstance, resumeMountClassInstance, updateClassInstance } from '../react-fiber/class-component'
import { ExpirationTime, NoWork } from '../react-fiber/expiration-time'
import { Fiber } from '../react-fiber/fiber'
import { hasContextChanged } from '../react-fiber/fiber-context'
import { renderWithHooks } from '../react-fiber/fiber-hook'
import { resolveDefaultProps } from '../react-fiber/lazy-component'
import { DidCapture, NoEffect, PerformedWork, Placement } from '../react-type/effect-type'
import { ClassComponent, FunctionComponent, HostRoot, IncompleteClassComponent, LazyComponent } from '../react-type/tag-type'
import { isFunction } from '../utils/getType'
import { cloneChildFiber, reconcileChildFibers, reconcileChildren } from './child-work'

let didReceiveUpdate: boolean = false

function bailoutOnAlreadyFinishedWork(current: Fiber, workInProgress: Fiber, renderExpirationTime: ExpirationTime) {
  if (current !== null) {
    workInProgress.contextDependencies = current.contextDependencies
  }

  // if (enableProfilerTimer) { // 待实现
  //   // Don't update "base" render times for bailouts.
  //   stopProfilerTimerIfRunning(workInProgress);
  // }

  const { childExpirationTime } = workInProgress
  if (childExpirationTime < renderExpirationTime) {
    return null
  } else {
    cloneChildFiber(current, workInProgress)
    return workInProgress.child
  }
}

function forceUnmountCurrentAndReconcile(current: Fiber, workInProgress: Fiber, nextChildren: any, renderExpirationTime: ExpirationTime) {

}

function updateFunctionComponent(current: Fiber, workInProgress: Fiber, Component: Function, nextProps: any, renderExpirationTime: ExpirationTime) {
  // context 操作
  // const unmaskedContext = getUnmaskedContext(workInProgress, Component, true)
  // const context = getMaskedContext(workInProgress, unmaskedContext)
  // prepareToReadContext(workInProgress, renderExpirationTime)

  let nextChildren: any = null

  nextChildren = renderWithHooks(current, workInProgress, Comment, nextProps, null, renderExpirationTime)

  if (current !== null && !didReceiveUpdate) {
    // bailoutHooks(current, workInProgress, renderExpirationTime) // 待实现
    return bailoutOnAlreadyFinishedWork(current, workInProgress, renderExpirationTime)
  }

  workInProgress.effectTag |= PerformedWork
  reconcileChildren(current, workInProgress, nextChildren, renderExpirationTime)

  return workInProgress.child
}

function updateClassComponent(current: Fiber, workInProgress: Fiber, Component: any, nextProps: any, renderExpirationTime: ExpirationTime) {
  let hasContext: boolean  // context操作，待实现
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
  } else {
    shouldUpdate = updateClassInstance(current, workInProgress, Component, nextProps, renderExpirationTime)
  }

  const nextUnitWork = finishClassComponent(current, workInProgress, Component, shouldUpdate, hasContext, renderExpirationTime)
  return nextUnitWork
}

function finishClassComponent(current: Fiber, workInProgress: Fiber, Component: any, shouldUpdate: boolean, hasContext: boolean, renderExpirationTime: ExpirationTime) {
  // markRef(current, workInProgress) // ref操作
  const didCaptureError = (workInProgress.effectTag & DidCapture) !== NoEffect
  if (!shouldUpdate && !didCaptureError) {
    // if (hasContext) { // context操作
    //   invalidateContextProvider(workInProgress, Component, false)
    // }
    return bailoutOnAlreadyFinishedWork(current, workInProgress, renderExpirationTime)
  }

  const { stateNode: instance } = workInProgress
  let nextChildren: any = null

  if (didCaptureError && isFunction(Component.getDerivedStateFromError)) {
    nextChildren = null
    // if (enableProfilerTimer) {
    //   stopProfilerTimerIfRunning(workInProgress);
    // }
  } else {
    nextChildren = instance.render()
  }

  workInProgress.effectTag |= PerformedWork
  if (current !== null && didCaptureError) { // 错误情况下不复用现有的children
    reconcileChildFibers(workInProgress, current.child, null, renderExpirationTime) // 删除当前存在的children
    reconcileChildFibers(workInProgress, null, nextChildren, renderExpirationTime) // 重新生成新的children
  } else {
    reconcileChildren(current, workInProgress, nextChildren, renderExpirationTime)
  }

  workInProgress.memoizedState = instance.state
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
