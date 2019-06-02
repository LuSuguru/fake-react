#源码解析十  `beginWork`
整个[`beginWork`](../src/react-work/begin-work.ts)，可以分为两部分，先看第一部分

### 第一部分
这部分是对节点是否需要更新的判断：
- 新旧`props`是否相等
- 当前节点的优先级是否较低

```javaScript
let didReceiveUpdate: boolean = false // 是否需要更新的 flag
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
```

当优先级较低时，会直接返回`bailoutOnAlreadyFinishedWork`，跳过对这个节点的调和
这个函数主要是对子节点是否更新的判断，通过前面我们设置的`childExpirationTime`，如果子节点也不需要更新，则直接返回`null`，代表可以直接进入`complete`

```javaScript
function bailoutOnAlreadyFinishedWork(current: Fiber, workInProgress: Fiber, renderExpirationTime: ExpirationTime): Fiber {
  if (current !== null) {
    workInProgress.contextDependencies = current.contextDependencies
  }

  const { childExpirationTime } = workInProgress

  // 判断子树是否需要更新，不需要直接进入complete阶段
  if (childExpirationTime < renderExpirationTime) {
    return null
  } else {
    cloneChildFiber(workInProgress)
    return workInProgress.child
  }
}
```

除了优先级较低直接跳过，其他情况，都会对当前节点进行调和。所以会把`expirationTime`清空

### 第二部分
这部分非常简单，就是根据不同的节点类型，调用不同的调和函数，每个调和函数功能都差不多：
- 根据新的props,state更新其本身
- 有`Ref`打上`Ref`的标
- 生成子`workInprogress`并返回

```javaScript
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
```

具体的调和函数，可以直接看[源码](../src/react-work/begin-work.ts)，无非就是对props和state的一些处理

