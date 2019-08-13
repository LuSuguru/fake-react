# 源码解析二十五 各个`hook`的实现

我们在函数式组件中会调用各种`hook`，这些`hook`或多或少都会使用官方的`api`，如`useState，useReducer，useEffect`等，这些官方的`api`便于我们操作状态，处理副作用，做缓存，做优化等等

上节提到，我们全局有一个`hook`的注册机，每次调用这些`api`其实最终都会通过注册机的分发走到真正的处理函数上

在渲染逻辑跟更新逻辑中，注册机上挂载的`hook`都是不相同的，所以对于每一个`hook api`，都有`渲染`跟`更新`两个函数

### `useState`
`useState`在渲染时调用的是`mountState`函数，在更新时调用的是`updateState`

```javascript
const State = {
  basicStateReducer<S>(state: S, action: BasicStateAction<S>): S {
    return isFunction(action) ? (action as Function)(state) : action
  },

  mountState<S>(initialState: (() => S) | S): [S, Dispatch<BasicStateAction<S>>] {
    if (isFunction(initialState)) {
      initialState = (initialState as Function)()
    }
    return Reducer.mountReducer(State.basicStateReducer, initialState)
  },

  updateState<S>(_initialState: (() => S) | S): [S, Dispatch<BasicStateAction<S>>] {
    return Reducer.updateReducer(State.basicStateReducer)
  },
}
```

可以看到，这两个函数只是在`Reducer`上又封装了一层，所以实现的关键还在`reducer`上

### `useReducer`
在`reducer`中，也存在着`mountReducer`与`updateReducer`函数，先从`mountReducer`分析起

##### `mountReducer`
在渲染阶段，我们先通过`mountWorkInProgressHook`创建了一个新的`Hook`对象，在创建的过程中，会把其插入当前`hook`队列的末尾。

由于每个`Hook`对象都是一个独立的更新单元，它有着自己的`state`和`updateQueue`，所以我们也会初始化掉这些变量，最后返回一个`dispathAction`的闭包

```javascript
  function mountWorkInProgressHook(): Hook {
    const hook: Hook = {
      memoizedState: null,
      baseState: null,
      baseUpdate: null,
      queue: null,
      next: null,
   }

   if (workInProgressHook === null) {
    firstWorkInProgressHook = workInProgressHook = hook // 第一次
   } else {
    workInProgressHook = workInProgressHook.next = hook // 插入链表中
   }
   return workInProgressHook
 }

  mountReducer<S, I, A>(reducer: (s: S, a: A) => S, initialArg: I, init?: (i: I) => S): [S, Dispatch<A>] {
    const hook: Hook = mountWorkInProgressHook()

    let initialState: S = null

    if (init !== undefined) {
      initialState = init(initialArg)
    } else {
      initialState = initialArg as any
    }

    hook.memoizedState = hook.baseState = initialState
    const queue = hook.queue = {
      last: null,
      dispatch: null,
      eagerReducer: reducer,
      eagerState: initialState,
    }

    const dispatch: Dispatch<A> = queue.dispatch = dispatchAction.bind(null, currentlyRenderingFiber, queue)

    return [hook.memoizedState, dispatch]
  }
```

##### `updateReducer`
在渲染阶段我们会生成一条`Hook`队列，放在`Fiber`的`memoizedState`上，当更新时，我们会依次取出当前队列头部的`Hook`，由于我们在编码时已经约束了`hook`的调用条件，所以取出时的顺序与我们当时插入时的顺序一定是一样的，







