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

在真正的`hook`实现，我们根据是`update`和`mount`对`ReactCurrentDispatcher`进行对应的赋值

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

### `hooks`中的全局变量
`hooks`中的全局变量确定我们在执行一个`function Component`时的上下文环境

```javascript
let currentHook: Hook = null // 当前的 hook 指针
let nextCurrentHook: Hook = null // 下一个 hook

let firstWorkInProgressHook: Hook = null 
let workInProgressHook: Hook = null
let nextWorkInProgressHook: Hook = null
```
