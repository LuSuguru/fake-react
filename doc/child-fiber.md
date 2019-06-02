# 源码解析十二 `reconciler childFiber`
在开始这节之前，首先要理清下`ReactElement`和`Fiber`的区别：
- `ReactElement`：通过`createElement()`生成的元素节点，仅包含一些节点的基本信息（props,state）
- `Fiber`：`fiber reconciler`的工作单元，既包含元素节点的基本信息，还要保存一些用于任务调度的信息，以及跟周围节点的关系信息

整个`schedule`系统围绕的核心就是`Fiber`及其他们的关系和调度，所以在拿到`ReactElment`后，都会将其转化为`Fiber`。为了更好的示意，这节的所说的`element`都是指代`ReactElement`，节点都是指`Fiber`节点

整棵`workInProgress`树，都是从`current`树复制过来的，所以在没有调和子节点前，当前工作的`workInProgress`的`child`指向`current`，如图：
<img src="./schedule/schedule-render1.png" width="572" height="487">

通过新的`element`以及`current`，生成子`workInprogress`的过程，就是`reconciler childFiber`。注意，这里只是调和生成子节点的过程，更新节点的内容还得等`nextUnitOfWork`指向它，然后调用`beginWork`和`completeUnitOfWork`更新

### `reconcileChildren`
`begeinwork`，每种类型的调和函数在更新自身的属性时，也会更新其`element`，如：
- functionComponent：直接执行，生成新`element`
- classComponent：调用实例的`render()`，生成新`element`
- hostComponent：`props.children`
每个函数的最后一步，就是将新的`element`传入`reconcileChildren`，生成新的子节点

```javaScript
const mountChildFibers = ChildReconciler(false)
const reconcileChildFibers = ChildReconciler(true)

/**
 * @param current 当前 current 父节点
 * @param workInProgress  workInProgress 父节点
 * @param nextChildren  新的 element
 * @param renderExpirationTime 当前优先级
 */
function reconcileChildren(current: Fiber, workInProgress: Fiber, nextChildren: any, renderExpirationTime: ExpirationTime) {
  // 新渲染
  if (current === null) {
    workInProgress.child = mountChildFibers(workInProgress, null, nextChildren, renderExpirationTime)
  // 更新 current.child 是当前current子节点
  } else {
    workInProgress.child = reconcileChildFibers(workInProgress, current.child, nextChildren, renderExpirationTime)
  }
}
```

如果`current`没有，说明新的`element`需要渲染。反之，则是更新，`current.child`是要做比较的对象，可以称其为旧节点。这里的核心在于`ChildReconciler`，这是个采用闭包封装的模块，里面包含了各种类型的子节点的调和方法

```javaScript
function ChildReconciler(shouldTrackSideEffects: boolean) {
  function deleteChild(returnFiber: Fiber, childToDelete: Fiber) {
    ...
  }

  function deleteRemainingChildren(returnFiber: Fiber, currentFirstChild: Fiber) {
    ...
  }

  function placeChild(newFiber: Fiber, lastPlacedIndex: number, newIdx: number): number {
    ...
  }


  function placeSingleChild(newFiber: Fiber): Fiber {
    ...
  }

  function createChild(returnFiber: Fiber, newChild: any, expirationTime: ExpirationTime): Fiber {
    ...
  }

  function updateFragment(returnFiber: Fiber, current: Fiber, fragment: any, expirationTime: ExpirationTime, key: string | null): Fiber {
    ...
  }

  function updateTextNode(returnFiber: Fiber, current: Fiber, textContent: string, expirationTime: ExpirationTime): Fiber {
    ...
  }

  function updateElement(returnFiber: Fiber, current: Fiber, element: ReactElement, expirationTime: ExpirationTime): Fiber {
    ...
  }

  function updatePortal(returnFiber: Fiber, current: Fiber, portal: ReactPortal, expirationTime: ExpirationTime): Fiber {
    ...
  }

  function updateFromMap(returnFiber: Fiber, existingChildren: Map<string | number, Fiber>, newChild: any, newIdx: number, expirationTime: ExpirationTime) {
    ...
  }

  function updateSlot(returnFiber: Fiber, oldFiber: Fiber, newChild: any, expirationTime: ExpirationTime) {
    ...
  }

  function reconcileSingleElement(returnFiber: Fiber, currentFirstChild: Fiber, element: ReactElement, expirationTime: ExpirationTime): Fiber {
    ...
  }

  function reconcileSinglePortal(returnFiber: Fiber, currentFirstChild: Fiber, portal: any, expirationTime: ExpirationTime): Fiber {
    ...
  }

  function reconcileSingleTextNode(returnFiber: Fiber, currentFirstChild: Fiber, textContent: string, expirationTime: ExpirationTime): Fiber {
    ...
  }

  function reconcileChildrenArray(returnFiber: Fiber, currentFirstChild: Fiber, newChildren: any[], expirationTime: ExpirationTime): Fiber {
    ...
 }

  return (returnFiber: Fiber, currentFirstChild: Fiber, newChild: any, expirationTime: ExpirationTime): Fiber => {
    // 处理fragment
    const isUnkeyedTopLevelFragment = isObject(newChild) && newChild.type === REACT_FRAGMENT_TYPE && newChild.key === null
    if (isUnkeyedTopLevelFragment) {
      newChild = newChild.props.children
    }

    if (isObject(newChild)) {
      switch (newChild.$$typeof) {
        case REACT_ELEMENT_TYPE:
          return placeSingleChild(reconcileSingleElement(returnFiber, currentFirstChild, newChild, expirationTime))
        case REACT_PORTAL_TYPE:
          return placeSingleChild(reconcileSinglePortal(returnFiber, currentFirstChild, newChild, expirationTime))
      }
    }

    if (isText(newChild)) {
      return placeSingleChild(reconcileSingleTextNode(returnFiber, currentFirstChild, newChild, expirationTime))
    }

    if (isArray(newChild)) {
      return reconcileChildrenArray(returnFiber, currentFirstChild, newChild, expirationTime)
    }

    if (typeof newChild === 'undefined' && !isUnkeyedTopLevelFragment) {
      if (returnFiber.tag === ClassComponent) {
        console.error('render必须返回内容')
      }
    }

    return deleteRemainingChildren(returnFiber, currentFirstChild)
  }
}
```

