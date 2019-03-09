import * as htmlType from '../type/html-type'
import ReactRoot from './react-root'

function createRootFromContainer(container: any, forceHydrate: boolean): ReactRoot {
  if (!forceHydrate) {
    let rootSibling: ChildNode = null
    while ((rootSibling = container.lastChild)) {
      container.remove(rootSibling)
    }
  }

  return new ReactRoot(container, forceHydrate)
}


function renderSubtreeIntoContainer(children: any, container: any, forceHydrate: boolean, callback?: Function) {
  let root: ReactRoot = container._reactrootContainer
  let isMount: boolean = false

  if (!root) {
    root = container._reactrootContainer = createRootFromContainer(container, forceHydrate)
    isMount = true
  }

  callback = function () {
    const instance = getPublicRootInstance(root.internalRoot) // 待实现
    callback.call(instance)
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
  }
}

export { ReactDOM }
