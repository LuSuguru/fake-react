import { HostRoot } from '../react-type/tag-type'
import { ConcurrentMode, NoContext } from '../react-type/work-type'
import { noTimeout } from '../utils/browser'
import { ExpirationTime, NoWork } from './expiration-time'
import { Fiber } from './fiber'

interface Batch {
  _defer: boolean,
  _expirationTime: ExpirationTime,
  _onComplete: Function,
  _next: Batch | null,
}

class FiberRoot {
  containerInfo: Element  // 容器节点

  /** 当前根节点的 fiber */
  current: Fiber

  // 最晚和最新的被挂起的任务的优先级
  earliestSuspendedTime: ExpirationTime = NoWork
  latestSuspendedTime: ExpirationTime = NoWork

  // 最晚和最新的不确定是否挂起的任务的优先级
  earliestPendingTime: ExpirationTime = NoWork
  latestPendingTime: ExpirationTime = NoWork

  // 最新的通过一个promise被reslove并且可以重新尝试的优先级
  latestPingedTime: ExpirationTime = NoWork

  didError: boolean = false

  // 等待提交的优先级
  pendingCommitExpirationTime: ExpirationTime = NoWork

  // 完成render后的 fiber 树
  finishedWork: Fiber = null

  // 挂起任务的timeout 标志位
  timeoutHandle: number = noTimeout

  // 下一个 work 的优先级与当前优先级
  nextExpirationTimeToWorkOn: ExpirationTime = NoWork
  expirationTime: ExpirationTime = NoWork

  firstBatch: Batch = null

  /** 下一个需要调度的 root */
  nextScheduledRoot: FiberRoot = null

  constructor(containerInfo: Element, isConcurrent: boolean) {
    const mode = isConcurrent ? ConcurrentMode : NoContext

    this.current = new Fiber(HostRoot, null, null, mode)
    this.containerInfo = containerInfo
    this.current.stateNode = this
  }
}

export { Batch, FiberRoot }
