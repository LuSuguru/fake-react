import { ExpirationTime } from '../react-fiber/expiration-time'
import { FiberRoot } from '../react-fiber/fiber-root'
import { ReactNodeList } from '../type/react-type'

function createContainer(container: Element, hydate: boolean): FiberRoot {
  return new FiberRoot(container, hydate)
}

function updateContainer(element: ReactNodeList, container: FiberRoot, callback?: Function): ExpirationTime {

}

export { createContainer, updateContainer }
