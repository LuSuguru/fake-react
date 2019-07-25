# 源码解析十五 `commitRoot`
整个`render`阶段结束后，根节点`FiberRoot`上挂载了整棵树上需要更新到`DOM`上的`fiber`链表。
`commit`阶段做的事，就是遍历这条链表，更新`DOM`，并触发一些这阶段的钩子函数，另外，前面提到过，一旦调度进入`commit`阶段，整个过程是不会中断的，会一直执行到结束

```javaScript
function commitRoot(root: FiberRoot, finishedWork: Fiber) {
  isWorking = true
  isCommitting = true

  root.pendingCommitExpirationTime = NoWork

  const earliestRemainingTimeBeforeCommit = finishedWork.expirationTime > finishedWork.childExpirationTime ? finishedWork.expirationTime : finishedWork.childExpirationTime

  // 更新 FiberRoot 优先级
  markCommittedPriorityLevels(root, earliestRemainingTimeBeforeCommit)

  // 找到遍历 effect 链表的入口
  let firstEffect: Fiber = null
  if (finishedWork.effectTag > PerformedWork) {
    if (finishedWork.lastEffect !== null) {
      finishedWork.lastEffect.nextEffect = finishedWork
      firstEffect = finishedWork.firstEffect
    } else {
      firstEffect = finishedWork
    }
  } else {
    firstEffect = finishedWork.firstEffect
  }

  prepareForCommit(root.containerInfo)

  commitTask(commitBeforeMutationLifecycles, firstEffect)

  // 第一阶段，提交 dom 的操作
  commitTask(commitAllHostEffects, firstEffect)
  resetAfterCommit(root.containerInfo)

  // 第二阶段，调用生命周期，ref
  root.current = finishedWork
  commitTask(commitAllLifeCycles.bind(null, root), firstEffect)

  // useEffect 放到下一个 event loop 调用
  if (firstEffect !== null && rootWithPendingPassiveEffects !== null) {
    const callback = commitPassiveEffects.bind(null, root, firstEffect)
    passiveEffectCallbackHandle = scheduleDeferredCallback(callback)
    passiveEffectCallback = callback
  }

  isCommitting = false
  isWorking = false

  // 更新优先级
  const earliestRemainingTimeAfterCommit = finishedWork.expirationTime > finishedWork.childExpirationTime ? finishedWork.expirationTime : finishedWork.childExpirationTime

  if (earliestRemainingTimeAfterCommit === NoWork) {
    legacyErrorBoundariesThatAlreadyFailed = null
  }

  root.expirationTime = earliestRemainingTimeAfterCommit
  root.finishedWork = null
}
```

在进入`commit`时，会把`isCommit`和`isWorking`全局变量设为`true`，结束时在设为`false`
整个`commit`大致可分为5部分：
- 更新优先级
- 调`getSnapshotBeforeUpdate`
- 对各种`effectTag`的处理，渲染到`DOM`上
- 调用相应的生命周期，处理`Ref`
- 处理`hook`中的`useEffect`

### `commitBeforeMutationLifecycles`
在 `React 16`中，更新时会调一个新的生命周期`getSnapshotBeforeUpdate`，用于在发生更改之前从 `DOM`中捕获一些信息，它返回一个快照。将作为`componentDidUpdate()`的第三个参数。
需要在`DOM`修改之前，所以得先调用它

再看这个函数，就很简单了，调用实例的`getSnapshotBeforeUpdate`，挂载到实例的`__reactInternalSnapshotBeforeUpdate`上

