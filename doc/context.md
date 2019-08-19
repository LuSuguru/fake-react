# 源码解析二十八 `context`
`context`是`react`中一个非常方便的特性，它可以跨域任意组件，进行数据的传递及触发渲染，`react-redux`，`mobx-react`都使用了`context`，那么它是如何实现的呢，接下来我们就来解析下

我们可以通过`createContext`来创建一个`context`，整个`context`的数据结构非常简单

```javascript
export interface ReactContext<T> {
  $$typeof: string,
  Consumer: ReactContext<T>,
  Provider: ReactProviderType<T>,
  _calculateChangedBits: (a: T, b: T) => number,
  _currentValue: T,
}
```

创建的过程就是生成了一个`context`,并注册好`Provider`与`Consumer`，将默认值挂在`context`的`_currentValue`上

```javascript
function createContext<T>(defaultValue: T, calculateChangedBits?: (a: T, b: T) => number): ReactContext<T> {
  if (calculateChangedBits === undefined) {
    calculateChangedBits = null
  }

  const context = {
    $$typeof: REACT_CONTEXT_TYPE,
    _calculateChangedBits: calculateChangedBits,

    _currentValue: defaultValue,

    Provider: null,
    Consumer: null,
  }

  context.Provider = {
    $$typeof: REACT_PROVIDER_TYPE,
    _context: context,
  }

  context.Consumer = context

  return context
}
```

另外，在`fiber`中也有一个`contextDependencies`属性，记录当前`fiber`上挂载的`context`队列，同其他所有的队列一样，这里的`context`队列也是使用链表实现

```javascript
export interface ContextDependencyList {
  first: ContextDependency<any>,
  expirationTime: ExpirationTime,
}

interface ContextDependency<T> {
  context: ReactContext<T>,
  observedBits: number,
  next: ContextDependency<T>,
}
```

### `Provider`
在使用的时候，我们都会先通过`provider`注册一个`context`的生产者，在`beginWork`中，如果判断出是一个`Provider`，会调用`updateContextProvider`

在这个函数中，我们首先拿到新的`value`值，并通过`pushProvider`，将当前的`context`作为上下文，这里的上下文同样使用了前面提到的栈，并完全遵循同样的规则，`beginWork`中入栈，`completeWork`中出栈。最后，将新的`value`注入到`context`上

```javascript
function pushProvider(providerFiber: Fiber, nextValue: any) {
  const context = providerFiber.type._context
  push(valueCursor, context)

  context._currentValue = nextValue
}
```

`createContext`接受第二个参数，这个参数类似于`memo`中的第二个参数以及`shouldComponentUpdate`，是用来给我们作优化用的，在`updateContextProvider`中，会调用`context`模块的`calculateChangedBits`，这个函数会拿到我们注册`context`时传入的函数并调用它

```javascript
function calculateChangedBits<T>(context: ReactContext<T>, newValue: T, oldValue: T) {
  if (Object.is(oldValue, newValue)) {
    return 0
  } else {
    const { _calculateChangedBits } = context
    const changedBits = isFunction(_calculateChangedBits) ? _calculateChangedBits(oldValue, newValue) : MAX_SIGNED_31_BIT_INT

    return changedBits | 0
  }
}
```

根据`calculateChangedBits`的返回结果，如果是0则跳过这次更新，反之则继续执行`propagateContextChange`

```javascript
function updateContextProvider(current: Fiber, workInProgress: Fiber, renderExpirationTime: ExpirationTime): Fiber {
  const providerType = workInProgress.type
  const context = providerType._context

  const oldProps = workInProgress.pendingProps
  const newProps = workInProgress.memoizedProps

  const newValue = newProps.value

  pushProvider(workInProgress, newValue)

  if (oldProps !== null) {
    const oldValue = oldProps.value
    const changedBits = calculateChangedBits(context, newValue, oldValue)

    if (changedBits === 0 && oldProps.children === newProps.children) {
      return bailoutOnAlreadyFinishedWork(current, workInProgress, renderExpirationTime)
    } else {
      propagateContextChange(workInProgress, context, changedBits, renderExpirationTime)
    }
  }

  const newChildren = newProps.children
  reconcileChildren(current, workInProgress, newChildren, renderExpirationTime)
  return workInProgress.child
}
```

最终执行的是`propagateContextChange`，它会从当前`fiber`开始，遍历它的子树，如果节点有`contextDependencies`，则遍历`context`队列，如果存在与当前`context`相同的`context`，则更新当前`fiber`的`expirationTime`，以及它上级节点的`childExpirationTime`，使其成为一个待更新节点

