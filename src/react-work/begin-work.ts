import { calculateChangedBits, prepareToReadContext, propagateContextChange, pushProvider, ReactContext, readContext } from '../react-context/fiber-context'
import { pushHostContainer, pushHostContext } from '../react-context/host-context'
import { addOptionClassInstace, applyDerivedStateFromProps, constructClassInstance, mountClassInstance, resumeMountClassInstance, updateClassInstance } from '../react-fiber/class-component'
import { ExpirationTime, Never, NoWork } from '../react-fiber/expiration-time'
import { createFiberFromTypeAndProps, createWorkInProgress, Fiber, isSimpleFunctionComponent } from '../react-fiber/fiber'
import { readLazyComponentType, resolveDefaultProps, resolvedLazyComponentTag } from '../react-fiber/lazy-component'
import { bailoutHooks, renderWithHooks, resetHooks } from '../react-hook/fiber-hook'
import { ContentReset, DidCapture, NoEffect, PerformedWork, Placement, Ref } from '../react-type/effect-type'
import {
  ClassComponent,
  ContextConsumer,
  ContextProvider,
  ForwardRef,
  Fragment,
  FunctionComponent,
  HostComponent,
  HostPortal,
  HostRoot,
  HostText,
  IndeterminateComponent,
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

let didReceiveUpdate: boolean = false // 是否需要更新的 flag
function markWorkInProgressReceivedUpdate() {
  didReceiveUpdate = true
}

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

  const { childExpirationTime } = workInProgress

  // 判断子树是否需要更新，不需要直接进入complete阶段，直接跳过
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


  prepareToReadContext(workInProgress, renderExpirationTime)
  const value: any = renderWithHooks(current, workInProgress, Component, props, null, renderExpirationTime)
  workInProgress.effectTag |= PerformedWork

  if (typeof value === 'object' && value !== null && typeof value.render === 'function' && value.$$typeof === null) {
    workInProgress.tag = ClassComponent

    resetHooks()

    workInProgress.memoizedState = isEmpty(value.state) ? null : value.state
    const { getDerivedStateFromProps } = Component
    if (isFunction(getDerivedStateFromProps)) {
      applyDerivedStateFromProps(workInProgress, getDerivedStateFromProps, props)
    }

    addOptionClassInstace(workInProgress, value)
    mountClassInstance(workInProgress, Component, props, renderExpirationTime)

    return finishClassComponent(null, workInProgress, Component, true, renderExpirationTime)
  } else {
    workInProgress.tag = FunctionComponent
    workInProgress.child = mountChildFibers(workInProgress, null, value, renderExpirationTime)
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

  prepareToReadContext(workInProgress, renderExpirationTime)

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

      return updateSimpleMemoComponent(current, workInProgress, type, nextProps, updateExpirationTime, renderExpirationTime)
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
  if (current !== null) {
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
  prepareToReadContext(workInProgress, renderExpirationTime)

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
  prepareToReadContext(workInProgress, renderExpirationTime)

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

  const nextUnitWork = finishClassComponent(current, workInProgress, Component, shouldUpdate, renderExpirationTime)
  return nextUnitWork
}

function finishClassComponent(current: Fiber, workInProgress: Fiber, Component: any, shouldUpdate: boolean, renderExpirationTime: ExpirationTime): Fiber {
  markRef(current, workInProgress)

  const didCaptureError = (workInProgress.effectTag & DidCapture) !== NoEffect
  if (!shouldUpdate && !didCaptureError) {
    return bailoutOnAlreadyFinishedWork(current, workInProgress, renderExpirationTime)
  }

  const { stateNode: instance } = workInProgress

  let nextChildren: any = null

  if (didCaptureError && !isFunction(Component.getDerivedStateFromError)) {
    nextChildren = null
  } else {
    nextChildren = instance.render()
  }

  workInProgress.effectTag |= PerformedWork
  if (current !== null && didCaptureError) { // 错误情况下不复用现有的children
    workInProgress.child = reconcileChildFibers(workInProgress, current.child, null, renderExpirationTime) // 删除当前存在的children
    workInProgress.child = reconcileChildFibers(workInProgress, null, nextChildren, renderExpirationTime) // 重新生成新的children
  } else {
    reconcileChildren(current, workInProgress, nextChildren, renderExpirationTime)
  }

  workInProgress.memoizedState = instance.state
  return workInProgress.child
}

function updateHostRoot(current: Fiber, workInProgress: Fiber, renderExpirationTime: ExpirationTime): Fiber {
  pushHostContainer(workInProgress, workInProgress.stateNode.containerInfo)
  const { updateQueue } = workInProgress

  const nextProps = workInProgress.pendingProps
  const prevState = workInProgress.memoizedState
  const prevChildren = prevState !== null ? prevState.element : null

  processUpdateQueue(workInProgress, updateQueue, nextProps, null, renderExpirationTime)
  const nextState = workInProgress.memoizedState
  const nextChildren = nextState.element

  if (prevChildren === nextChildren) {
    return bailoutOnAlreadyFinishedWork(current, workInProgress, renderExpirationTime)
  }

  reconcileChildren(current, workInProgress, nextChildren, renderExpirationTime)
  return workInProgress.child
}

function updateHostComponent(current: Fiber, workInProgress: Fiber, renderExpirationTime: ExpirationTime): Fiber {
  pushHostContext(workInProgress)

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

function updateHostText(_current: Fiber, _workInProgress: Fiber): Fiber {
  return null
}

function updateSuspenseComponent(current: Fiber, workInProgress: Fiber, renderExpirationTime: ExpirationTime): Fiber {
  // 待实现
  return null
}

function updatePortalComponent(current: Fiber, workInProgress: Fiber, renderExpirationTime: ExpirationTime): Fiber {
  pushHostContainer(workInProgress, workInProgress.stateNode.containerInfo)
  const nextChildren = workInProgress.pendingProps

  if (current === null) {
    // portal比较特殊，它只会在提交阶段才能append child
    workInProgress.child = reconcileChildFibers(workInProgress, null, nextChildren, renderExpirationTime)
  } else {
    reconcileChildren(current, workInProgress, nextChildren, renderExpirationTime)
  }

  return workInProgress.child
}

function updateFragment(current: Fiber, workInProgress: Fiber, renderExpirationTime: ExpirationTime): Fiber {
  const nextChildren = workInProgress.pendingProps
  reconcileChildren(current, workInProgress, nextChildren, renderExpirationTime)
  return workInProgress.child
}

function updateContextProvider(current: Fiber, workInProgress: Fiber, renderExpirationTime: ExpirationTime): Fiber {
  const providerType = workInProgress.type
  const context = providerType._context

  const oldProps = workInProgress.pendingProps
  const newProps = workInProgress.memoizedProps

  const newValue = newProps.value

  pushProvider(workInProgress, newValue)

  if (oldProps !== null) {
    const oldValue = oldProps.value
    const changedBits = calculateChangedBits(context, newValue, oldValue)

    if (changedBits === 0 && oldProps.children === newProps.children) {
      return bailoutOnAlreadyFinishedWork(current, workInProgress, renderExpirationTime)
    } else {
      propagateContextChange(workInProgress, context, changedBits, renderExpirationTime)
    }
  }

  const newChildren = newProps.children
  reconcileChildren(current, workInProgress, newChildren, renderExpirationTime)
  return workInProgress.child
}

function updateContextConsumer(current: Fiber, workInProgress: Fiber, renderExpirationTime: ExpirationTime): Fiber {
  const context: ReactContext<any> = workInProgress.type

  const newProps = workInProgress.pendingProps
  const render = newProps.children

  prepareToReadContext(workInProgress, renderExpirationTime)
  const newValue = readContext(context, newProps.unstable_observedBits)
  const newChildren = render(newValue)

  workInProgress.effectTag |= PerformedWork
  reconcileChildren(current, workInProgress, newChildren, renderExpirationTime)
  return workInProgress.child
}

function beginWork(current: Fiber, workInProgress: Fiber, renderExpirationTime: ExpirationTime): Fiber {
  const updateExpirationTime = workInProgress.expirationTime

  // 判断是否需要更新，不需要的话直接跳过
  if (current !== null) {
    const oldProps = current.memoizedProps
    const newProps = workInProgress.pendingProps

    // 新旧 props 是否相等
    if (oldProps !== newProps) {
      didReceiveUpdate = true
      // 优先级是否较低
    } else if (updateExpirationTime < renderExpirationTime) {
      didReceiveUpdate = false

      // 插入上下文
      switch (workInProgress.tag) {
        case HostRoot:
          pushHostContainer(workInProgress, workInProgress.stateNode.containerInfo)
          break
        case HostComponent:
          pushHostContext(workInProgress)
          break
        case HostPortal:
          pushHostContainer(workInProgress, workInProgress.stateNode.containerInfo)
          break
        case ContextProvider:
          pushProvider(workInProgress, workInProgress.memoizedProps.value)
          break
        case SuspenseComponent: {
          // 待实现
        }
        default:
          break
      }
      return bailoutOnAlreadyFinishedWork(current, workInProgress, renderExpirationTime)
    }
  } else {
    didReceiveUpdate = false
  }

  workInProgress.expirationTime = NoWork // 将当前 fiber 的更新时间清零

  switch (workInProgress.tag) {
    case IndeterminateComponent: {
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
      return updateHostText(current, workInProgress)
    case SuspenseComponent:
      return updateSuspenseComponent(current, workInProgress, renderExpirationTime)
    case HostPortal:
      return updatePortalComponent(current, workInProgress, renderExpirationTime)
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
    case ContextProvider:
      return updateContextProvider(current, workInProgress, renderExpirationTime)
    case ContextConsumer:
      return updateContextConsumer(current, workInProgress, renderExpirationTime)
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

export {
  markWorkInProgressReceivedUpdate,
  beginWork,
}
