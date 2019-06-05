# 源码解析十四 `completeWork`
上节提到，在`completeUnitOfWork`中，会调用`completeWork`，这个函数有什么用呢？
设想一下，因为`Fiber`树的上下层结构跟真实的`DOM`树结构是相同的。在`beginWork`中，是一直往下走， 如果某个节点是`DOM`节点，缺少它的子孙`DOM`信息，对于某些操作，可能会导致`DOM`树的结构与`Fiber`树的结构不对应，渲染的结果可能就会与期望的不同。所以对于`DOM`节点的处理，不在`beginWork`中做，而是放在`completeWork`中，这个函数是从下往上走的，在调用时，它的子孙节点的信息都已更新完毕了，所以可以放心大胆的去更新它自身

另外，`DOM`的节点操作，依赖于它的父节点及根节点等。为了维护这个关系，`React`在全局维护着3个栈，用来模拟一个`DOM`的上下文环境。在`beginWork`中，如果是原生节点，会将它的一些信息塞入到这几个栈中。在`completeWork`中，取出来

### StackCursor
先看下栈的结构：

```javaScript
export interface StackCursor<T> { current: T }

const valueStack: any[] = []
let index: number = -1

function createStack<T>(defaultValue: T): StackCursor<T> {
  return { current: defaultValue }
}

function isEmpty(): boolean {
  return index === -1
}

function pop<T>(cursor: StackCursor<T>) {
  cursor.current = valueStack[index]
  valueStack[index] = null

  index--
}

function push<T>(cursor: StackCursor<T>, value: T) {
  index++
  valueStack[index] = cursor.current
  cursor.current = value
}
```

随后，创建3个全局的`DOM`上下文关系，每个栈都有获取以及进出栈方法：
```javaScript
declare class NoContext { }
const NO_CONTEXT: NoContext = {}

// Namescape 上下文
const contextStackCursor: StackCursor<HostContext | NoContext> = createStack(NO_CONTEXT)
// fiber 上下文
const contextFiberStackCursor: StackCursor<Fiber | NoContext> = createStack(NO_CONTEXT)
// root 上下文
const rootInstanceStackCursor: StackCursor<Container | NoContext> = createStack(NO_CONTEXT)

function getRootHostContainer(): Container | NoContext {
  return rootInstanceStackCursor.current
}

function pushHostContainer(fiber: Fiber, nextRootInstance: Container) {
  push(rootInstanceStackCursor, nextRootInstance)
  push(contextFiberStackCursor, fiber)

  push(contextStackCursor, NO_CONTEXT)
  const nextRootContext = getRootHostContext(nextRootInstance)
  pop(contextStackCursor)
  push(contextStackCursor, nextRootContext)
}

function popHostContainer() {
  pop(contextStackCursor)
  pop(contextFiberStackCursor)
  pop(rootInstanceStackCursor)
}

function getHostContext(): HostContext | NoContext {
  return contextStackCursor.current
}

function pushHostContext(fiber: Fiber) {
  const context = contextStackCursor.current
  const nextContext = getChildHostContext(context, fiber.type)

  if (context === nextContext) {
    return
  }

  push(contextStackCursor, nextContext)
  push(contextFiberStackCursor, fiber)
}

function popHostContext(fiber: Fiber) {
  if (contextFiberStackCursor.current !== fiber) {
    return
  }

  pop(contextFiberStackCursor)
  pop(contextStackCursor)
}
```

### `completeWork`
再看`completeWork`函数，处理各种`DOM`节点的操作

