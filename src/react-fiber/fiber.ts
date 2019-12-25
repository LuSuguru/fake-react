import { ContextDependencyList } from '../react-context/fiber-context'
import { NoEffect, SideEffectTag } from '../react-type/effect-type'
import {
  REACT_CONCURRENT_MODE_TYPE,
  REACT_CONTEXT_TYPE,
  REACT_FORWARD_REF_TYPE,
  REACT_FRAGMENT_TYPE,
  REACT_LAZY_TYPE,
  REACT_MEMO_TYPE,
  REACT_PROFILER_TYPE,
  REACT_PROVIDER_TYPE,
  REACT_STRICT_MODE_TYPE,
  REACT_SUSPENSE_TYPE,
  ReactPortal,
} from '../react-type/react-type'
import {
  ClassComponent,
  ContextConsumer,
  ContextProvider,
  ForwardRef,
  Fragment,
  HostComponent,
  HostPortal,
  HostText,
  IndeterminateComponent,
  LazyComponent,
  MemoComponent,
  Mode,
  Profiler,
  SuspenseComponent,
  WorkTag,
} from '../react-type/tag-type'
import { TypeOfMode } from '../react-type/work-type'
import { UpdateQueue } from '../react-update/update-queue'
import { ReactElement } from '../react/react'
import { isFunction, isObject, isString } from '../utils/getType'
import { ExpirationTime, NoWork } from './expiration-time'

class Fiber {
  // 组件类型 如：function、class、hostComponent 等
  tag: WorkTag
  // ReactElment 里的 key
  key: null | string
  // ReactElement.type，也就是我们调用`createElement`的第一个参数
  elementType: any = null
  // 异步组件resolved之后返回的内容，一般是`function`或者`class`
  type: any = null
  // 自身特性，如：class就是当前 的组件对象，hostComponent 就是 dom 元素
  stateNode: any = null

  return: Fiber = null // 父节点
  child: Fiber = null // 子节点
  sibling: Fiber = null // 右边的兄弟节点
  index: number = 0 // 索引值

  ref: any = null

  pendingProps: any // 未处理的 props,可以理解为 new props
  memoizedProps: any = null // 当前节点的 props,可以理解为 old props

  updateQueue: UpdateQueue<any> = null // 当前节点的任务队列
  memoizedState: any = null // 当前节点的state

  contextDependencies: ContextDependencyList = null // context 列表

  mode: TypeOfMode // 工作类型， NoContext：同步渲染 ConcurrentMode：异步渲染

  effectTag: SideEffectTag = NoEffect // 标记当前节点的一些效果

  nextEffect: Fiber = null
  firstEffect: Fiber = null
  lastEffect: Fiber = null

  // 有两种变化的可能
  // state 的变化使优先级发生变化
  // props 的变化使优先级发生变化
  expirationTime: ExpirationTime = NoWork // 优先级
  childExpirationTime: ExpirationTime = NoWork // 子优先级

  alternate: Fiber = null // 用于调度时的快照

  constructor(tag: WorkTag, pendingProps: any, key: string | null, mode: TypeOfMode) {
    this.tag = tag
    this.pendingProps = pendingProps
    this.key = key
    this.mode = mode
  }
}

function shouldConstruct(Component: Function): boolean {
  const prototype = Component.prototype
  return !!(prototype && prototype.isReactComponent)
}

function isSimpleFunctionComponent(type: any): boolean {
  return (isFunction(type) && !shouldConstruct(type) && type.defaultProps === undefined)
}

