# 源码解析二十四 `hook`的具体实现
上节提到了`hook`的实现思路和本质，这节，我们就从源码角度来说说它具体的实现过程

### 入口
首先，在全局有一个当前的`hook dispatch`，我们调用的是`hook api`，其实只是它的一个分发过程

```javascript
const ReactCurrentDispatcher = {
  /**
   * @internal
   * @type {ReactComponent}
   */
  current: null as Dispatcher,
}

function resolveDispatcher(): any {
  const dispatcher = ReactCurrentDispatcher.current
  return dispatcher
}

function useState<S>(initialState: () => S | S) {
  const dispatcher = resolveDispatcher()
  return dispatcher.useState(initialState)
}

function useReducer<S, I, A>(reducer: (s: S, a: A) => S, initialArg: I, init?: (i: I) => S) {
  const dispatcher = resolveDispatcher()
  return dispatcher.useReducer(reducer, initialArg, init)
}
```

在真正的`hook`实现中，我们根据是`update`和`mount`对`ReactCurrentDispatcher`进行对应的赋值

```javascript
const HooksDispatcherOnMount: Dispatcher = {
  readContext,

  useState: State.mountState,
  useEffect: Effect.mountEffect,
  useContext: readContext,

  useReducer: Reducer.mountReducer,
  useCallback: Callback.mountCallback,
  useMemo: Memo.mountMemo,
  useRef: Ref.mountRef,
  useLayoutEffect: Effect.mountLayoutEffect,
}

const HooksDispatcherOnUpdate: Dispatcher = {
  readContext,

  useState: State.updateState,
  useEffect: Effect.updateEffect,
  useContext: readContext,

  useReducer: Reducer.updateReducer,
  useCallback: Callback.updateCallback,
  useMemo: Memo.updateMemo,
  useRef: Ref.updateRef,
  useLayoutEffect: Effect.updateLayoutEffect,
}
```

所以，即时我们每次都是调用`useState`，但是它在`mount`和`update`时是完全不同的逻辑

### `hook`中的全局变量
在整个`hook`模块中，`hook`中的全局变量确定我们在执行一个`FunctionComponent`时的上下文环境

```javascript
let renderExpirationTime: ExpirationTime = NoWork // 当前 fiber 的优先级
let currentlyRenderingFiber: Fiber = null // 当前的 fiber

let currentHook: Hook = null // 当前的 hook 指针
let nextCurrentHook: Hook = null // 下一个 hook

let firstWorkInProgressHook: Hook = null // workInProgress hook 队列头
let workInProgressHook: Hook = null  // 当前的 workInProgress hook 
let nextWorkInProgressHook: Hook = null // 下一个 workInProgress hook
```

### `renderWithHooks`
在`beginWork`中，`FunctionComponent`调的是`renderWithHooks`，所以下面我们就解析这个函数

- 首先对一些全局变量进行赋值，确保是最新的上下文环境。注意这里，从当前`fiber`的`memoizedState`上拿到`hook`队列。

- 然后调用`FunctionComponent`自身的`function`，获取子`fiber`

- 由于在调用组件自身函数的时候，可能会对`hook`里的值进行更新，所以之后，会把整个`hook`队列以及`updateQueue`重新挂载在`fiber`的`memoizedState`和`updateQueue`上

- 最后是清空全局变量的值

以下是具体的函数，下节将重点说说各个`hook`的实现

```javascript
function renderWithHooks(current: Fiber, workInProgress: Fiber, Component: Function, props: any, refOrContext: any, nextRenderExpirationTime: ExpirationTime): any {
  // 把当前的变量加入全局，更新上下文
  renderExpirationTime = nextRenderExpirationTime
  currentlyRenderingFiber = workInProgress
  nextCurrentHook = current !== null ? current.memoizedState : null

  ReactCurrentDispatcher.current = nextCurrentHook === null ? HooksDispatcherOnMount : HooksDispatcherOnUpdate

  let children: any = Component(props, refOrContext)
  ...
  ReactCurrentDispatcher.current = HooksDispatcherOnEmpty

  //  重新对 fiber 里关键的变量进行赋值
  currentlyRenderingFiber.memoizedState = firstWorkInProgressHook
  currentlyRenderingFiber.expirationTime = remainingExpirationTime
  currentlyRenderingFiber.updateQueue = componentUpdateQueue as any
  currentlyRenderingFiber.effectTag |= sideEffectTag

  // 全局变量置空
  renderExpirationTime = NoWork
  currentlyRenderingFiber = null

  currentHook = null
  nextCurrentHook = null

  firstWorkInProgressHook = null
  workInProgressHook = null
  nextWorkInProgressHook = null

  remainingExpirationTime = NoWork
  componentUpdateQueue = null
  sideEffectTag = 0

  return children
}
```

