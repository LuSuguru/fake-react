import { ExpirationTime, NoWork } from './expiration-time'

type Batch = {
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
    this.current = new Fiber(HostRoot)
    this.containerInfo = containerInfo
    this.hydrate = hydrate
  }
}

export { Batch, FiberRoot }