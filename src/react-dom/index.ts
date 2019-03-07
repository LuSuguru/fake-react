import * as htmlType from '../type/html-type'
import ReactRoot from './react-root'

function createRootfromContainer(container: any, forceHydrate: boolean): ReactRoot {
  if (!forceHydrate) {
    let rootSibling: ChildNode = null
    while ((rootSibling = container.lastChild)) {
      container.remove(rootSibling)
    }
  }

  return new ReactRoot()
}

function renderSubtreeIntoContainer(element: any, container: Element | Document, forceHydrate: boolean, callback?: Function) {


}

const ReactDOM = {
  render(element: any, container: Element | Document, callback?: Function) {
    return renderSubtreeIntoContainer(element, container, false, callback)
  }
}

export { ReactDOM }
