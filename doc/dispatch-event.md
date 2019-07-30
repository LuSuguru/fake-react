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

### handleTopLevel 
由于事件函数中可能会操作`DOM`，导致与初始渲染时的节点缓存不一致，所以在进入核心逻辑之前，先构建一个关于`ancestor`数组，防止任何的嵌套组件导致的`bug`，构建完`ancestor`数组后，调用`runExtractedEventsInBatch`获取到合成事件对象`SyntheticEvent`

```javascript
function handleTopLevel(bookKeeping: BookKeeping) {
  let targetInst: Fiber = bookKeeping.targetInst
  let ancestor: Fiber = targetInst

  do {
    if (!ancestor) {
      bookKeeping.ancestors.push(ancestor)
      break
    }

    const root = findRootContainerNode(ancestor)

    if (!root) {
      break
    }

    bookKeeping.ancestors.push(ancestor)
    ancestor = getClosestInstanceFromNode(root)
  } while (ancestor)

  bookKeeping.ancestors.forEach((target: Fiber) => {
    targetInst = target

    runExtractedEventsInBatch(bookKeeping.topLevelType, targetInst, bookKeeping.nativeEvent, getEventTarget(bookKeeping.nativeEvent))
  })
}
```

### 获取`SyntheticEvent`
前面介绍`plugin`时提到，每个`plugin`都实现了自己的`extractEvents`函数，用于生成`SyntheticEvent`。所以，获取`SyntheticEvent`的过程就是遍历已经`inject`的`plugin`，调用它们各自的`extractEvents`拿到`SyntheticEvent`

### 冒泡、捕获处理
在获得`SyntheticEvent`的过程中，`plugin`的`extractEvents`都调用了`accumulateTwoPhaseDispatches`对冒泡、捕获做了处理，如图


```javascript
function accumulateTwoPhaseDispatches(events: SyntheticEvent) {
  function callback(event: SyntheticEvent) {
    if (event && event.dispatchConfig.phasedRegistrationNames) {
      traverseTwoPhase(event._targetInst, accumulateDirectionalDispatches, event) // 捕获和冒泡
    }
  }

  forEachAccumulated(events, callback)
}

export function traverseTwoPhase(inst: Fiber, fn: Function, arg: SyntheticEvent) {
  const path = []
  while (inst) {
    path.push(inst)
    inst = getParent(inst)
  }

  let i: number
  for (i = path.length; i-- > 0;) {
    fn(path[i], 'captured', arg)
  }
  for (i = 0; i < path.length; i++) {
    fn(path[i], 'bubbled', arg)
  }
}
```


在`traverseTwoPhase`中对当前`fiber`往上遍历直到`fiberRoot`，按照 捕获->冒泡 的顺序对某个`fiber`调用`accumulateDirectionalDispatches`

```javascript
function accumulateDirectionalDispatches(inst: Fiber, phase: Phases, event: SyntheticEvent) {
  const listener = listenAtPhase(inst, event, phase)

  if (listener) {
    event._dispatchListeners = accumulateInto(event._dispatchListeners, listener)
    event._dispatchInstances = accumulateInto(event._dispatchInstances, inst)
  }
}
```

在这个函数中，根据传入的参数，拿到`fiber props`的事件处理函数，






