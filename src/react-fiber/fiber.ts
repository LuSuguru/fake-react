import { NoEffect, SideEffectTag } from '../react-type/effect-type'
import { WorkTag } from '../react-type/tag-type'
import { TypeOfMode } from '../react-type/work-type'
import { UpdateQueue } from '../react-update/update-queue'
import { ExpirationTime, NoWork } from './expiration-time'

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

function createWorkInProgress(current: Fiber, pendingProps: any, expirationTime: ExpirationTime): Fiber {


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

export { Fiber, createWorkInProgress }
