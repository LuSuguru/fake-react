import { ExpirationTime } from '../react-fiber/expiration-time'
import { FiberRoot } from '../react-fiber/fiber-root'
import { computeExpirationTimeForFiber, flushPassiveEffects, requestCurrentTime, scheduleWork } from '../react-scheduler'
import { ReactNodeList } from '../react-type/react-type'
import Update, { UpdateState } from '../react-update/update'
import { enqueueUpdate } from '../react-update/update-queue'

function getPublicRootInstance(container: FiberRoot): any {
  const containerFiber = container.current

  if (!containerFiber.child) {
    return null
  }

  return containerFiber.child.stateNode
}

function updateContainerAtExpirationTime(
  element: ReactNodeList,
  container: FiberRoot,
  expirationTime: ExpirationTime,
  callback?: Function,
) {
  const { current } = container

  const update = new Update<any>(expirationTime, UpdateState, { element }, callback)

  flushPassiveEffects()
  enqueueUpdate(current, update)
  scheduleWork(current, expirationTime)
}

function createContainer(container: Element, isConcurrent: boolean): FiberRoot {
  return new FiberRoot(container, isConcurrent)
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

export {
  getPublicRootInstance,
  createContainer,
  updateContainer,
}
