
import { readContext } from '../react-context/fiber-context'
import { ExpirationTime, NoWork } from '../react-fiber/expiration-time'
import { Fiber } from '../react-fiber/fiber'
import { computeExpirationTimeForFiber, requestCurrentTime, scheduleWork } from '../react-scheduler'
import { Passive, Update as UpdateTag } from '../react-type/effect-type'
import { BasicStateAction, Dispatch, Dispatcher, Hook, Update, UpdateQueue } from '../react-type/hook-type'
import { isFunction } from '../utils/getType'
import ReactCurrentDispatcher from './rect-current-dispatcher'

let didScheduleRenderPhaseUpdate: boolean = false
let renderPhaseUpdates: Map<UpdateQueue<any, any>, Update<any, any>> = null

let renderExpirationTime: ExpirationTime = NoWork
let currentlyRenderingFiber: Fiber = null
let nextCurrentHook: Hook = null

let currentHook: Hook = null
let nextCurrentHook: Hook = null

let firstWorkInProgressHook: Hook = null
let workInProgressHook: Hook = null
let nextWorkInProgressHook: Hook = null

function mountWorkInProgressHook(): Hook {
  const hook: Hook = {
    memoizedState: null,
    baseState: null,
    baseUpdate: null,
    queue: null,
    next: null,
  }

  if (workInProgressHook === null) {
    firstWorkInProgressHook = workInProgressHook = hook // 第一次
  } else {
    workInProgressHook = workInProgressHook.next = hook // 插入链表中
  }
  return workInProgressHook
}

function updateWorkInProgressHook(): Hook {
  if (nextWorkInProgressHook) {
    workInProgressHook = nextWorkInProgressHook
    nextWorkInProgressHook = workInProgressHook.next

    currentHook = nextCurrentHook
    nextCurrentHook = currentHook !== null ? currentHook.next : null
  } else {
    currentHook = nextCurrentHook

    const newHook: Hook = {
      memoizedState: currentHook.memoizedState,
      baseState: currentHook.baseState,
      queue: currentHook.queue,
      baseUpdate: currentHook.baseUpdate,
      next: null,
    }

    if (workInProgressHook === null) {
      workInProgressHook = firstWorkInProgressHook = newHook // 第一次
    } else {
      workInProgressHook = workInProgressHook.next = newHook// 插入链表中
    }
    nextCurrentHook = currentHook.next
  }
  return workInProgressHook
}

function dispatchAction<S, A>(fiber: Fiber, queue: UpdateQueue<S, A>, action: A) {
  const { alternate } = fiber

  if (fiber === currentlyRenderingFiber || (alternate !== null && alternate === currentlyRenderingFiber)) {
    didScheduleRenderPhaseUpdate = true
    const update: Update<S, A> = {
      expirationTime: renderExpirationTime,
      action,
      eagerReducer: null,
      eagerState: null,
      next: null,
    }

    if (renderPhaseUpdates === null) {
      renderPhaseUpdates = new Map()
    }

    const firstRenderPhaseUpdate = renderPhaseUpdates.get(queue)
    if (firstRenderPhaseUpdate === undefined) {
      renderPhaseUpdates.set(queue, update)
    } else {
      let lastRenderPhaseUpdate = firstRenderPhaseUpdate
      while (lastRenderPhaseUpdate.next !== null) {
        lastRenderPhaseUpdate = lastRenderPhaseUpdate.next
      }
      lastRenderPhaseUpdate.next = update
    }
  } else {
    // flushPassiveEffects() // 待实现

    const currentTime = requestCurrentTime()
    const expirationTime = computeExpirationTimeForFiber(currentTime, fiber)
    const update: Update<S, A> = {
      expirationTime,
      action,
      eagerReducer: null,
      eagerState: null,
      next: null,
    }

    const { last } = queue
    if (last === null) {
      update.next = update // 第一个update,创建环形链表
    } else {
      const first = last.next
      if (first !== null) {
        update.next = first
      }
      last.next = update
    }
    queue.last = update

    if (fiber.expirationTime === NoWork && (alternate === null || alternate.expirationTime === NoWork)) {
      const { eagerReducer } = queue
      if (eagerReducer !== null) {
        const currentState: S = queue.eagerState
        const eagerState = eagerReducer(currentState, action)

        update.eagerReducer = eagerReducer
        update.eagerState = eagerState

        if (Object.is(eagerState, currentState)) {
          return
        }
      }
    }
    scheduleWork(fiber, expirationTime)
  }
}

function basicStateReducer<S>(state: S, action: BasicStateAction<S>): S {
  return isFunction(action) ? (action as Function)(state) : action
},

const State = {
  mountState<S>(initialState: (() => S) | S): [S, Dispatch<BasicStateAction<S>>] {
    const hook: Hook = mountWorkInProgressHook()
    hook.memoizedState = hook.baseState = initialState
    const queue = hook.queue = {
      last: null,
      dispatch: null,
      eagerReducer: basicStateReducer,
      eagerState: initialState,
    }

    const dispatch: Dispatch<BasicStateAction<S>> = queue.dispatch = dispatchAction.bind(null, currentlyRenderingFiber, queue)

    return [hook.memoizedState, dispatch]
  },

  updateState<S>(initialState: (() => S) | S): [S, Dispatch<BasicStateAction<S>>] {
    return updateReducer(basicStateReducer, initialState)
  },
}



const HooksDispatcherOnMount: Dispatcher = {
  readContext,

  useState: mountState,
  useEffect: mountEffect,
  useContext: readContext,

  useReducer: mountReducer,
  useCallback: mountCallback,
  useMemo: mountMemo,
  useRef: mountRef,
  useLayoutEffect: mountLayoutEffect,
}

const HooksDispatcherOnUpdate: Dispatcher = {
  readContext,

  useState: updateState,
  useEffect: updateEffect,
  useContext: readContext,

  useReducer: updateReducer,
  useCallback: updateCallback,
  useMemo: updateMemo,
  useRef: updateRef,
  useLayoutEffect: updateLayoutEffect,
}



function bailoutHooks(current: Fiber, workInProgress: Fiber, expirationTime: ExpirationTime) {
  workInProgress.updateQueue = current.updateQueue
  workInProgress.effectTag &= ~(Passive | UpdateTag)
  if (current.expirationTime <= expirationTime) {
    current.expirationTime = NoWork
  }
}

function renderWithHooks(current: Fiber, workInProgress: Fiber, Component: Function, props: any, refOrContext: any, nextRenderExpirationTime: ExpirationTime): any {
  renderExpirationTime = nextRenderExpirationTime
  currentlyRenderingFiber = workInProgress
  nextCurrentHook = current !== null ? current.memoizedState : null

  ReactCurrentDispatcher.current = nextCurrentHook === null ? HooksDispatcherOnMount : HooksDispatcherOnUpdate

  const children: any = Component(props, refOrContext)
  // 待实现
  // if (didScheduleRenderPhaseUpdate) {

  // }

  return children
}

export { bailoutHooks, renderWithHooks }