```javascript
function propagateContextChange(workInProgress: Fiber, context: ReactContext<any>, changedBits: number, renderExpirationTime: ExpirationTime) {
  let fiber: Fiber = workInProgress.child
  if (fiber !== null) {
    fiber.return = workInProgress
  }

  while (fiber != null) {
    let nextFiber: Fiber = fiber.child

    const list = fiber.contextDependencies
    if (list !== null) {

      let dependency: ContextDependency<any> = list.first
      while (dependency !== null) {
        if (dependency.context === context && (dependency.observedBits & changedBits) !== 0) {
          // classComponent 需打上更新标
          if (fiber.tag === ClassComponent) {
            const update = new Update(renderExpirationTime, ForceUpdate)
            enqueueUpdate(fiber, update)
          }

          if (fiber.expirationTime < renderExpirationTime) {
            fiber.expirationTime = renderExpirationTime
          }

          const { alternate } = fiber
          if (alternate !== null && alternate.expirationTime < renderExpirationTime) {
            fiber.expirationTime = renderExpirationTime
          }

          scheduleWorkOnParentPath(fiber.return, renderExpirationTime)

          if (list.expirationTime < renderExpirationTime) {
            list.expirationTime = renderExpirationTime
          }

          break
        }
        dependency = dependency.next
      }
    } else if (fiber.tag === ContextProvider) {
      nextFiber = fiber.type === workInProgress.type ? null : nextFiber
    }

    if (nextFiber !== null) {
      nextFiber.return = fiber
    } else {
      nextFiber = fiber
      while (nextFiber !== null) {
        if (nextFiber === workInProgress) {
          nextFiber = null
          break
        }
        const { sibling } = nextFiber
        if (sibling !== null) {
          sibling.return = nextFiber.return
          nextFiber = sibling
          break
        }
        nextFiber = nextFiber.return
      }
    }
    fiber = nextFiber
  }
}

function scheduleWorkOnParentPath(parent: Fiber, renderExpirationTime: ExpirationTime) {
  let node: Fiber = parent
  while (node !== null) {
    const { alternate } = node
    if (node.childExpirationTime < renderExpirationTime) {
      node.childExpirationTime = renderExpirationTime
      if (alternate !== null && alternate.childExpirationTime < renderExpirationTime) {
        alternate.childExpirationTime = renderExpirationTime
      }
    } else if (alternate !== null && alternate.childExpirationTime < renderExpirationTime) {
      alternate.childExpirationTime = renderExpirationTime
    } else {
      break
    }
    node = node.return
  }
}
```

### `Consumer`
在所有可能访问到`context`的节点上，都会调用`prepareToReadContext`，将当前的`fiber`的`contextDependencies`进行重置，并更新`context`模块中的全局变量

```javascript
function prepareToReadContext(workInProgress: Fiber, renderExpirationTime: ExpirationTime) {
  currentlyRenderingFiber = workInProgress
  lastContextDependency = null
  lastContextWithAllBitsObserved = null

  const currentDependencies = workInProgress.contextDependencies

  if (currentDependencies !== null && currentDependencies.expirationTime >= renderExpirationTime) {
    markWorkInProgressReceivedUpdate()
  }

  workInProgress.contextDependencies = null
}
```

在使用`context`时，都需要通过`readContext`获得新的`context`

由于我们已经在`prepareToReadContext`更新了全局变量，所以，这里我们直接生成一个`ContextDependenct`对象，并放到当前`fiber`的`contextDependencies`队列末尾，并且返回当前`context`新的`value`，整个实现非常的简单

```javascript
function readContext<T>(context: ReactContext<T>, observedBits: void | number | boolean): any {
  if (lastContextWithAllBitsObserved !== context && !(observedBits === false || observedBits === 0)) {
    let resolvedObservedBits: number
    if (!isNumber(observedBits) || observedBits === MAX_SIGNED_31_BIT_INT) {
      lastContextWithAllBitsObserved = context
      resolvedObservedBits = MAX_SIGNED_31_BIT_INT
    } else {
      resolvedObservedBits = observedBits as number
    }

    const contextItem: ContextDependency<T> = {
      context,
      observedBits: resolvedObservedBits,
      next: null,
    }

    if (lastContextDependency === null) {
      lastContextDependency = contextItem
      currentlyRenderingFiber.contextDependencies = {
        first: contextItem,
        expirationTime: NoWork,
      }
    } else {
      lastContextDependency = lastContextDependency.next = contextItem
    }
  }
  return context._currentValue
}
```

使用`context`一般有三种：
- `Class.contextType`
- `Consumer`+`render props`
- `useContext`


##### `Class.contextType`

我们可以通过将`contextType`直接赋予`ClassComponent`的静态对象上，实例上可以直接拿到`context`

```javascript
class MyClass extends React.Component {
  static contextType = MyContext;
  render() {
    let value = this.context;
    /* render something based on the value */
  }
}
```

它的实现非常的简单，如果有满足条件的`contextType`，则调用`readContext`生成`context`并挂载在实例上

```javascript
// context 操作
const { contextType } = ctor
if (isObject(contextType)) {
  instance.context = readContext(contextType)
}
```

##### `Consumer`+`render props`

```javascript
<MyContext.Consumer>
  {value => /* render something based on the context value */}
</MyContext.Consumer>
```

它的实现也非常简单，如果是个`consumer`组件，则调用`updateContextConsumer`，同样是通过`rendContext`获得新的`context`，并直接执行`render()`

```javascript
function updateContextConsumer(current: Fiber, workInProgress: Fiber, renderExpirationTime: ExpirationTime): Fiber {
  const context: ReactContext<any> = workInProgress.type

  const newProps = workInProgress.pendingProps
  const render = newProps.children

  prepareToReadContext(workInProgress, renderExpirationTime)
  const newValue = readContext(context, newProps.unstable_observedBits)
  const newChildren = render(newValue)

  workInProgress.effectTag |= PerformedWork
  reconcileChildren(current, workInProgress, newChildren, renderExpirationTime)
  return workInProgress.child
}
```

##### `useContext`

```javascript
const value = useContext(MyContext)
```

在`FunctionComponent`中，我们可以通过`useContext`来获取`context`，它的实现更加简单， 仅仅是将`readContext`重命名了一下

```javascript
  useContext: readContext
```

