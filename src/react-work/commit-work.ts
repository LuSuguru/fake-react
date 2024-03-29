import { updatePropeties } from '../react-dom/dom/dom-component'
import { updateFiberProps } from '../react-dom/dom/dom-component-tree'
import { setTextContent, setTextInstance } from '../react-dom/dom/property-operation'
import { detachFiber, Fiber } from '../react-fiber/fiber'
import { resolveDefaultProps } from '../react-fiber/lazy-component'
import { ContentReset, Placement, Update } from '../react-type/effect-type'
import {
  Effect as HookEffect,
  FunctionComponentUpdateQueue,
  HookEffectTag,
  MountLayout,
  MountMutation,
  MountPassive,
  NoHookEffect,
  UnmountLayout,
  UnmountMutation,
  UnmountPassive,
  UnmountSnapshot,
} from '../react-type/hook-type'
import {
  ClassComponent,
  DehydratedSuspenseComponent,
  ForwardRef,
  FunctionComponent,
  HostComponent,
  HostPortal,
  HostRoot,
  HostText,
  MemoComponent,
  SimpleMemoComponent,
  SuspenseComponent,
} from '../react-type/tag-type'
import { commitUpdateQueue } from '../react-update/update-queue'
import { appendChild, appendChildToContainer, insertBefore, insertInContainerBefore, removeChild, removeChildFromContainer, setFoucus } from '../utils/browser'
import { isFunction } from '../utils/getType'

function safelyDetachRef(current: Fiber) {
  const { ref } = current
  if (ref !== null) {
    if (isFunction(ref)) {
      try {
        ref(null)
      } catch (error) {
        console.error(error)
        // captureCommitPhaseError(current, refError) 待实现
      }
    } else {
      ref.current = null
    }
  }
}

function safelyCallComponentWillUnmount(current: Fiber) {
  const instance = current.stateNode

  if (isFunction(instance.componentWillUnmount)) {
    try {
      instance.props = current.memoizedProps
      instance.state = current.memoizedState
      instance.componentWillUnmount()
    } catch (unmountError) {
      console.error(unmountError)
      // captureCommitPhaseError(current, unmountError) 待实现
    }
  }
}

function isHostParent(fiber: Fiber) {
  return (
    fiber.tag === HostComponent ||
    fiber.tag === HostRoot ||
    fiber.tag === HostPortal
  )
}

function getHostParentFiber(fiber: Fiber): Fiber {
  let parent: Fiber = fiber.return
  while (parent !== null) {
    if (isHostParent(parent)) {
      return parent
    }
    parent = parent.return
  }
}

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

/**
 * 执行 hook effect list
 * 包括 useEffect，useLayoutEffect，useImperativeHandle
 */
function commitHookEffectList(unMountTag: HookEffectTag, mountTag: HookEffectTag, finishedWork: Fiber) {
  const updateQueue: FunctionComponentUpdateQueue = finishedWork.updateQueue as any
  const lastEffect: HookEffect = updateQueue !== null ? updateQueue.lastEffect : null

  if (lastEffect !== null) {
    const firstEffect: HookEffect = lastEffect.next
    let effect: HookEffect = firstEffect
    do {
      if ((effect.tag & unMountTag) !== NoHookEffect) {
        const { destroy } = effect

        effect.destroy = undefined
        if (destroy !== undefined) {
          (destroy as Function)()
        }
      }

      if ((effect.tag & mountTag) !== NoHookEffect) {
        const { create } = effect
        effect.destroy = create() as any
      }
      effect = effect.next
    } while (effect !== firstEffect)
  }
}

function commitPassiveHookEffects(finishedWork: Fiber) {
  commitHookEffectList(UnmountPassive, NoHookEffect, finishedWork)
  commitHookEffectList(NoHookEffect, MountPassive, finishedWork)
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

function commitResetTextContent(current: Fiber) {
  setTextContent(current.stateNode, '')
}

function commitDetachRef(current: Fiber) {
  const currentRef = current.ref
  if (currentRef !== null) {
    if (isFunction(currentRef)) {
      currentRef(null)
    } else {
      currentRef.current = null
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

function commitWork(_current: Fiber, finishedWork: Fiber) {
  switch (finishedWork.tag) {
    case FunctionComponent:
    case ForwardRef:
    case MemoComponent:
    case SuspenseComponent: {
      // useLayoutEffect 的 destroy()
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

function commitUnmount(current: Fiber) {
  switch (current.tag) {
    case FunctionComponent:
    case ForwardRef:
    case MemoComponent:
    case SimpleMemoComponent: {
      // useEffect or useLayoutEffect
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

function commitNestedUnmounts(root: Fiber) {
  let node: Fiber = root
  while (true) {
    commitUnmount(node)

    if (node.child !== null && node.tag !== HostPortal) {
      node.child.return = node
      node = node.child
      continue
    }
    if (node === root) {
      return
    }
    while (node.sibling === null) {
      if (node.return === null || node.return === root) {
        return
      }
      node = node.return
    }
    node.sibling.return = node.return
    node = node.sibling
  }
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

function commitDeletion(current: Fiber) {
  unmountComponents(current)
  detachFiber(current)
}

function commitLifeCycles(current: Fiber, finishedWork: Fiber) {
  switch (finishedWork.tag) {
    case FunctionComponent:
    case ForwardRef:
    case SimpleMemoComponent:
      // useLayoutEffect 的 create()
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
      if (updateQueue !== null) {
        commitUpdateQueue(updateQueue, instance)
      }
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

export {
  commitBeforeMutationLifecycle,
  commitResetTextContent,
  commitDetachRef,
  commitPlacement,
  commitWork,
  commitDeletion,
  commitLifeCycles,
  commitAttachRef,
  commitPassiveHookEffects,
}
