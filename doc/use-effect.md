# 源码解析二十六 `useEffect`与`useLayoutEffect`

`useEffect`与`useLayoutEffect`都用于我们在`FunctionComponent`中处理副作用，当我们依赖项发生变化时，注册的函数就会在相应的时机被触发，那么，它是如何实现的呢？

由于两个`effect`也是`hook`，所以，它们也遵循`hook`的玩法
- 在`mount`时调用`mountWorkInProgressHook`生成`hook`，将需要的信息存入`hook`中
- 在`update`时调用`updateWorkInProgressHook`取出`hook`，对`deps`进行比较，如果变化了，更新`hook`的内容

这两个函数都会给`sideEffectTag`打上`Update`的tag`，`sideEffectTag`最终会赋值给`fiber`的`effectTag`上，这里打上了`Update`的`Tag`，相当于告诉了`schedule`这个`Fiber`有更新操作

除了给`Fiber`打上`tag`外，这里还会给`effect`打上自己的`tag`，这个`tag`真正决定了当前`effect`的调用时机，`useEffect`与`useLayoutEffect`唯一的区别也就是这个标志位的不同

```javascript
  mountEffectImpl(fiberEffectTag: SideEffectTag, hookEffectTag: HookEffectTag, create: () => (() => void), deps?: any[]) {
    const hook = mountWorkInProgressHook()
    const nextDeps = deps === undefined ? null : deps
    sideEffectTag |= fiberEffectTag

    hook.memoizedState = Effect.pushEffect(hookEffectTag, create, undefined, nextDeps)
  },

  updateEffectImpl(fiberEffectTag: SideEffectTag, hookEffectTag: HookEffectTag, create: () => (() => void), deps?: any[]) {
    const hook = updateWorkInProgressHook()
    const nextDeps = deps === undefined ? null : deps
    let destroy: any

    if (currentHook !== null) {
      const prevEffect: Effect = currentHook.memoizedState
      destroy = prevEffect.destroy

      if (nextDeps !== null) {
        const prevDeps = prevEffect.deps
        if (areHookInputsEqual(nextDeps, prevDeps)) {
          Effect.pushEffect(NoHookEffect, create, destroy, nextDeps)
          return
        }
      }
    }

    sideEffectTag |= fiberEffectTag
    hook.memoizedState = Effect.pushEffect(hookEffectTag, create, destroy, nextDeps)
  },

  mountEffect(create: () => (() => void), deps?: any[]) {
    return Effect.mountEffectImpl(UpdateTag | Passive, UnmountPassive | MountPassive, create, deps)
  },

  updateEffect(create: () => (() => void), deps?: any[]) {
    return Effect.updateEffectImpl(UpdateTag | Passive, UnmountPassive | MountPassive, create, deps)
  },
  mountLayoutEffect(create: () => (() => void), deps?: any[]) {
    return Effect.mountEffectImpl(UpdateTag, UnmountMutation | MountLayout, create, deps)
  },

  updateLayoutEffect(create: () => (() => void), deps?: any[]) {
    return Effect.updateEffectImpl(UpdateTag, UnmountMutation | MountLayout, create, deps)
  }
```

这一部分跟前面大体相同，就不细说了。关键在于`pushEffect`，在`hook`的模块中，还维护了一个`componentUpdateQueue`全局变量，它相当于副作用的一个任务队列，每次调用`pushEffect`时，会生成一个`Effect`对象，然后插入到`componenctUpdateQueue`的队尾，这个队列最终会放到`Fiber`的`updateQueue`中，这时，`effect`在`hook`中的逻辑就走完了

```javascript
interface Effect {
  tag: HookEffectTag, // 标志
  create: () => (() => void), // 副作用创建的函数
  destroy: (() => void), // 副作用取消的函数
  deps: any[], // 依赖项
  next: Effect,
}

pushEffect(tag: HookEffectTag, create: () => (() => void), destroy: (() => void), deps?: any[]) {
  const effect: Effect = { tag, create, destroy, deps, next: null }

  if (componentUpdateQueue === null) {
    componentUpdateQueue = { lastEffect: null }
    componentUpdateQueue.lastEffect = effect.next = effect
  } else {
    const { lastEffect } = componentUpdateQueue
    if (lastEffect === null) {
      componentUpdateQueue.lastEffect = effect.next = effect
    } else {
      const firstEffect: Effect = lastEffect.next
      lastEffect.next = effect
      effect.next = firstEffect
      componentUpdateQueue.lastEffect = effect
    }
  }
  return effect
}
```

### `effect`的执行时机 
在`commit`阶段时，会对`FunctionComponent`中的`updateQueue`进行处理，它主要分为三步：
- 取出`fiber`中的`updateQueue`，即副作用队列
- 遍历副作用队列，对每一个`effect`，若等于传入的`unMountTag`，则调用`destroy`，若等于传入的`mountTag`，则调用`create`

```javascript
// hook side effect 的处理
function commitHookEffectList(unMountTag: HookEffectTag, mountTag: HookEffectTag, finishedWork: Fiber) {
  const updateQueue: FunctionComponentUpdateQueue = finishedWork.updateQueue as any
  const lastEffect: HookEffect = updateQueue !== null ? updateQueue.lastEffect : null

  if (lastEffect !== null) {
    const firstEffect: HookEffect = lastEffect.next
    let effect: HookEffect = firstEffect
    do {
      if ((effect.tag & unMountTag) !== NoHookEffect) {
        const { destroy } = effect

        effect.destroy = undefined
        if (destroy !== undefined) {
          (destroy as Function)()
        }
      }

      if ((effect.tag & mountTag) !== NoHookEffect) {
        const { create } = effect
        effect.create = create() as any
      }
      effect = effect.next
    } while (effect !== firstEffect)
  }
}
```

在回头看整个`commit`模块，在`commitWork`与`commitLifeCycle`中，都有`commitHookEffectList`的调用

在`commitWork`中，主要是跟`UnmountMutation`，`MountMutation`相关，在我们

```javascript
function commitWork(_current: Fiber, finishedWork: Fiber) {
  switch (finishedWork.tag) {
    case FunctionComponent:
    case ForwardRef:
    case MemoComponent:
    case SuspenseComponent: {
      commitHookEffectList(UnmountMutation, MountMutation, finishedWork)
      return
    }
    ...
  }
}

function commitLifeCycles(current: Fiber, finishedWork: Fiber) {
  switch (finishedWork.tag) {
    case FunctionComponent:
    case ForwardRef:
    case SimpleMemoComponent:
      commitHookEffectList(UnmountLayout, MountLayout, finishedWork)
      break
      ...
  }
}
```

