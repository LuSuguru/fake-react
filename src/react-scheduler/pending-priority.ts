import { ExpirationTime, NoWork } from '../react-fiber/expiration-time'
import { FiberRoot } from '../react-fiber/fiber-root'

function findNextExpirationTimeToWorkOn(root: FiberRoot, completedExpiration: ExpirationTime) {
  const { earliestPendingTime, earliestSuspendedTime, latestSuspendedTime, latestPingedTime } = root

  let nextExpirationTimeToWorkOn: ExpirationTime =
    earliestPendingTime !== NoWork ? earliestPendingTime : latestPingedTime
  if (nextExpirationTimeToWorkOn === NoWork &&
    (completedExpiration === NoWork || latestSuspendedTime < completedExpiration)) {
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
  } else {
    if (latestPendingTime > expirationTime) {
      root.latestPingedTime = expirationTime
    }
  }

  findNextExpirationTimeToWorkOn(root, expirationTime)
}

export {
  markPendingPriorityLevel,
}
