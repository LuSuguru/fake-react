import * as htmlType from '../type/html-type'
import ReactRoot from './react-root'

function createRootfromContainer(container: any, forceHydrate: boolean): ReactRoot {
  if (!forceHydrate) {
    let rootSibling: ChildNode = null
    while ((rootSibling = container.lastChild)) {
      container.remove(rootSibling)
    }
  }

  return new ReactRoot(container, false, forceHydrate)
}


function renderSubtreeIntoContainer(children: any, container: any, forceHydrate: boolean, callback?: Function) {
  let root: ReactRoot = container._reactrootContainer
  let isMount: boolean = false

  if (!root) {
    root = container._reactrootContainer = createRootfromContainer(container, forceHydrate)
    isMount = true
  }

  callback = function () {
    const instance = getPublicRootInstance(root.internalRoot) // 待实现
    callback.call(instance)
  }

  if (isMount) {
    unbatchedUpdates(() => { // 初始渲染，不需要放入更新队列
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