```javaScript
function commitBeforeMutationLifecycles(effectTag: SideEffectTag) {
  if (effectTag & Snapshot) {
    const current = nextEffect.alternate
    commitBeforeMutationLifecycle(current, nextEffect)
  }
}

function commitBeforeMutationLifecycle(current: Fiber, finishedWork: Fiber) {
  switch (finishedWork.tag) {
    case FunctionComponent:
    case ForwardRef:
    case SimpleMemoComponent:
      commitHookEffectList(UnmountSnapshot, NoHookEffect, finishedWork)
      return
    case ClassComponent: {
      if (current !== null) {
        const prevPrrops = current.memoizedProps
        const prevState = current.memoizedState
        const instance = finishedWork.stateNode

        const snapshot = instance.getSnapshotBeforeUpdate(finishedWork.elementType === finishedWork.type ? prevPrrops : resolveDefaultProps(finishedWork.type, prevPrrops), prevState)
        instance.__reactInternalSnapshotBeforeUpdate = snapshot
      }
      return
    }
  }
}
```

### `commitAllHostEffects`
这个函数是`commit`的核心，根据`effectTag`的类型，将其结果渲染到`DOM`上，渲染的类型大致分为三种：
- Placement
- Update
- Deletion

```javaScript
function commitAllHostEffects(effectTag: SideEffectTag) {
  if (effectTag & ContentReset) {
    commitResetTextContent(nextEffect)
  }

  // ref 引用的还是老的实例，所以有 ref 的先删除老的
  if (effectTag & Ref) {
    const current = nextEffect.alternate
    if (current !== null) {
      commitDetachRef(nextEffect)
    }
  }

  const primaryEffectTag = effectTag & (Placement | Update | Deletion)
  switch (primaryEffectTag) {
    case Placement: {
      commitPlacement(nextEffect)
      nextEffect.effectTag &= ~Placement // 清除placemenet
      break
    }
    case PlacementAndUpdate: {
      commitPlacement(nextEffect)
      nextEffect.effectTag &= ~Placement

      commitWork(nextEffect.alternate, nextEffect)
      break
    }
    case Update: {
      commitWork(nextEffect.alternate, nextEffect)
      break
    }
    case Deletion: {
      commitDeletion(nextEffect)
      break
    }
  }
}
```

### `commitPlacement`
这个函数有点类似于前面`appendAllChildren`，首先调用`getHostSibling`找到当前要执行插入的节点的现有的第一个右侧节点，如果这个函数返回null，则会直接调用parent.appendChild

```javaScript
function getHostSibling(fiber: Fiber): any {
  let node: Fiber = fiber

  siblings: while (true) {
    while (node.sibling === null) {
      if (node.return === null || isHostParent(node.return)) {
        return null
      }
      node = node.return
    }
    node.sibling.return = node.return
    node = node.sibling

    while (node.tag !== HostComponent && node.tag !== HostText && node.tag !== DehydratedSuspenseComponent) {
      if (!(node.effectTag & Placement)) {
        continue siblings
      }

      if (node.child === null || node.tag === HostPortal) {
        continue siblings
      } else {
        node.child.return = node
        node = node.child
      }
    }

    if (!(node.effectTag & Placement)) {
      return node.stateNode
    }
  }
}

function commitPlacement(finishedWork: Fiber) {
  // 拿到上级最近的 dom 元素作为父节点
  const parentFiber = getHostParentFiber(finishedWork)

  let parent: any = null
  let isContanier: boolean = false

  switch (parentFiber.tag) {
    case HostComponent: {
      parent = parentFiber.stateNode
      isContanier = false
      break
    }
    case HostRoot: {
      parent = parentFiber.stateNode.containerInfo
      isContanier = true
      break
    }
    case HostPortal: {
      parent = parentFiber.stateNode.containerInfo
      isContanier = true
      break
    }
  }

  if (parentFiber.effectTag & ContentReset) {
    setTextContent(parent, '')
    parentFiber.effectTag &= ~ContentReset
  }

  const before = getHostSibling(finishedWork)
  let node: Fiber = finishedWork

  while (true) {
    if (node.tag === HostComponent || node.tag === HostText) {
      if (before) {
        if (isContanier) {
          insertInContainerBefore(parent, node.stateNode, before)
        } else {
          insertBefore(parent, node.stateNode, before)
        }
      } else {
        if (isContanier) {
          appendChildToContainer(parent, node.stateNode)
        } else {
          appendChild(parent, node.stateNode)
        }
      }
    } else if (node.child !== null && node.tag !== HostPortal) {
      node.child.return = node
      node = node.child
      continue
    }
    if (node === finishedWork) {
      return
    }
    while (node.sibling === null) {
      if (node.return === null || node.return === finishedWork) {
        return
      }
      node = node.return
    }
    node.sibling.return = node.return
    node = node.sibling
  }
}
```

