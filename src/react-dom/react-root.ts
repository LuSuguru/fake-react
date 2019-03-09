import { FiberRoot } from '../react-fiber/fiber-root'
import { createContainer, updateContainer } from '../react-reconciler'
import { ReactNodeList } from '../react-type/react-type'
import ReactWork from './react-work'

class ReactRoot {
  public internalRoot: FiberRoot

  constructor(container: Element, hydrate: boolean) {
    this.internalRoot = createContainer(container, hydrate)
  }

  public render(children: ReactNodeList, callback?: Function): ReactWork {
    return this.update(true, children, callback)
  }

  public unmount(callback?: Function): ReactWork {
    return this.update(false, null, callback)
  }

  public createBatch() {
    // 待实现
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
}

export default ReactRoot
