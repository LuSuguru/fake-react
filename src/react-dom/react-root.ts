import { ReactNodeList } from '../type/react-type'
import ReactWork from './react-work'
import { updateContainer } from '../reconciler'

class ReactRoot {
  internalRoot: root

  constructor(container: Element, isConcurrent: boolean, hydrate: boolean) {
    // 待实现
  }

  render(children: ReactNodeList, callback?: Function): ReactWork {
    const { internalRoot: root } = this
    const work = new ReactWork()

    if (callback) {
      work.then(callback)
    }

    updateContainer(children, root, work.onCommit) // 待实现
    return work
  }

  unmount(callback?: Function): ReactWork {
    const { internalRoot: root } = this
    const work = new ReactWork()

    updateContainer(null, root, work.onCommit)
    return work
  }

  createBatch() {
    // 待实现
  }
}

export default ReactRoot