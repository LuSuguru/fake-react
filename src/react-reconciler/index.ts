import { ExpirationTime } from '../react-fiber/expiration-time'
import { FiberRoot } from '../react-fiber/fiber-root'
import { computeExpirationTimeForFiber, requestCurrentTime, scheduleWork } from '../react-scheduler'
import { ReactNodeList } from '../react-type/react-type'
import Update from '../react-update/update'
import { enqueueUpdate } from '../react-update/update-queue'

function updateContainerAtExpirationTime(
  element: ReactNodeList,
  container: FiberRoot,
  expirationTime: ExpirationTime,
  callback?: Function,
) {
  const { current } = container

  if (container.context === null) {
    container.context = {}
  } else {
    container.pendingContext = {}
  }

  const update = new Update<any>(expirationTime, 0)
  update.payload = { element }
  update.callback = callback

  flushPassiveEffects() // hook待实现
  enqueueUpdate(current, update)
  scheduleWork(current, expirationTime)
}

function createContainer(container: Element, hydate: boolean): FiberRoot {
  return new FiberRoot(container, hydate)
}

function updateContainer(
  element: ReactNodeList,
  container: FiberRoot,
  callback?: Function,
) {
  const { current } = container

  const currentTime: ExpirationTime = requestCurrentTime()
  const expirationTime: ExpirationTime = computeExpirationTimeForFiber(currentTime, current)

  updateContainerAtExpirationTime(element, container, expirationTime, callback || null)
}

export { createContainer, updateContainer }
