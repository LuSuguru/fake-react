import { ExpirationTime, NoWork } from '../react-fiber/expiration-time'
import { FiberRoot } from '../react-fiber/fiber-root'

function findNextExpirationTimeToWorkOn(root: FiberRoot, completedExpiration: ExpirationTime) {
  const { earliestSuspendedTime, latestSuspendedTime, earliestPendingTime, latestPingedTime } = root

  let nextExpirationTimeToWorkOn: ExpirationTime = earliestPendingTime !== NoWork ? earliestPendingTime : latestPingedTime

  if (nextExpirationTimeToWorkOn === NoWork && (completedExpiration === NoWork || latestSuspendedTime < completedExpiration)) {
    nextExpirationTimeToWorkOn = latestSuspendedTime
  }

  let expirationTime = nextExpirationTimeToWorkOn
  if (expirationTime !== NoWork && earliestSuspendedTime > expirationTime) {
    expirationTime = earliestSuspendedTime
  }

  root.nextExpirationTimeToWorkOn = nextExpirationTimeToWorkOn
  root.expirationTime = expirationTime
}

function markPendingPriorityLevel(root: FiberRoot, expirationTime: ExpirationTime) {
  root.didError = false

  const { earliestPendingTime, latestPendingTime } = root

  if (earliestPendingTime === NoWork) {
    root.earliestPendingTime = root.latestPendingTime = expirationTime
  } else if (earliestPendingTime < expirationTime) {
    root.earliestPendingTime = expirationTime
  } else if (latestPendingTime > expirationTime) {
    root.latestPendingTime = expirationTime
  }

  findNextExpirationTimeToWorkOn(root, expirationTime)
}

function markCommittedPriorityLevels(root: FiberRoot, earliestRemainingTime: ExpirationTime) {
  const { earliestPendingTime, latestPendingTime, earliestSuspendedTime, latestSuspendedTime, latestPingedTime } = root
  root.didError = false


  if (earliestRemainingTime === NoWork) {
    root.earliestPendingTime = NoWork
    root.latestPendingTime = NoWork
    root.earliestSuspendedTime = NoWork
    root.latestSuspendedTime = NoWork
    root.latestPingedTime = NoWork
    findNextExpirationTimeToWorkOn(root, NoWork)
    return
  }

  if (earliestRemainingTime < latestPingedTime) {
    root.latestPingedTime = NoWork
  }

  if (latestPendingTime !== NoWork) {
    if (latestPendingTime > earliestRemainingTime) {
      // 刷新所有待处理的优先级
      root.earliestPendingTime = root.latestPendingTime = NoWork
    } else {
      if (earliestPendingTime > earliestRemainingTime) {
        // 最早的优先级已经刷新，所以需要指向最晚的优先级
        root.earliestPendingTime = root.latestPendingTime
      }
    }
  }

  if (earliestSuspendedTime === NoWork) {
    markPendingPriorityLevel(root, earliestRemainingTime)
    findNextExpirationTimeToWorkOn(root, NoWork)
    return
  }

  if (earliestRemainingTime < latestSuspendedTime) {
    root.earliestSuspendedTime = NoWork
    root.latestSuspendedTime = NoWork
    root.latestPingedTime = NoWork

    markPendingPriorityLevel(root, earliestRemainingTime)
    findNextExpirationTimeToWorkOn(root, NoWork)
  }

  if (earliestRemainingTime > earliestSuspendedTime) {
    markPendingPriorityLevel(root, earliestRemainingTime)
    findNextExpirationTimeToWorkOn(root, NoWork)
    return
  }

  findNextExpirationTimeToWorkOn(root, NoWork)
}

function didExpireAtExpirationTime(root: FiberRoot, currentTime: ExpirationTime) {
  const { expirationTime } = root
  if (expirationTime !== NoWork && currentTime <= expirationTime) {
    root.nextExpirationTimeToWorkOn = currentTime
  }
}

export {
  markPendingPriorityLevel,
  markCommittedPriorityLevels,
  didExpireAtExpirationTime,
}
