import { ReactNodeList } from '../type/react-type'
import { FiberRoot } from '../react-fiber/fiber-root'

function createContainer(container: Element, hydate: boolean): FiberRoot {
  return new FiberRoot(container, hydate)
}

function updateContainer(element: ReactNodeList, container: any, callback?: Function) {
  // 待实现
}

export { createContainer, updateContainer }