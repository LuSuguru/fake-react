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

##### `dispatchAction`
`useState`和`useReducer`的第二个返回值都是`dispatchAction`的一个带参版，这个函数接受一个`action`，我们将其封装成一个`Update`对象
```javascript
    const currentTime = requestCurrentTime()
    const expirationTime = computeExpirationTimeForFiber(currentTime, fiber)
    const update: Update<S, A> = {
      expirationTime,
      action,
      eagerReducer: null,
      eagerState: null,
      next: null,
    }
```

之后，我们将其放到任务队列的队尾，这里的`updateQueue`不同于`Class Component`，采用的是环形链表

```javaScript
    const { last } = queue
    if (last === null) {
      update.next = update // 第一个update,创建环形链表
    } else {
      const first = last.next
      if (first !== null) {
        update.next = first
      }
      last.next = update
    }
    queue.last = update
```

`react`在这个函数的最后，做了一层优化。如在`setTimeout`等一些异步情况下触发了一个`dispatch`，由于在下一个事件循环，当前的`fiber`或许不在工作中，此时可以提前计算出`State`，减轻`update`时的负担

```javascript
  // 当前工作队列为空，在进入render阶段前提前计算下一个state，update时可以根据eagerReducer直接返回eagerState
    if (fiber.expirationTime === NoWork && (alternate === null || alternate.expirationTime === NoWork)) {
      const { eagerReducer } = queue

      if (eagerReducer !== null) {
        const currentState: S = queue.eagerState
        const eagerState = eagerReducer(currentState, action)

        // 存储提前计算的结果，如果在更新阶段reducer没有发生变化，可以直接使用eager state，不需要重新调用eager reducer在调用一遍
        update.eagerReducer = eagerReducer
        update.eagerState = eagerState

        if (Object.is(eagerState, currentState)) {
          return
        }
      }
    }
```

##### `updateReducer`
在`mount`阶段我们会生成一条`Hook`队列。放在`Fiber`的`memoizedState`上，当更新时，我们会依次取出当前队列头部的`Hook`，由于我们在编码时已经约束了`hook`的调用条件，所以取出时的顺序与我们`mount`插入时的顺序一定是一样的，调用`updateWorkInProgressHook`获取到当前的`Hook`对象

```javascript
function updateWorkInProgressHook(): Hook {
  if (nextWorkInProgressHook) {
    workInProgressHook = nextWorkInProgressHook
    nextWorkInProgressHook = workInProgressHook.next

    currentHook = nextCurrentHook
    nextCurrentHook = currentHook !== null ? currentHook.next : null
  } else {
    currentHook = nextCurrentHook

    const newHook: Hook = {
      memoizedState: currentHook.memoizedState,
      baseState: currentHook.baseState,
      queue: currentHook.queue,
      baseUpdate: currentHook.baseUpdate,
      next: null,
    }

    if (workInProgressHook === null) {
      workInProgressHook = firstWorkInProgressHook = newHook // 第一次
    } else {
      workInProgressHook = workInProgressHook.next = newHook // 插入链表中
    }
    nextCurrentHook = currentHook.next
  }
  return workInProgressHook
}
```

同样按照`fiber`的思路，`update`时统一使用`workInProgressHook`，如果没有`workInProgressHook`，会参照`currentHook`赋值一份`Hook`

整个`updateReducer`的部分很简单，类似于`class component`，遍历``找到优先级大于当前更新优先级的`update`，依次调用它们，直到