### `commitWork`
`hook`的部分后面会单独说，其余的就是把需要更新的`props`渲染到`DOM`上，`updatePayload`是之前在`completeUnitOfWork`中得到的

```javaScript
function commitWork(_current: Fiber, finishedWork: Fiber) {
  switch (finishedWork.tag) {
    case FunctionComponent:
    case ForwardRef:
    case MemoComponent:
    case SuspenseComponent: {
      commitHookEffectList(UnmountMutation, MountMutation, finishedWork)
      return
    }
    case ClassComponent: {
      return
    }
    case HostComponent: {
      const instance = finishedWork.stateNode
      if (instance !== null) {
        const newProps = finishedWork.memoizedProps
        const type = finishedWork.type

        const updatePayload = finishedWork.updateQueue
        finishedWork.updateQueue = null

        if (updatePayload !== null) {
          updateFiberProps(instance, newProps)
          updatePropeties(instance, updatePayload, type, newProps)

        }
      }
      return
    }
    case HostText: {
      const textInstance = finishedWork.stateNode
      const newText = finishedWork.memoizedProps

      setTextInstance(textInstance, newText)
      return
    }
  }
}
```

### `commitDeletion`
```javaScript
function commitDeletion(current: Fiber) {
  unmountComponents(current)
  detachFiber(current)
}

function unmountComponents(current: Fiber) {
  let currentParentIsValid: boolean = false

  let currentParent: Element = null
  let currentParentIsContainer: boolean = false

  let node: Fiber = current
  while (true) {
    if (!currentParentIsValid) {
      let parent: Fiber = node.return

      findParent: while (true) {
        switch (parent.tag) {
          case HostComponent:
            currentParent = parent.stateNode
            currentParentIsContainer = false
            break findParent
          case HostRoot:
            currentParent = parent.stateNode.containerInfo
            currentParentIsContainer = true
            break findParent
          case HostPortal:
            currentParent = parent.stateNode.containerInfo
            currentParentIsContainer = true
            break findParent
        }
        parent = parent.return
      }
      currentParentIsValid = true
    }

    if (node.tag === HostComponent || node.tag === HostText) {
      commitNestedUnmounts(node)

      if (currentParentIsContainer) {
        removeChildFromContainer(currentParent, node.stateNode)
      } else {
        removeChild(currentParent, node.stateNode)
      }
    } else if (node.tag === HostPortal) {
      currentParent = node.stateNode.containerInfo
      currentParentIsContainer = true

      node.child.return = node
      node = node.child
      continue
    } else {
      commitUnmount(node)
      if (node.child !== null) {
        node.child.return = node
        node = node.child
        continue
      }
    }

    if (node === current) {
      return
    }

    while (node.sibling === null) {
      if (node.return === null || node.return === current) {
        return
      }
      node = node.return
      if (node.tag === HostPortal) {
        // 当回到portal那一层时，重置currentparent
        currentParentIsValid = false
      }
    }
    node.sibling.return = node.return
    node = node.sibling
  }
}
```
这个函数执行删除逻辑，首先，调用`unmountComponents`在`DOM`上删除节点，如果节点类型是`HostComponent`，调用`commitNestedUnmounts`，这个函数会从传入的节点开始，遍历整个子树，对每个节点调用`commitUnmount`

