# 源码解析二十七 `hook`与`re-render`
如果当前`FunctionComponent`正在`render`时，我们触发了`dispatch`。则会在当前`render`结束后在重新执行一次`render`，完全没必要再重新走一次完整的`dispatch`链路，这个过程我们称为`re-render`

那么这一切是如何实现的呢，首先，我们生成一个`map`用来存储这些需要`re-render`时需要的`update`，映射`queue`与任务队列。在`dispatch`中的逻辑如下

```javascript
function dispatchAction<S, A>(fiber: Fiber, queue: UpdateQueue<S, A>, action: A) {
  const { alternate } = fiber

  // 当前处于render状态
  if (fiber === currentlyRenderingFiber || (alternate !== null && alternate === currentlyRenderingFiber)) {
    didScheduleRenderPhaseUpdate = true // 触发re-render
    const update: Update<S, A> = {
      expirationTime: renderExpirationTime,
      action,
      eagerReducer: null,
      eagerState: null,
      next: null,
    }

    // 生成 queue 的映射队列
    if (renderPhaseUpdates === null) {
      renderPhaseUpdates = new Map()
    }

    // 放入 map
    const firstRenderPhaseUpdate = renderPhaseUpdates.get(queue)
    if (firstRenderPhaseUpdate === undefined) {
      renderPhaseUpdates.set(queue, update)
    } else {
      let lastRenderPhaseUpdate = firstRenderPhaseUpdate
      while (lastRenderPhaseUpdate.next !== null) {
        lastRenderPhaseUpdate = lastRenderPhaseUpdate.next
      }
      lastRenderPhaseUpdate.next = update
    }
  } else {
    ...
  }
}
```

在`renderWithHooks`中，判断`didScheduleRenderPhaseUpdate`是否需要触发`re-render`，如果需要`re-render`的话会把相应的全局变量重置，并再执行一次`component()`

```javaScript
function renderWithHooks(current: Fiber, workInProgress: Fiber, Component: Function, props: any, refOrContext: any, nextRenderExpirationTime: ExpirationTime): any {
  renderExpirationTime = nextRenderExpirationTime
  currentlyRenderingFiber = workInProgress
  nextCurrentHook = current !== null ? current.memoizedState : null

  ReactCurrentDispatcher.current = nextCurrentHook === null ? HooksDispatcherOnMount : HooksDispatcherOnUpdate

  let children: any = Component(props, refOrContext)

  if (didScheduleRenderPhaseUpdate) {
    do {
      didScheduleRenderPhaseUpdate = false
      numberOfReRenders += 1

      // 从链表头开始
      nextCurrentHook = current !== null ? current.memoizedState : null
      nextWorkInProgressHook = firstWorkInProgressHook

      currentHook = null
      workInProgressHook = null
      componentUpdateQueue = null

      children = Component(props, refOrContext)
    } while (didScheduleRenderPhaseUpdate)

    renderPhaseUpdates = null
    numberOfReRenders = 0
  }
  ...
}
```

最后，在`updateReducer`中，由于普通的`update`我们在第一次`render`中已全部处理过，所以我们只需要针对`map`中的`update`进行处理就好

```javascript
updateReducer<S, A>(reducer: (s: S, a: A) => S): [S, Dispatch<A>] {
  const hook = updateWorkInProgressHook()
  const { queue } = hook

  if (numberOfReRenders > 0) { // 处于re-render状态
    const { dispatch: _dispatch } = queue

    if (renderPhaseUpdates !== null) {
      const firstRenderPhaseUpdate = renderPhaseUpdates.get(queue)
      if (firstRenderPhaseUpdate !== undefined) {
        renderPhaseUpdates.delete(queue)

        let newState = hook.memoizedState
        let update = firstRenderPhaseUpdate
        do {
          const { action } = update
          newState = reducer(newState, action)
          update = update.next
        } while (update !== null)

        if (!Object.is(newState, hook.memoizedState)) { // 标记为更新
          markWorkInProgressReceivedUpdate()
        }

        hook.memoizedState = newState

        if (hook.baseUpdate === queue.last) {
          hook.baseState = newState
        }

        queue.eagerReducer = reducer
        queue.eagerState = newState

        return [newState, _dispatch]
      }
    }

    return [hook.memoizedState, _dispatch]
  }
  ...
}
```