import { ExpirationTime } from '../react-fiber/expiration-time'
import { FiberRoot } from '../react-fiber/fiber-root'
import { computeExpirationTimeForFiber, requestCurrentTime } from '../react-scheduler'
import { ReactNodeList } from '../react-type/react-type'

function updateContainerAtExpirationTime(
  element: ReactNodeList,
  container: FiberRoot,
  expirationTime: ExpirationTime,
  callback?: Function,
) {
  if (container.context === null) {
    container.context = {}
  } else {
    container.pendingContext = {}
  }

  const update = createUpdate(expirationTime)
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

  if (container.context === null) {
    container.context = {}
  } else {
    container.pendingContext = {}
  }

  updateContainerAtExpirationTime(element, container, expirationTime, callback)
}

export { createContainer, updateContainer }