function createWorkInProgress(current: Fiber, pendingProps: any): Fiber {
  let workInProgress: Fiber = current.alternate

  if (workInProgress === null) {
    const { tag, key, mode } = current
    workInProgress = new Fiber(tag, pendingProps, key, mode)

    workInProgress.elementType = current.elementType
    workInProgress.type = current.type
    workInProgress.stateNode = current.stateNode

    workInProgress.alternate = current
    current.alternate = workInProgress
  } else {
    workInProgress.pendingProps = pendingProps

    workInProgress.effectTag = NoEffect
    workInProgress.nextEffect = null
    workInProgress.firstEffect = null
    workInProgress.lastEffect = null
  }

  workInProgress.childExpirationTime = current.childExpirationTime
  workInProgress.expirationTime = current.expirationTime

  workInProgress.child = current.child
  workInProgress.sibling = current.sibling

  workInProgress.index = current.index
  workInProgress.ref = current.ref

  workInProgress.memoizedProps = current.memoizedProps
  workInProgress.memoizedState = current.memoizedState
  workInProgress.updateQueue = current.updateQueue

  workInProgress.contextDependencies = current.contextDependencies

  return workInProgress
}

function createFiberFromFragment(pendingProps: any, mode: TypeOfMode, expirationTime: ExpirationTime, key: null | string): Fiber {
  const fiber = new Fiber(Fragment, pendingProps, key, mode)
  fiber.expirationTime = expirationTime

  return fiber
}

function createFiberFromText(pendingProps: any, mode: TypeOfMode, expirationTime: ExpirationTime): Fiber {
  const fiber = new Fiber(HostText, pendingProps, null, mode)
  fiber.expirationTime = expirationTime

  return fiber
}

function createFiberFromPortal(portal: ReactPortal, mode: TypeOfMode, expirationTime: ExpirationTime): Fiber {
  const pendingProps = portal.children !== null ? portal.children : []
  const fiber = new Fiber(HostPortal, pendingProps, portal.key, mode)
  fiber.stateNode = {
    containerInfo: portal.containerInfo,
    pendingChildren: null,
    implementation: portal.implementation,
  }

  fiber.expirationTime = expirationTime

  return fiber
}

function createFiberFromTypeAndProps(type: any, key: null | string, pendingProps: any, mode: TypeOfMode, expirationTime: ExpirationTime): Fiber {
  let fiberTag: WorkTag = IndeterminateComponent
  let resolvedType: any = type

  if (isFunction(type) && shouldConstruct(type)) {
    fiberTag = ClassComponent
  } else if (isString(type)) {
    fiberTag = HostComponent
  } else {
    getTag: switch (type) {
      case REACT_FRAGMENT_TYPE:
        return createFiberFromFragment(pendingProps.children, mode, expirationTime, key)
      case REACT_CONCURRENT_MODE_TYPE:
      case REACT_STRICT_MODE_TYPE:
        fiberTag = Mode
        break
      case REACT_PROFILER_TYPE:
        fiberTag = Profiler
        break
      case REACT_SUSPENSE_TYPE:
        fiberTag = SuspenseComponent
        break
      default: {
        if (isObject(type)) {
          switch (type.$$typeof) {
            case REACT_PROVIDER_TYPE:
              fiberTag = ContextProvider
              break getTag
            case REACT_CONTEXT_TYPE:
              fiberTag = ContextConsumer
              break getTag
            case REACT_FORWARD_REF_TYPE:
              fiberTag = ForwardRef
              break getTag
            case REACT_MEMO_TYPE:
              fiberTag = MemoComponent
              break getTag
            case REACT_LAZY_TYPE:
              fiberTag = LazyComponent
              resolvedType = null
              break
          }
        }
      }
    }
  }

  const fiber = new Fiber(fiberTag, pendingProps, key, mode)
  fiber.elementType = type
  fiber.type = resolvedType
  fiber.expirationTime = expirationTime
  return fiber
}

function createFiberFromElement(element: ReactElement, mode: TypeOfMode, expirationTime: ExpirationTime): Fiber {
  const { type, key, props } = element

  const fiber = createFiberFromTypeAndProps(type, key, props, mode, expirationTime)
  return fiber
}

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

export {
  Fiber,
  shouldConstruct,
  isSimpleFunctionComponent,
  createWorkInProgress,
  createFiberFromElement,
  createFiberFromTypeAndProps,
  createFiberFromFragment,
  createFiberFromText,
  createFiberFromPortal,
  detachFiber,
}
