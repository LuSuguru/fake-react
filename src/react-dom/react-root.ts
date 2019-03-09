import { ReactNodeList } from '../type/react-type'
import ReactWork from './react-work'
import { createContainer, updateContainer } from '../reconciler'
import { FiberRoot } from '../react-fiber/fiber-root'

class ReactRoot {
  internalRoot: FiberRoot

  constructor(container: Element, hydrate: boolean) {
    this.internalRoot = createContainer(container, hydrate)
  }

  private update(isMount: boolean, children: ReactNodeList, callback?: Function): ReactWork {
    const { internalRoot: root } = this
    const work = new ReactWork()

    if (callback) {
      work.then(callback)
    }

    if (isMount) {
      updateContainer(children, root, work.onCommit) // 待实现
    } else {
      updateContainer(null, root, work.onCommit)
    }

    return work
  }

  render(children: ReactNodeList, callback?: Function): ReactWork {
    return this.update(true, children, callback)
  }

  unmount(callback?: Function): ReactWork {
    return this.update(false, null, callback)
  }

  createBatch() {
    // 待实现
  }
}

export default ReactRoot