```javaScript
function completeWork(current: Fiber, workInProgress: Fiber) {
  const newProps = workInProgress.pendingProps

  switch (workInProgress.tag) {
    case HostRoot: {
      popHostContainer()

      const fiberRoot = workInProgress.stateNode
      // context设置
      if (fiberRoot.pendingContext) {
        fiberRoot.context = fiberRoot.pendingContext
        fiberRoot.pendingContext = null
      }

      if (current === null || current.child === null) {
        workInProgress.effectTag &= ~Placement
      }
      break
    }
    case HostComponent: {
      popHostContext(workInProgress)
      const rootContainerInstance = getRootHostContainer()
      const { type } = workInProgress

      // 更新
      if (current !== null && workInProgress.stateNode !== null) {
        updateHostComponent(current, workInProgress, type, newProps, rootContainerInstance)

        if (current.ref !== workInProgress.ref) {
          workInProgress.effectTag |= Ref
        }
      } else { // 渲染
        if (!newProps) {
          break
        }

        const currentHostContext = getHostContext()

        // 生成 DOM 元素
        const instance = createInstance(type, newProps, rootContainerInstance, currentHostContext, workInProgress)

        appendAllChildren(instance, workInProgress)

        if (finalizeInitialChildren(instance, type, newProps, rootContainerInstance)) {
          workInProgress.effectTag |= Update
        }
        workInProgress.stateNode = instance
      }

      if (workInProgress.ref !== null) {
        workInProgress.effectTag |= Ref
      }

      break
    }
    case HostText: {
      const newText: string = newProps

      if (current && workInProgress.stateNode !== null) {
        const oldText = current.memoizedProps
        updateHostText(workInProgress, oldText, newText)
      } else {
        const rootContainerInstance = getRootHostContainer()

        workInProgress.stateNode = createTextInstance(newText, rootContainerInstance, workInProgress)
      }
      break
    }
    case SuspenseComponent: {
      // 待实现
    }
    case HostPortal:
      popHostContainer()
      break
    case ContextProvider:
      popProvider(workInProgress)
      break
    case DehydratedSuspenseComponent: {
      if ((workInProgress.effectTag & DidCapture) === NoEffect) {
        current.alternate = null
        workInProgress.alternate = null
        workInProgress.tag = SuspenseComponent
        workInProgress.memoizedState = null
        workInProgress.stateNode = null
      }
      break
    }
  }

  return null
}
```

这里的重点在于`HostComponent`，它代指普通的`DOM`节点

我们先从栈中取出当前的根节点上下文，如果是更新，调用`updateHostComponent`，在这个函数里，拿到老的props，通过`diffProperties`找出需要更新的属性，塞进更新队列中，最后打上`Update`的标

```javaScript
function updateHostComponent(current: Fiber, workInProgress: Fiber | any, type: string, newProps: any, rootContainerInstance: Container | any) {
  const oldProps = current.memoizedProps
  if (oldProps === newProps) {
    return
  }

  const { stateNode: instance } = workInProgress
  const updatePayload = diffProperties(instance, type, oldProps, newProps, rootContainerInstance)

  workInProgress.updateQueue = updatePayload

  if (updatePayload) {
    workInProgress.effectTag |= Update
  }
}
```

如果是渲染的话
- 根据当前的上下文创建`DOM`实例，调`appendAllChildren`遍历其下所有`DOM`节点，插入到当前的`DOM`节点下
- 在`finalizeInitialChildren`中给当前节点挂上`props`，判断是否需要自动获得焦点，需要的话，`effectTag`挂上`Update`

```javaScript
function appendAllChildren(parent: any, workInProgress: Fiber) {
  let node: Fiber = workInProgress.child

  while (node !== null) {
    if (node.tag === HostComponent || node.tag === HostText) {
      appendInitialChild(parent, node.stateNode)
    } else if (node.child !== null && node.tag !== HostPortal) {
      node.child.return = node
      node = node.child
      continue
    }
    if (node === workInProgress) {
      return
    }

    while (node.sibling === null) {
      if (node.return === null || node.return === workInProgress) {
        return
      }
      node = node.return
    }

    node.sibling.return = node.return
    node = node.sibling
  }
}

function finalizeInitialChildren(domElement: Element, type: string, props: any, rootContainerInstance: any): boolean {
  setInitialProperties(domElement, type, props, rootContainerInstance)
  return shouldAutoFocusHostComponent(type, props)
}
```









