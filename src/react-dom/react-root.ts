import { ReactNodeList } from '../type/react-type'
import ReactWork from './react-work'
import { updateContainer } from '../reconciler'

class ReactRoot {
  private internalRoot: root

  constructor(container: Element, isConcurrent: boolean, hydrate: boolean) {
    // 待实现
  }

  render(children: ReactNodeList, callback?: Function): ReactWork {
    const { internalRoot: root } = this
    const work = new ReactWork()

    if (callback) {
      work.then(callback)
    }

    updateContainer(children, root, null, work.onCommit) // 待实现
    return work
  }

  unmount(callback?: Function): ReactWork {
    const { internalRoot: root } = this
    const work = new ReactWork()

    updateContainer(null, root, null, work.onCommit)
  }
}

export default ReactRoot