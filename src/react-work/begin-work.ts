import { addOptionClassInstace, applyDerivedStateFromProps, constructClassInstance, mountClassInstance, resumeMountClassInstance, updateClassInstance } from '../react-fiber/class-component'
import { ExpirationTime, Never, NoWork } from '../react-fiber/expiration-time'
import { createFiberFromTypeAndProps, createWorkInProgress, Fiber, isSimpleFunctionComponent } from '../react-fiber/fiber'
import { hasContextChanged } from '../react-fiber/fiber-context'
import { bailoutHooks, renderWithHooks } from '../react-fiber/fiber-hook'
import { FiberRoot } from '../react-fiber/fiber-root'
import { readLazyComponentType, resolveDefaultProps, resolvedLazyComponentTag } from '../react-fiber/lazy-component'
import { ContentReset, DidCapture, NoEffect, PerformedWork, Placement, Ref } from '../react-type/effect-type'
import {
  ClassComponent,
  ContextConsumer,
  ForwardRef,
  Fragment,
  FunctionComponent,
  HostComponent,
  HostRoot,
  HostText,
  IncompleteClassComponent,
  LazyComponent,
  MemoComponent,
  SimpleMemoComponent,
  SuspenseComponent,
} from '../react-type/tag-type'
import { ConcurrentMode } from '../react-type/work-type'
import { processUpdateQueue } from '../react-update/update-queue'
import { shouldDeprioritizeSubtree, shouldSetTextContent } from '../utils/browser'
import { isEmpty, isFunction } from '../utils/getType'
import { shallowEqual } from '../utils/lib'
import { cloneChildFiber, mountChildFibers, reconcileChildFibers, reconcileChildren } from './child-work'

let didReceiveUpdate: boolean = false

function markRef(current: Fiber, workInProgress: Fiber) {
  const { ref } = workInProgress
  if ((current === null && ref !== null) && (current !== null && current.ref !== ref)) {
    workInProgress.effectTag |= Ref
  }
}

function bailoutOnAlreadyFinishedWork(current: Fiber, workInProgress: Fiber, renderExpirationTime: ExpirationTime): Fiber {
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
    cloneChildFiber(workInProgress)
    return workInProgress.child
  }
}

// 只有在组件被第一次渲染的情况下才会出现，在经过第一次渲染之后，我们就会更新组件的类型，也就是Fiber.tag
function mountIndeterminateComponent(current: Fiber, workInProgress: Fiber, Component: any, renderExpirationTime: ExpirationTime): Fiber {
  // 如果出现了current存在的情况，那么可能是因为渲染时有Suspend的情况
  if (current !== null) {
    current.alternate = null
    workInProgress.alternate = null
    workInProgress.effectTag |= Placement
  }
  const props = workInProgress.pendingProps

  // context操作
  // const unmaskedContext = getUnmaskedContext(workInProgress, Component, false)
  const context = getMaskedContext(workInProgress, unmaskedContext)

  // prepareToReadContext(workInProgress, renderExpirationTime)
  const value: any = renderWithHooks(current, workInProgress, Component, props, context, renderExpirationTime)
  workInProgress.effectTag |= PerformedWork

  if (typeof value === 'object' && value !== null && typeof value.render === 'function' && value.$$typeof === null) {
    workInProgress.tag = ClassComponent

    // resetHooks() // hook操作
    const hasContext = false // 一波context的操作
    // if (isLegacyContextProvider(Component)) {
    //   hasContext = true
    //   pushLegacyContextProvider(workInProgress)
    // } else {
    //   hasContext = false
    // }

    workInProgress.memoizedState = isEmpty(value.state) ? null : value.state
    const { getDerivedStateFromProps } = Component
    if (isFunction(getDerivedStateFromProps)) {
      applyDerivedStateFromProps(workInProgress, getDerivedStateFromProps, props)
    }

    addOptionClassInstace(workInProgress, value)
    mountClassInstance(workInProgress, Component, props, renderExpirationTime)

    return finishClassComponent(null, workInProgress, Component, true, hasContext, renderExpirationTime)
  } else {
    workInProgress.tag = FunctionComponent
    mountChildFibers(workInProgress, null, value, renderExpirationTime)
  }
  return workInProgress.child
}

function mountLazyComponent(current: Fiber, workInProgress: Fiber, elementType: any, updateExpirationTime: ExpirationTime, renderExpirationTime: ExpirationTime): Fiber {
  if (current !== null) {
    current.alternate = null
    workInProgress.alternate = null
    workInProgress.effectTag |= Placement
  }

  const props = workInProgress.pendingProps
  const Component = readLazyComponentType(elementType)

  workInProgress.type = Component
  const resolvedTag = (workInProgress.tag = resolvedLazyComponentTag(Component))
  const resolvedProps = resolveDefaultProps(Component, props)

  let child: Fiber = null
  switch (resolvedTag) {
    case FunctionComponent:
      child = updateFunctionComponent(null, workInProgress, Component, resolvedProps, renderExpirationTime)
      break
    case ClassComponent:
      child = updateClassComponent(null, workInProgress, Component, resolvedProps, renderExpirationTime)
      break
    case ForwardRef:
      child = updateForwardRef(null, workInProgress, Component, resolvedProps, renderExpirationTime)
      break
    case MemoComponent:
      child = updateMemoComponent(null, workInProgress, Component, resolveDefaultProps(Component.type, resolvedProps), updateExpirationTime, renderExpirationTime)
      break
  }
  return child
}

