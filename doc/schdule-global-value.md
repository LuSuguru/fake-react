# 源码解析五 `schedule`内的获取优先级
由上篇得知，每次发起一个任务调度时，都会经过三步，其中的1，3两步，都与整个调度器有关。可见，`schedule`是`fiber reconciler`的核心部分，因此它的代码量很大，逻辑也很复杂。

这里，我们先从`schedule`中的获取优先级开始，贴下代码：

``` javaScript
import { clearTimeout, noTimeout, now } from '../utils/browser'

const originalStartTimeMs: number = now()

let currentRendererTime: ExpirationTime = msToExpirationTime(originalStartTimeMs)
let currentSchedulerTime: ExpirationTime = currentRendererTime

function recomputeCurrentRendererTime(canUpdateSchedulerTime: boolean) {
  const currentTimeMs: number = now() - originalStartTimeMs
  currentRendererTime = msToExpirationTime(currentTimeMs)

  if (canUpdateSchedulerTime) {
    currentSchedulerTime = currentRendererTime
  }
}

function requestCurrentTime(): ExpirationTime {
  if (isRendering) {
    return currentSchedulerTime
  }

  findHighestPriorityRoot()

 // 若没有待调度 fiberRoot，更新currentSchedulerTime并返回
  if (nextFlushedExpirationTime === NoWork || nextFlushedExpirationTime === Never) {
    recomputeCurrentRendererTime(true)
    return currentSchedulerTime
  }

  return currentSchedulerTime
}
```

### currentRenderTime 和 currentSchedulerTime
在`schedule`里与`ExpirationTime`相关的全局变量有两个，其中，`currentRendererTime`是当前优先级，通过系统Api`performance.now()`获得。
竟然有了当前优先级，为何还需要一个`currentSchedulerTime`, 在`requestCurrentTime()`方法的开头，当`schedule`开始工作后，会把`isRendering`设为`true`，结束时在回到`false`，所以，`currentSchedulerTime`作用是确保整个调度过程中的当前优先级都是相同的。

```javaScript
  if (isRendering) {
    return currentSchedulerTime
  }
```

### `findHighestPriorityRoot()`
另外，上文说过，在`fiber reconciler`中，可以多次进行`ReactDOM.render()`，在schedule会维护一条环形链表，记录当前未调度的`FiberRoot`。`findHighestPriorityRoot()`的作用就是从链表中取出下个需要调度的`fiberRoot`及它的`expirationTime`，赋值给`nextFlushedRoot`和`nextFlushedExpirationtTime`

``` javaScript
// 一条未调度的 FiberRoot 链表
let firstScheduledRoot: FiberRoot = null
let lastScheduledRoot: FiberRoot = null

// 当前需要调度的 FiberRoot和其优先级
let nextFlushedRoot: FiberRoot = null 
let nextFlushedExpirationTime: ExpirationTime = NoWork 

// 遍历scheduleRoot 链表，清除掉已经完成调度的FiberRoot，找出当前优先级最高的 FiberRoot
function findHighestPriorityRoot() {
  let highestPriorityWork: ExpirationTime = NoWork
  let highestPriorityRoot: FiberRoot = null

  if (lastScheduledRoot !== null) {
    let previousScheduledRoot: FiberRoot = lastScheduledRoot
    let root: FiberRoot = firstScheduledRoot

    // 遍历出一条需要调度的fiber-root链表
    while (root !== null) {
      const remainingExpirationTime: ExpirationTime = root.expirationTime

      if (remainingExpirationTime === NoWork) {
        if (root === root.nextScheduledRoot) { // 整个链表只有一个fiber root
          root.nextScheduledRoot = null
          firstScheduledRoot = lastScheduledRoot = null
          break

        } else if (root === firstScheduledRoot) {
          const next = root.nextScheduledRoot
          firstScheduledRoot = next
          lastScheduledRoot.nextScheduledRoot = next
          root.nextScheduledRoot = null

        } else if (root === lastScheduledRoot) {
          lastScheduledRoot = previousScheduledRoot
          lastScheduledRoot.nextScheduledRoot = firstScheduledRoot
          root.nextScheduledRoot = null
          break

        } else {
          previousScheduledRoot.nextScheduledRoot = root.nextScheduledRoot
          root.nextScheduledRoot = null
        }

        root = previousScheduledRoot.nextScheduledRoot
      } else {
        if (remainingExpirationTime > highestPriorityWork) {
          highestPriorityWork = remainingExpirationTime
          highestPriorityRoot = root
        }

        if (root === lastScheduledRoot) {
          break
        }

        if (highestPriorityWork === Sync) {
          break // sync是最高级，直接退出
        }

        previousScheduledRoot = root
        root = root.nextScheduledRoot
      }
    }
  }
  nextFlushedRoot = highestPriorityRoot
  nextFlushedExpirationTime = highestPriorityWork
}
```

### `computeExpirationTimeForFiber()`
获取到当前的优先级后，就可以计算出当前 fiber 的`expirationTime`，








