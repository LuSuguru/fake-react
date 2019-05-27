import { getPublicRootInstance } from '../react-reconciler'
import { unbatchedUpdates } from '../react-scheduler'
import { isFunction } from '../utils/getType'
import './dom-client-inject'
import ReactRoot from './react-root'

function createRootFromContainer(container: any): ReactRoot {
  let rootSibling: ChildNode = null

  while ((rootSibling = container.lastChild)) {
    container.remove(rootSibling)
  }

  const isConcurrent = false
  return new ReactRoot(container, isConcurrent)
}

function renderSubtreeIntoContainer(children: any, container: any, callback?: Function) {
  let root: ReactRoot = null
  let isMount: boolean = false

  if (!root) {
    root = container._reactrootContainer = createRootFromContainer(container)
    isMount = true
  }

   // 重新封装callback
  if (isFunction(callback)) {
    const originalCallback = callback

    callback = () => {
      const instance = getPublicRootInstance(root.internalRoot)
      originalCallback.call(instance)
    }
  }

  if (isMount) {
    unbatchedUpdates(() => {
      root.render(children, callback)
    })
  } else {
    root.render(children, callback)
  }
}

const ReactDOM = {
  render(element: any, container: Element, callback?: Function) {
    return renderSubtreeIntoContainer(element, container, callback)
  },
}

export default ReactDOM
