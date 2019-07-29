# 事件触发

上节说到，会把 `dispatch()`绑定到原生`DOM`上，每次触发事件时，调用的都是`dispatch`函数

### `dispatch`
```javascript
function dispatchEvent(topLevelType: TopLevelType, nativeEvent: AnyNativeEvent) {
  if (!_enabled) {
    return
  }

  const nativeEventTarget = getEventTarget(nativeEvent)
  let targetInst: Fiber = getClosestInstanceFromNode(nativeEventTarget)

  if (targetInst !== null && isNumber(targetInst.tag) && !isFiberMounted(targetInst)) {
    targetInst = null
  }

  const bookKeeping = getTopLevelCallbackBookKeeping(topLevelType, nativeEvent, targetInst)

  try {
    batchedUpdates(handleTopLevel, bookKeeping)
  } catch (e) {
    console.error(e)
    releaseTopLevelCallbackBookKeeping(bookKeeping)
  }
}
```

先通过`event`对象拿到`target`和相应的`fiber`实例，然后封装成一个`bookKeeping`对象，这里同样使用了对象池来优化创建的过程，在`getTopLevelCallbackBookKeeping`中根据对象池的大小取出或者新建对象，在事件完成后`releaseTopLevelCallbackBookKeeping`释放对象并放回到事件池中

关键在于这里的`batchedUpdates`，这个函数位于`schedule`中，是`react`里实现异步`setState`的核心所在。在执行事件前，将`isBatchingUpdates`这个标志位设为了true。这个标志位在`requestWork`中有用到

```javascript
function requestWork(root: FiberRoot, expirationTime: ExpirationTime) {
  addRootToSchedule(root, expirationTime)
  if (isRendering) {
    return
  }

  if (isBatchingUpdates) {
    if (isUnbatchingUpdates) {
      nextFlushedRoot = root
      nextFlushedExpirationTime = Sync
      performWorkOnRoot(root, Sync, false)
    }
    return
  }

  if (expirationTime === Sync) {
    performSyncWork() // 同步
  } else {
    scheduleCallbackWithExpirationTime(expirationTime) // 异步
  }
}
```

回头看`requestWork`，如果`isBatchingUptes`为`true`的话，就直接`return`掉，不往下继续执行。一直到整个事件函数都执行完后，在`finally`中重启整个任务，所以如果在同一个事件监听函数中多次`setState`，则只是将它们放到`updateQueue`的末尾，并不会去执行调度，整个异步机制也是为了避免频繁`setState`带来的性能损坏

```javascript
function batchedUpdates<A, R>(fn: (a: A) => R, a: A): R {
  const previousIsBatchingUpdates = isBatchingUpdates
  isBatchingUpdates = true

  try {
    return fn(a)
  } finally {
    isBatchingUpdates = previousIsBatchingUpdates
    if (!isBatchingUpdates && !isRendering) {
      performSyncWork()
    }
  }
}
```

### 
