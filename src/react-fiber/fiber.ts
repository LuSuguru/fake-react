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
import { ConcurrentMode, NoContext, StrictMode, TypeOfMode } from '../react-type/work-type'
import { UpdateQueue } from '../react-update/update-queue'
import { ReactElement } from '../react/react'
import { isFunction, isObject, isString } from '../utils/getType'
import { ExpirationTime, NoWork } from './expiration-time'

function shouldConstruct(Component: Function): boolean {
  const prototype = Component.prototype
  return !!(prototype && prototype.isReactComponent)
}

function isSimpleFunctionComponent(type: any): boolean {
  return (isFunction(type) && !shouldConstruct(type) && type.defaultProps === undefined)
}

class Fiber {
  tag: WorkTag
  key: null | string
  elementType: any = null
  type: any = null
  stateNode: any = null

  return: Fiber = null
  child: Fiber = null
  sibling: Fiber = null
  index: number = 0

  ref: any = null

  pendingProps: any
  memoizedProps: any = null

  updateQueue: UpdateQueue<any> = null

  memoizedState: any = null

  contextDependencies: any = null

  mode: TypeOfMode

  effectTag: SideEffectTag = NoEffect

  nextEffect: Fiber = null
  firstEffect: Fiber = null
  lastEffect: Fiber = null

  expirationTime: ExpirationTime = NoWork
  childExpirationTime: ExpirationTime = NoWork

  alternate: Fiber = null

  constructor(tag: WorkTag, pendingProps: any, key: string | null, mode: TypeOfMode) {
    this.tag = tag
    this.pendingProps = pendingProps
    this.key = key
    this.mode = mode
  }
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

  const fiber = new Fiber(fiberTag, pendingProps, mode, key)
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
}
