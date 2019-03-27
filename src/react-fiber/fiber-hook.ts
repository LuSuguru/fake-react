
import { Passive, Update } from '../react-type/effect-type'
import { UpdateQueue } from '../react-update/update-queue'
import { ExpirationTime, NoWork } from './expiration-time'
import { Fiber } from './fiber'

export interface Hook {
  memoizedState: any,
  baseState: any,
  baseUpdate: Update<any>,
  queue: UpdateQueue<any>,
  next: Hook,
}

const didScheduleRenderPhaseUpdate: boolean = false

let renderExpirationTime: ExpirationTime = NoWork
let currentlyRenderingFiber: Fiber = null

let nextCurrentHook: Hook = null

function bailoutHooks(current: Fiber, workInProgress: Fiber, expirationTime: ExpirationTime) {
  workInProgress.updateQueue = current.updateQueue
  workInProgress.effectTag &= ~(Passive | Update)
  if (current.expirationTime <= expirationTime) {
    current.expirationTime = NoWork
  }
}

function renderWithHooks(current: Fiber, workInProgress: Fiber, Component: Function, props: any, refOrContext: any, nextRenderExpirationTime: ExpirationTime): any {
  renderExpirationTime = nextRenderExpirationTime
  currentlyRenderingFiber = workInProgress

  nextCurrentHook = current !== null ? current.memoizedState : null

  // ReactCurrentDispatcher.current = nextCurrentHook === null ? HooksDispatcherOnMount : HooksDispatcherOnUpdate

  const children: any = Component(props, refOrContext)
  // 待实现
  // if (didScheduleRenderPhaseUpdate) {

  // }

  return children
}

export { bailoutHooks, renderWithHooks }
