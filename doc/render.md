# 源码解析四  `ReactDOM.render()`从入口说起
当调用`ReactDOM.render()`时，先去除容器的里一些DOM元素，保证它是一个空节点，然后生成了一个`ReactRoot`对象，这个对象里封装了渲染、卸载两个方法。源码如下：

``` javascript
function createRootFromContainer(container: any): ReactRoot {
  let rootSibling: ChildNode = null

  while ((rootSibling = container.lastChild)) {
    container.remove(rootSibling)
  }

  const isConcurrent = false
  return new ReactRoot(container, isConcurrent)
}

function renderSubtreeIntoContainer(children: any, container: any, callback?: Function) {
  let root: ReactRoot = null
  let isMount: boolean = false

  if (!root) {
    root = container._reactrootContainer = createRootFromContainer(container)
    isMount = true
  }

   // 重新封装callback
  if (isFunction(callback)) {
    const originalCallback = callback

    callback = () => {
      const instance = getPublicRootInstance(root.internalRoot)
      originalCallback.call(instance)
    }
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
    return renderSubtreeIntoContainer(element, container, callback)
  },
}
```

## ReactRoot
整个`render`的核心，就在于`ReactRoot`，继续研究它的实现，在它的构造函数中，又生成了一个`FiberRoot`。这里可能刚开始理解都会很困惑，为什么会有两个`Roo`？

- `ReactRoot`是相对于整个`ReactDOM`而言，侧重更新和渲染
- `FiberRoot`是相对于整个`fiber reconciler`来说，是整个`Fiber`树的根节点，主要起的是调度整个`Fiber`树的作用

生成`FiberRoot`后，我们调用了`updateContainer()`，这里才是真正开始渲染的入口，
无论是`ReactDOM.render`,还是`setState`，在或者`hook`，它们都做了3件事：
1. 更新调度器的当前优先级，并获得当前`Fiber`优先级
2. 生成一个更新单元`update`，并把它插到更新队列的尾端。这里是通过`ReactDOM.render()`传入的`React Element`和`callback`
3. 通过`update`和`expirationTime`调用`scheduleWork`启动一个调度任务

``` javascript
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

function updateContainer(element: ReactNodeList, container: FiberRoot, callback?: Function) {
  const { current } = container

  const currentTime: ExpirationTime = requestCurrentTime()
  const expirationTime: ExpirationTime = computeExpirationTimeForFiber(currentTime, current)

  const update = new Update<any>(expirationTime, UpdateState, { element }, callback)

  flushPassiveEffects()
  enqueueUpdate(current, update)
  scheduleWork(current, expirationTime)
}
```

### callback 的处理
`ReactDOM.render()`还接受一个函数作为第三个参数用于渲染成功后执行，看上面源码，首先我们会重新给它包一层，使它可以接受`FiberRoot`作为参数。重点在`ReactRoot`的实现中，这里，我们先创建一个`ReactWork`对象，将每个`callback`注册到这个对象上，然后把触发函数传入`updateContainer()`，将其塞入到`update`中，在调度结束后被调用

``` javascript
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

    this.didCommit = true
    this.callbacks.forEach((callback: Function) => {
      callback()
    })
  }
}
```



