import { FiberRoot } from '../react-fiber/fiber-root'
import { createContainer, updateContainer } from '../react-reconciler'
import { ReactNodeList } from '../react-type/react-type'
import ReactWork from './react-work'

class ReactRoot {
  public internalRoot: FiberRoot

  constructor(container: Element, isConcurrent: boolean) {
    this.internalRoot = createContainer(container, isConcurrent)
  }

  public render(children: ReactNodeList, callback?: Function): ReactWork {
    return this.update(children, callback)
  }

  public unmount(callback?: Function): ReactWork {
    return this.update(null, callback)
  }

  public createBatch() {
    // 待实现
  }

  private update(children: ReactNodeList, callback?: Function): ReactWork {
    const { internalRoot } = this
    const work = new ReactWork()

    if (callback) {
      work.then(callback)
    }

    updateContainer(children, internalRoot, work.onCommit)
    return work
  }
}

export default ReactRoot
