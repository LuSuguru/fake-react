# 源码解析二十六 `useEffect`与`useLayoutEffect`

`useEffect`与`useLayoutEffect`都用于我们在`FunctionComponent`中处理副作用，当我们依赖项发生变化时，注册的函数就会触发，那么，它是如何实现的呢？

由于两个`effect`也是`hook`，所以，它们也遵循`hook`的玩法
- 在`mount`时调用`mountWorkInProgressHook`生成`hook`，将需要的信息存入`hook`中
- 在`update`时调用`updateWorkInProgressHook`取出`hook`，对`deps`进行比较，如果变化了，更新`hook`的内容

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

这一部分跟前面大体相同，就不细说了，关键在于`pushEffect`，在`hook`的模块中，还维护了一个`componentUpdateQueue`全局变量，它相当于副作用的一个任务队列，每次调用`pushEffect`时，会生成一个`Effect`对象，然后插入到`componenctUpdateQueue`的队尾，

```javascript
interface Effect {
  tag: HookEffectTag, // 标志
  create: () => (() => void), // 副作用创建的函数
  destroy: (() => void), // 副作用取消的函数
  deps: any[], // 依赖项
  next: Effect,
}
```