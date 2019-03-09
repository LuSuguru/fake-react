import ReactRoot from './react-root'
import { ReactNodeList } from '../type/react-type'
import ReactWork from './react-work'

class ReactBatch {
  private expirationTime: number = 0 //有个默认值，待实现
  private root: ReactRoot
  private next: any
  private callbacks: Function[] = []
  private didComplete: boolean = false
  private hasChildren: boolean = false
  private children: ReactNodeList = []
  private defer: boolean = true

  constructor(root: ReactRoot) {
    this.root = root
  }

  render(children: ReactNodeList): ReactWork {
    this.hasChildren = true
    this.children = children

    const work = new ReactWork()
    updateContainerAtExpirationTime(
      children,
      this.root.internalRoot,
      null,
      this.expirationTime,
      work.onCommit)
    return work
  }

  then(onComplete: Function) {
    if (this.didComplete) {
      return onComplete()
    }

    this.callbacks.push(onComplete)
  }

  commit() {
    const internalRoot = this.root.internalRoot
    // 待实现
  }

  onComplete() {
    if (this.didComplete) {
      return
    }

    this.didComplete = true
    this.callbacks.forEach((callback: Function) => {
      callback()
    })
  }
}