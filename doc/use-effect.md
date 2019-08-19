# 源码解析二十六 `useEffect`与`useLayoutEffect`

`useEffect`与`useLayoutEffect`都用于我们在`FunctionComponent`中处理副作用，当我们依赖项发生变化时，注册的函数就会在相应的时机被触发，那么，它是如何实现的呢？

由于两个`effect`也是`hook`，所以，它们也遵循`hook`的玩法
- 在`mount`时调用`mountWorkInProgressHook`生成`hook`，将需要的信息存入`hook`中
- 在`update`时调用`updateWorkInProgressHook`取出`hook`，对`deps`进行比较，如果变化了，更新`hook`的内容

这两个函数都会给`sideEffectTag`打上`Update`的`tag`，`sideEffectTag`最终会赋值给`fiber`的`effectTag`上，这里打上了`Update`的`Tag`，相当于告诉了`schedule`这个`Fiber`有更新操作

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
在触发`effect`时，我们会给`Fiber`打上`Update`的标记，这个标记会在`commit`阶段被处理，执行相应的`commit`逻辑。所以，我们的`effect`会在`commit`阶段被执行，那么，`React`又是如何区分不同`effect`的调用时机呢，这时，`effect`上的`Tag`就发挥了作用

在`commit`阶段，会对`FunctionComponent`中的`updateQueue`进行处理，它主要分为三步：
- 取出`fiber`中的`updateQueue`，即副作用队列
- 遍历副作用队列，对每一个`effect`，若等于传入的`unMountTag`，则调用`destroy`，若等于传入的`mountTag`，则调用`create`
- 在不同的`commit`函数中。调用`commitHookEffectList`并传入不同的`Tag`，就可以区分不同的`effect`与调用时机

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
        effect.destroy = create() as any
      }
      effect = effect.next
    } while (effect !== firstEffect)
  }
}
```

在回头看整个`commit`模块，在`commitWork`与`commitLifeCycle`中，都有`commitHookEffectList`的调用

在`commitWork`中，主要是跟`UnmountMutation`，`MountMutation`相关
在`commitLifeCycles`中，主要跟`UnMountLayout`与`MountLayout`相关

而我们的`layoutEffect`，就打上了`UnmountMutation`与`MountLayout`的标记，所以，`layoutEffect`的执行时机就很清晰了，在`commitWork`中执行`destroy`，在`commitLifeCycles`中执行`create`

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

在回头看`effect`，它的两个标记位为`UnMountPassive`与`MountPassive`，在`commit`模块中，只有在`commitPassiveHookEffects`中触发了这两个`Tag`

```javascript
function commitPassiveEffects(root: FiberRoot, firstEffect: Fiber) {
  rootWithPendingPassiveEffects = null
  passiveEffectCallbackHandle = null
  passiveEffectCallback = null

  const previousIsRendering = isRendering
  isRendering = true

  let effect = firstEffect
  do {
    if (effect.effectTag & Passive) {
      let didError: boolean = false
      let error: Error

      try {
        commitPassiveHookEffects(effect)
      } catch (e) {
        didError = true
        error = e
        console.error(error)
      }

      if (didError) {
        // captureCommitPhaseError(effect, error)
      }
    }

    effect = effect.nextEffect
  } while (effect !== null)

  isRendering = previousIsRendering

  // 由于在新的事件循环，如果有需要，重新触发`work`
  const rootExpirationTime = root.expirationTime
  if (rootExpirationTime !== NoWork) {
    requestWork(root, rootExpirationTime)
  }

  if (!isBatchingUpdates && !isRendering) {
    performSyncWork()
  }
}

function commitPassiveHookEffects(finishedWork: Fiber) {
  commitHookEffectList(UnmountPassive, NoHookEffect, finishedWork)
  commitHookEffectList(NoHookEffect, MountPassive, finishedWork)
}
```

`commitPassiveHookEffects`的`逻辑`与其他`commit`都差不多，但是它的执行时机比较特殊，它不在当前`commit`阶段触发，而是放在下一个事件循环，通过我们封装的`scheduleDeferredCallback`。所以，`useEffect`的执行整个是异步的，不影响当前`DOM`渲染

```javascript
// useEffect 放到下一个 event loop 调用
if (firstEffect !== null && rootWithPendingPassiveEffects !== null) {
  const callback = commitPassiveEffects.bind(null, root, firstEffect)
  passiveEffectCallbackHandle = scheduleDeferredCallback(callback)
  passiveEffectCallback = callback
}
```

整个`effect`的执行就是这样子。充分利用了当前`fiber`的调度，打上标记位，在相应的时机执行，唯一需要注意的就是`useLayoutEffect`与`useEffect`的区别

- `useLayoutEffect`是同步的，在当前的`commit`阶段执行
- `useEffect`是异步的，在下一个事件循环执行