整个模块的入口，主要区分了几种类型，嗯，也就是允许我们在JSX中写的那几种子类型：
- 单个`react element`
- 单个`portal element`
- 文本
- 数组

不管是哪种类型，都会删除无用的节点，所以，先看删除节点的方法：
```javaScript
  // 单个删除
  function deleteChild(returnFiber: Fiber, childToDelete: Fiber) {
    if (!shouldTrackSideEffects) {
      return
    }

    // 清除 effect fiber
    const last = returnFiber.lastEffect
    if (last !== null) {
      last.nextEffect = childToDelete
      returnFiber.lastEffect = childToDelete
    } else {
      returnFiber.firstEffect = returnFiber.lastEffect = childToDelete
    }
    childToDelete.nextEffect = null

    // 挂上删除的标识
    childToDelete.effectTag = Deletion
  }

  // 批量删除
  function deleteRemainingChildren(returnFiber: Fiber, currentFirstChild: Fiber) {
    if (!shouldTrackSideEffects) {
      return null
    }

    let childToDelete: Fiber = currentFirstChild
    while (childToDelete !== null) {
      deleteChild(returnFiber, childToDelete)
      childToDelete = childToDelete.sibling
    }

    return null
  }
```

### 单个节点
```javaScript
placeSingleChild(reconcileSingleElement(returnFiber, currentFirstChild, newChild, expirationTime))
```
单个节点的处理比较简单
- 拿新旧节点作比较，如果key跟type都相等，就直接复用之前的`fiber`。反正，就创建一个新的`fiber`，effectTag挂上'placement'，说明是个新增节点，(`fragment`判断新旧是否都是`fragment`，`portal`判断`containerInfo`)
- 删除多余节点

```javaScript
  function placeSingleChild(newFiber: Fiber): Fiber {
    // 更新且是新增节点，打上标
    if (shouldTrackSideEffects && newFiber.alternate === null) {
      newFiber.effectTag = Placement
    }
    return newFiber
  }

  function reconcileSingleElement(returnFiber: Fiber, currentFirstChild: Fiber, element: ReactElement, expirationTime: ExpirationTime): Fiber {
    let child: Fiber = currentFirstChild

    while (child != null) {
      if (child.key === element.key) {
        if (child.tag === Fragment ? element.type === REACT_FRAGMENT_TYPE : child.elementType === element.type) {
          deleteRemainingChildren(returnFiber, child.sibling)

          const existing = useFiber(child, element.type === REACT_FRAGMENT_TYPE ? element.props.children : element.props)
          existing.ref = element.ref
          existing.return = returnFiber

          return existing
        } else {
          deleteRemainingChildren(returnFiber, child)
          break
        }
      } else {
        deleteChild(returnFiber, child)
      }

      child = child.sibling
    }

    const created = createFiberFromElement(element, returnFiber.mode, expirationTime)
    created.ref = element.ref
    created.return = returnFiber

    return created
  }
```

### 文本
文本的处理类似于单个节点，如果旧节点也是文本节点，直接复用之前的`fiber`，反正创建新节点，当然，别忘记删除多余节点

```javaScript
  function reconcileSingleTextNode(returnFiber: Fiber, currentFirstChild: Fiber, textContent: string, expirationTime: ExpirationTime): Fiber {
    if (currentFirstChild !== null && currentFirstChild.tag === HostText) {
      deleteRemainingChildren(returnFiber, currentFirstChild.sibling)

      const existing = useFiber(currentFirstChild, textContent)
      existing.return = returnFiber

      return existing
    }

    deleteRemainingChildren(returnFiber, currentFirstChild)
    const created = createFiberFromText(textContent, returnFiber.mode, expirationTime)
    created.return = returnFiber

    return created
  }
```

### 数组
数组的处理则相对复杂了很多