function updateForwardRef(current: Fiber, workInProgress: Fiber, Component: any, nextProps: any, renderExpirationTime: ExpirationTime): Fiber {
  const { render } = Component
  const { ref } = workInProgress

  // context操作
  // prepareToReadContext(workInProgress, renderExpirationTime)

  const nextChildren = renderWithHooks(current, workInProgress, render, nextProps, ref, renderExpirationTime)

  if (current !== null && !didReceiveUpdate) {
    bailoutHooks(current, workInProgress, renderExpirationTime)
    return bailoutOnAlreadyFinishedWork(current, workInProgress, renderExpirationTime)
  }

  workInProgress.effectTag |= PerformedWork
  reconcileChildren(current, workInProgress, nextChildren, renderExpirationTime)
  return workInProgress.child
}

function updateMemoComponent(current: Fiber, workInProgress: Fiber, Component: any, nextProps: any, updateExpirationTime: ExpirationTime, renderExpirationTime: ExpirationTime): Fiber {
  if (current === null) {
    const { type } = Component

    if (isSimpleFunctionComponent(type) && Component.compare === null && Component.defaultProps === undefined) {
      workInProgress.tag = SimpleMemoComponent
      workInProgress.type = type

      return updateSimpleMemoComponent(current, workInProgress, type, nextProps, updateClassComponent, renderExpirationTime)
    }

    const child: Fiber = createFiberFromTypeAndProps(Component.type, null, nextProps, workInProgress.mode, renderExpirationTime)
    child.ref = workInProgress.ref
    child.return = workInProgress
    workInProgress.child = child

    return child
  }

  const currentChild: Fiber = current.child
  if (updateExpirationTime < renderExpirationTime) {
    const prevProps = currentChild.memoizedProps

    let compare: Function = Component.compare
    compare = compare !== null ? compare : shallowEqual

    if (compare(prevProps, nextProps) && current.ref === workInProgress.ref) {
      return bailoutOnAlreadyFinishedWork(current, workInProgress, renderExpirationTime)
    }
  }

  workInProgress.effectTag |= PerformedWork
  const newChild: Fiber = createWorkInProgress(current, nextProps)

  newChild.ref = workInProgress.ref
  newChild.return = workInProgress
  workInProgress.child = newChild

  return newChild
}

function updateSimpleMemoComponent(current: Fiber, workInProgress: Fiber, Component: any, nextProps: any, updateExpirationTime: ExpirationTime, renderExpirationTime: ExpirationTime): Fiber {
  if (current! == null) {
    const prevProps = current.memoizedProps
    if (shallowEqual(prevProps, nextProps) && current.ref === workInProgress.ref) {
      didReceiveUpdate = false

      if (updateExpirationTime < renderExpirationTime) {
        return bailoutOnAlreadyFinishedWork(current, workInProgress, renderExpirationTime)
      }
    }
  }
  return updateFunctionComponent(current, workInProgress, Component, nextProps, renderExpirationTime)
}

function updateFunctionComponent(current: Fiber, workInProgress: Fiber, Component: Function, nextProps: any, renderExpirationTime: ExpirationTime): Fiber {
  // context 操作
  // const unmaskedContext = getUnmaskedContext(workInProgress, Component, true)
  // const context = getMaskedContext(workInProgress, unmaskedContext)
  // prepareToReadContext(workInProgress, renderExpirationTime)

  let nextChildren: any = null

  nextChildren = renderWithHooks(current, workInProgress, Component, nextProps, null, renderExpirationTime)

  if (current !== null && !didReceiveUpdate) {
    bailoutHooks(current, workInProgress, renderExpirationTime)
    return bailoutOnAlreadyFinishedWork(current, workInProgress, renderExpirationTime)
  }

  workInProgress.effectTag |= PerformedWork
  reconcileChildren(current, workInProgress, nextChildren, renderExpirationTime)

  return workInProgress.child
}

