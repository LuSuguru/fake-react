class ReactWork {
  private callbacks: Function[] = []
  private didCommit: boolean = false

  then = (onCommit: Function) => {
    if (this.didCommit) {
      return onCommit()
    }

    this.callbacks.push(onCommit)
  }

  onCommit = () => {
    if (this.didCommit) {
      return
    }
    console.log(this.callbacks)
    this.didCommit = true
    this.callbacks.forEach((callback: Function) => {
      callback()
    })
  }
}

export default ReactWork
