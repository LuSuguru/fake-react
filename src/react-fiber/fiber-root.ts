import { HostRoot } from '../react-type/tag-type'
import { NoContext } from '../react-type/work-type'
import { ExpirationTime, NoWork } from './expiration-time'
import { Fiber } from './fiber'

interface Batch {
  _defer: boolean,
  _expirationTime: ExpirationTime,
  _onComplete: Function,
  _next: Batch | null,
}

class FiberRoot {
  containerInfo: Element
  pendingChildren: any = null
  current: Fiber

  earliestSuspendedTime: ExpirationTime = NoWork
  latestSuspendedTime: ExpirationTime = NoWork

  earliestPendingTime: ExpirationTime = NoWork
  latestPendingTime: ExpirationTime = NoWork

  latestPingedTime: ExpirationTime = NoWork

  pingCache: any = null

  didError: boolean = false

  pendingCommitExpirationTime: ExpirationTime = NoWork

  finishedWork: Fiber = null

  timeoutHandle: number = -1

  context: Object = null
  pendingContext: Object = null

  hydrate: boolean

  nextExpirationTimeToWorkOn: ExpirationTime = NoWork
  expirationTime: ExpirationTime = NoWork

  firstBatch: Batch = null

  nextScheduledRoot: FiberRoot = null

  constructor(containerInfo: Element, hydrate: boolean) {
    this.current = new Fiber(HostRoot, null, null, NoContext)
    this.containerInfo = containerInfo
    this.hydrate = hydrate

    this.current.stateNode = this
  }
}

export { Batch, FiberRoot }
