import { ExpirationTime, msToExpirationTime, Never, NoWork, Sync } from '../react-fiber/expiration-time'
import { FiberRoot } from '../react-fiber/fiber-root'
import { now } from '../utils/browser'

const isRendering: boolean = false
const originalStartTimeMs: number = now()

let currentRendererTime: ExpirationTime = msToExpirationTime(originalStartTimeMs)
let currentSchedulerTime: ExpirationTime = currentRendererTime

function recomputeCurrentRendererTime() {
  const currentTimeMs: number = now() - originalStartTimeMs
  currentRendererTime = msToExpirationTime(currentTimeMs)
}

let firstScheduledRoot: FiberRoot = null
let lastScheduledRoot: FiberRoot = null

let nextFlushedRoot: FiberRoot = null
let nextFlushedExpirationTime: ExpirationTime = NoWork

function findHighestPriorityRoot() {
  let highestPriorityWork: ExpirationTime = NoWork
  let highestPriorityRoot: FiberRoot = null

  if (lastScheduledRoot !== null) {
    let previousScheduledRoot: FiberRoot = lastScheduledRoot
    let root: FiberRoot = firstScheduledRoot

    // 遍历出一条需要scheduled的fiber-root链表
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

    nextFlushedRoot = highestPriorityRoot
    nextFlushedExpirationTime = highestPriorityWork
  }
}

function requestCurrentTime(): ExpirationTime {
  if (isRendering) {
    return currentRendererTime
  }

  findHighestPriorityRoot()

  if (nextFlushedExpirationTime === NoWork || nextFlushedExpirationTime === Never) {
    recomputeCurrentRendererTime()
    currentSchedulerTime = currentRendererTime
    return currentSchedulerTime
  }

  return currentSchedulerTime
}
