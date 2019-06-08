# 源码解析十七 异步渲染

上节说到了我们实现`requestIdleCallback`的`pollfill`，那么它是如何与`schedule`协同到一起的呢？

`react`在`requestIdleCallback`之上，又封装了一个`deferSchedule`，异步调度，都是基于这个模块实现的，它的实现类似于`requestIdleCallback`，暴露了一个启动和取消的函数以及一个是否过期的判断。

先看看启动函数

```javaScript
// 任务节点
export interface CallbackNode {
  previous: CallbackNode,
  next: CallbackNode,
  callback: Function,
  priorityLevel: number,
  expirationTime: number
}

const ImmediatePriority = 1
const IMMEDIATE_PRIORITY_TIMEOUT = -1

const UserBlockingPriority = 2
const USER_BLOCKING_PRIORITY = 250

const NormalPriority = 3
const NORMAL_PRIORITY_TIMEOUT = 5000

const LowPriority = 4
const LOW_PRIORITY_TIMEOUT = 10000

const IdlePriority = 5
const IDLE_PRIORITY = 1073741823

let currentPriorityLevel: number = NormalPriority

function scheduleDeferredCallback(callback: Function, options?: any): CallbackNode {
  const startTime = currentEventStartTime !== -1 ? currentEventStartTime : now()
  let expirationTime: number = 0

  if (isObject(options) && isNumber(options.timeout)) {
    expirationTime = startTime + options.timeout
  } else {
    switch (currentPriorityLevel) {
      case ImmediatePriority:
        expirationTime = startTime + IMMEDIATE_PRIORITY_TIMEOUT
        break
      case UserBlockingPriority:
        expirationTime = startTime + USER_BLOCKING_PRIORITY
        break
      case IdlePriority:
        expirationTime = startTime + IDLE_PRIORITY
        break
      case LowPriority:
        expirationTime = startTime + LOW_PRIORITY_TIMEOUT
        break
      case NormalPriority:
      default:
        expirationTime = startTime + NORMAL_PRIORITY_TIMEOUT
    }
  }

  const newNode: CallbackNode = {
    callback,
    priorityLevel: currentPriorityLevel,
    expirationTime,
    next: null,
    previous: null,
  }

  scheduleCallNode(newNode, expirationTime)
  return newNode
}
```

这里的`expirationTime`已经是转化过的过期时间，单位是`ms`，优先级则采用`priorityLevel`。先计算出当前的`expirationTime`，然后封装成一个任务节点`callBackNode`，随后调用`scheduleCallNode`

### scheduleCallNode

在`deferSchedule`中，