function updateClassComponent(current: Fiber, workInProgress: Fiber, Component: any, nextProps: any, renderExpirationTime: ExpirationTime): Fiber {
  const hasContext: boolean = false  // context操作，待实现
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

function finishClassComponent(current: Fiber, workInProgress: Fiber, Component: any, shouldUpdate: boolean, hasContext: boolean, renderExpirationTime: ExpirationTime): Fiber {
  markRef(current, workInProgress)

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

function updateHostRoot(current: Fiber, workInProgress: Fiber, renderExpirationTime: ExpirationTime): Fiber {
  // pushHostRootContext(workInProgress) // context操作
  const { updateQueue } = workInProgress

  const nextProps = workInProgress.pendingProps
  const prevState = workInProgress.memoizedState
  const prevChildren = prevState === null ? prevState.element : null

  processUpdateQueue(workInProgress, updateQueue, nextProps, null, renderExpirationTime)
  const nextState = workInProgress.memoizedState
  const nextChildren = nextState.element

  if (prevChildren === nextChildren) {
    // resetHydrationState() // hydrate 待实现
    return bailoutOnAlreadyFinishedWork(current, workInProgress, renderExpirationTime)
  }

  const root: FiberRoot = workInProgress.stateNode
  if ((current === null || current.child === null) && root.hydrate) {//  &&enterHydrationState(workInProgress)) // 待实现
    workInProgress.effectTag |= Placement
    workInProgress.child = mountChildFibers(workInProgress, null, nextChildren, renderExpirationTime)
  } else {
    reconcileChildren(current, workInProgress, nextChildren, renderExpirationTime)
    // resetHydrationState() // hydrate 待实现
  }
  return workInProgress.child
}

function updateHostComponent(current: Fiber, workInProgress: Fiber, renderExpirationTime: ExpirationTime): Fiber {
  // pushHostContext(workInProgress)
  // if (current === null) {
  //   tryToClaimNextHydratableInstance(workInProgress)
  // }

  const type = workInProgress.type
  const nextProps = workInProgress.pendingProps
  const prevProps = current !== null ? current.pendingProps : null

  let nextChildren: any = nextProps.children
  const isDirectTextChild = shouldSetTextContent(type, nextProps)

  if (isDirectTextChild) {
    nextChildren = null // 如果是direct text，不用单独创建hostText fiber,直接在props中处理
  } else if (prevProps !== null && shouldSetTextContent(type, prevProps)) {
    workInProgress.effectTag |= ContentReset
  }

  markRef(current, workInProgress)

  if (renderExpirationTime !== Never && workInProgress.mode === ConcurrentMode && shouldDeprioritizeSubtree(type, nextProps)) {
    workInProgress.expirationTime = workInProgress.childExpirationTime = Never
    return null
  }

  reconcileChildren(current, workInProgress, nextChildren, renderExpirationTime)
  return workInProgress.child
}

function updateHostText(current: Fiber, workInProgress: Fiber, renderExpirationTime: ExpirationTime): Fiber {
  // if (current === null) { // hydrate操作
  //   tryToClaimNextHydratableInstance(workInProgress)
  // }
  return null
}

function updateSuspenseComponent(current: Fiber, workInProgress: Fiber, renderExpirationTime: ExpirationTime): Fiber {
  // 待实现
  return null
}

function updateFragment(current: Fiber, workInProgress: Fiber, renderExpirationTime: ExpirationTime): Fiber {
  const nextChildren = workInProgress.pendingProps
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
    case IncompleteClassComponent: {
      const { elementType } = workInProgress
      return mountIndeterminateComponent(current, workInProgress, elementType, renderExpirationTime)
    }
    case LazyComponent: {
      const { elementType } = workInProgress
      return mountLazyComponent(current, workInProgress, elementType, updateExpirationTime, renderExpirationTime)
    }
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
    case HostRoot:
      return updateHostRoot(current, workInProgress, renderExpirationTime)
    case HostComponent:
      return updateHostComponent(current, workInProgress, renderExpirationTime)
    case HostText:
      return updateHostText(current, workInProgress, renderExpirationTime)
    case SuspenseComponent:
      return updateSuspenseComponent(current, workInProgress, renderExpirationTime)
    // case HostPortal:
    //   return updatePortalComponent(current, workInProgress, renderExpirationTime)
    case ForwardRef: {
      const type = workInProgress.type
      const unresolvedProps = workInProgress.pendingProps
      const resolvedProps =
        workInProgress.elementType === type
          ? unresolvedProps
          : resolveDefaultProps(type, unresolvedProps)
      return updateForwardRef(
        current,
        workInProgress,
        type,
        resolvedProps,
        renderExpirationTime,
      )
    }
    case Fragment:
      return updateFragment(current, workInProgress, renderExpirationTime)
    // case Mode:
    //   return updateMode(current, workInProgress, renderExpirationTime)
    // case Profiler:
    //   return updateProfiler(current, workInProgress, renderExpirationTime)
    // case ContextProvider:
    // return updateContextProvider(current, workInProgress, renderExpirationTime)
    // case ContextConsumer:
    // return updateContextConsumer(current, workInProgress, renderExpirationTime)
    case MemoComponent: {
      const { type } = workInProgress
      const unresolvedProps = workInProgress.pendingProps

      let resolvedProps = resolveDefaultProps(type, unresolvedProps)
      resolvedProps = resolveDefaultProps(type.type, resolvedProps)
      return updateMemoComponent(current, workInProgress, type, resolvedProps, updateExpirationTime, renderExpirationTime)
    }
    case SimpleMemoComponent: {
      return updateSimpleMemoComponent(current, workInProgress, workInProgress.type, workInProgress.pendingProps, updateExpirationTime, renderExpirationTime)
    }
  }
}


export { beginWork }