```javaScript
function commitUnmount(current: Fiber) {
  switch (current.tag) {
    case FunctionComponent:
    case ForwardRef:
    case MemoComponent:
    case SimpleMemoComponent: {
      // useEffect
      const updateQueue: FunctionComponentUpdateQueue = current.updateQueue as any
      if (updateQueue !== null) {
        const { lastEffect } = updateQueue
        if (lastEffect !== null) {
          const firstEffect = lastEffect.next

          let effect = firstEffect
          do {
            const destroy = effect.destroy
            if (destroy !== undefined) {
              destroy()
            }
            effect = effect.next
          } while (effect !== firstEffect)
        }
      }
      return
    }
    case ClassComponent: {
      safelyDetachRef(current)
      // 调用生命周期
      safelyCallComponentWillUnmount(current)
      return
    }
    case HostComponent: {
      safelyDetachRef(current)
      return
    }
    case HostPortal: {
      commitDeletion(current)
      return
    }
  }
}
```

最后，通过`detachFiber`切除`Fiber`的引用关系，好让它被`GC`回收

``` javaScript
function detachFiber(current: Fiber) {
  current.return = null
  current.child = null
  current.memoizedState = null
  current.updateQueue = null
  const alternate = current.alternate
  if (alternate !== null) {
    alternate.return = null
    alternate.child = null
    alternate.memoizedState = null
    alternate.updateQueue = null
  }
}
```

### `commitAllLifeCycles`

最后，调用`commitAllLifeCycles`，触发一些初始或者更新后的生命周期，有`Ref`的加上新的`Ref`，在`setState`，第二个参数的`callback`也在这里

```javaScript
function commitAllLifeCycles(finishedRoot: FiberRoot, effectTag: SideEffectTag) {
  if (effectTag & (Update | Callback)) {
    const current = nextEffect.alternate
    commitLifeCycles(current, nextEffect)
  }

  if (effectTag & Ref) {
    commitAttachRef(nextEffect)
  }

  if (effectTag & Passive) {
    rootWithPendingPassiveEffects = finishedRoot
  }
}

function commitLifeCycles(current: Fiber, finishedWork: Fiber) {
  switch (finishedWork.tag) {
    case FunctionComponent:
    case ForwardRef:
    case SimpleMemoComponent:
      commitHookEffectList(UnmountLayout, MountLayout, finishedWork)
      break
    case ClassComponent: {
      const instance = finishedWork.stateNode

      if (finishedWork.effectTag & Update) {
        if (current === null) {
          instance.componentDidMount()
        } else {
          const prevProps = finishedWork.elementType === finishedWork.type ? current.memoizedProps : resolveDefaultProps(finishedWork.type, current.memoizedProps)
          const prevState = current.memoizedState

          instance.componentDidUpdate(prevProps, prevState, instance.__reactInternalSnapshotBeforeUpdate)
        }
      }

      const { updateQueue } = finishedWork
      // 调用 callback
      commitUpdateQueue(updateQueue, instance)
      return
    }
    case HostRoot: {
      const { updateQueue } = finishedWork

      if (updateQueue !== null) {
        let instance: any = null
        if (finishedWork.child !== null) {
          instance = finishedWork.child.stateNode
        }
        commitUpdateQueue(updateQueue, instance)
      }
      return
    }
    case HostComponent: {
      const instance = finishedWork.stateNode

      // input自动获得焦点
      if (current === null && finishedWork.effectTag & Update) {
        const { type, memoizedProps: props } = finishedWork

        setFoucus(instance, type, props)
      }
    }
    default:
      break
  }
}

function commitAttachRef(finishedWork: Fiber) {
  const { ref } = finishedWork

  if (ref !== null) {
    const instance = finishedWork.stateNode
    if (isFunction(ref)) {
      ref(instance)
    } else {
      ref.current = instance
    }
  }
}
```




