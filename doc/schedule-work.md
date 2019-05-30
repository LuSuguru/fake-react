# 源码解析八  `schedule`执行调度
在`requestWork`的结尾，如果是异步模式，会调用`performSyncWork`,同步的话会调用`scheduleCallbackWithExpirationTime`，这个函数牵涉到浏览器的异步模块，所以会和异步的一些时间切片及浏览器交互的原理后面单独开一节说，这里先跳过
它们最终都会调用`perfromWork`。直接看`performWork`，这是整个执行阶段的入口，同步异步的区别也只是传入参数的不同。关键在于两个大循环的判断。
先看看它们相同的部分，如果有下一个需要调度的任务且优先级大于超时优先级，就往下执行

```javaScript
  nextFlushedRoot !== null 
  && nextFlushedExpirationTime !== NoWork
  && minExpirationTime <= nextFlushedExpirationTime
```

异步，还多了两个判断
`shouldYield()`也是异步模块里的方法，用来判断时间切片是否到期，如果到期了返回`true`，未到期返回`false`
再看`currentRendererTime <= nextFlushedExpirationTime`，前面说过，优先级和到期时间是可以相互转化的，优先级越高的到期时间越小，这里我们用到期时间理解，下一个任务的到期时间已经小于当前时间。此时这个任务已经超时，需要立即执行

```javaScript
  && (currentRendererTime <= nextFlushedExpirationTime || !shouldYield()
```

大循环的里面，都是调用了`performWorkOnRoot`，将当前的任务作为参数传进去，关键在于第三个参数，在同步的时候传了`false`，说明此时是个同步任务，再看异步时，`currentRendererTime > nextFlushedExpirationTime`，超时情况下进来，这个值是`false`，当做同步任务处理

```javaScript
function performSyncWork() {
  performWork(Sync, false)
}

function performAsyncWork(didTimeout: boolean) {
  if (didTimeout) {
    // 当前已到期，更新优先级大于当前时间的 FiberRoot
    if (firstScheduledRoot !== null) {
      recomputeCurrentRendererTime(false)

      let root: FiberRoot = firstScheduledRoot
      do {
        didExpireAtExpirationTime(root, currentRendererTime)
        root = root.nextScheduledRoot
      } while (root !== firstScheduledRoot)
    }
  }
  performWork(NoWork, true)
}
/**
 * @param minExpirationTime 超时优先级，在一些优先级较高的事件中会传入，
 * @param isYieldy 是否异步
 */
function performWork(minExpirationTime: ExpirationTime, isYieldy: boolean) {
  // 拿到当前优先级最高的 FiberRoot，赋值 nextFlushedRoot 和 nextFlushedRoot
  findHighestPriorityRoot()

  if (isYieldy) { 
    // 重新获取当前优先级
    recomputeCurrentRendererTime(true)

    while (
      nextFlushedRoot !== null
      && nextFlushedExpirationTime !== NoWork
      && minExpirationTime <= nextFlushedExpirationTime
      && (currentRendererTime <= nextFlushedExpirationTime || !shouldYield())
    ) {
      performWorkOnRoot(nextFlushedRoot, nextFlushedExpirationTime, currentRendererTime > nextFlushedExpirationTime)

      // 查找下一个需要调度的任务
      findHighestPriorityRoot()
      recomputeCurrentRendererTime(true)
    }
  } else { 
    while (
      nextFlushedRoot !== null
      && nextFlushedExpirationTime
      && minExpirationTime <= nextFlushedExpirationTime
    ) {
      performWorkOnRoot(nextFlushedRoot, nextFlushedExpirationTime, false)
      // 查找下一个需要调度的任务
      findHighestPriorityRoot()
    }
  }

  // 清除异步的一些标
  if (isYieldy) {
    callbackExpirationTime = NoWork
    callbackID = null
  }

  // 如果还有任务没执行，直接异步开始执行
  if (nextFlushedExpirationTime !== NoWork) {
    scheduleCallbackWithExpirationTime(nextFlushedExpirationTime)
  }

  finishRendering()
}
```

### `performWorkOnRoot()`

整个任务的执行分为两个阶段，`render`和`commit`，
- `render`阶段是可以根据时间片，优先级控制是否执行还是暂停
- `commit`阶段是同步不可中断的
- `render`结束后会把处理后的`Fiber树`放到`FiberRoot`的`finishedWork`里，`commit`时使用

`performWorkOnRoot`这个函数的作用就是控制这两个阶段的进行，关键点也在于同步异步的处理上，异步时要多一步判断时间片是否够用，若不够了则跳过，下一帧在处理，另外，一旦进入整个函数，标志着已经开始处理任务，所以开始时会把`isRender`设为`true`

```javaScript
if (finishedWork !== null) {
  if (isYieldy) {
    if (!shouldYield()) {
      completeRoot(root, finishedWork, expirationTime)
    } else {
      root.finishedWork = finishedWork
    }
  } else {
    completeRoot(root, finishedWork, expirationTime)
  }
}
```

```javaScript
function performWorkOnRoot(root: FiberRoot, expirationTime: ExpirationTime, isYieldy: boolean) {
  isRendering = true

  let finishedWork: Fiber = root.finishedWork

  if (finishedWork !== null) {
    completeRoot(root, finishedWork, expirationTime)
  } else {
    root.finishedWork = null

    const { timeoutHandle } = root
    if (timeoutHandle !== noTimeout) {
      root.timeoutHandle = noTimeout
      clearTimeout(timeoutHandle)
    }

    renderRoot(root, isYieldy)
    finishedWork = root.finishedWork

    if (finishedWork !== null) {
      if (isYieldy) {
        if (!shouldYield()) {
          completeRoot(root, finishedWork, expirationTime)
        } else {
          root.finishedWork = finishedWork
        }
      } else {
        completeRoot(root, finishedWork, expirationTime)
      }
    }
  }

  isRendering = false
}
```
