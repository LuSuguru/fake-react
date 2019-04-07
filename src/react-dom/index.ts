import { isFunction } from 'util'
import { getPublicRootInstance } from '../react-reconciler'
import { unbatchedUpdates } from '../react-scheduler'
import ReactRoot from './react-root'

function createRootFromContainer(container: any, forceHydrate: boolean): ReactRoot {
  if (!forceHydrate) {
    let rootSibling: ChildNode = null

    while ((rootSibling = container.lastChild)) {
      container.remove(rootSibling)
    }
  }

  const isConcurrent = false
  return new ReactRoot(container, isConcurrent, forceHydrate)
}

function renderSubtreeIntoContainer(children: any, container: any, forceHydrate: boolean, callback?: Function) {
  let root: ReactRoot = null
  let isMount: boolean = false

  if (!root) {
    root = container._reactrootContainer = createRootFromContainer(container, forceHydrate)
    isMount = true
  }

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
    return renderSubtreeIntoContainer(element, container, false, callback)
  },
}

export default ReactDOM
