
import { readContext } from '../react-context/fiber-context'
import { ExpirationTime, NoWork } from '../react-fiber/expiration-time'
import { Fiber } from '../react-fiber/fiber'
import { computeExpirationTimeForFiber, flushPassiveEffects, requestCurrentTime, scheduleWork } from '../react-scheduler'
import { Passive, SideEffectTag, Update as UpdateTag } from '../react-type/effect-type'
import {
  BasicStateAction,
  Dispatch,
  Dispatcher,
  Effect,
  FunctionComponentUpdateQueue,
  Hook,
  HookEffectTag,
  MountLayout,
  MountPassive,
  NoHookEffect,
  UnmountMutation,
  UnmountPassive,
  Update,
  UpdateQueue,
} from '../react-type/hook-type'
import { markWorkInProgressReceivedUpdate } from '../react-work/begin-work'
import { isFunction } from '../utils/getType'
import ReactCurrentDispatcher from './rect-current-dispatcher'

let didScheduleRenderPhaseUpdate: boolean = false
let renderPhaseUpdates: Map<UpdateQueue<any, any>, Update<any, any>> = null // 存储render阶段的queue update
let numberOfReRenders: number = 0

let renderExpirationTime: ExpirationTime = NoWork
let currentlyRenderingFiber: Fiber = null

let currentHook: Hook = null
let nextCurrentHook: Hook = null

let firstWorkInProgressHook: Hook = null
let workInProgressHook: Hook = null
let nextWorkInProgressHook: Hook = null

let remainingExpirationTime: ExpirationTime = NoWork
let componentUpdateQueue: FunctionComponentUpdateQueue = null
let sideEffectTag: SideEffectTag = 0

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

  // 当前处于render状态
  if (fiber === currentlyRenderingFiber || (alternate !== null && alternate === currentlyRenderingFiber)) {
    didScheduleRenderPhaseUpdate = true // 触发re-render
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
    flushPassiveEffects()

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

    // 当前工作队列为空，在进入render阶段前提前计算下一个state，update时可以根据eagerReducer直接返回eagerState
    if (fiber.expirationTime === NoWork && (alternate === null || alternate.expirationTime === NoWork)) {
      const { eagerReducer } = queue

      if (eagerReducer !== null) {
        const currentState: S = queue.eagerState
        const eagerState = eagerReducer(currentState, action)

        // 存储提前计算的结果，如果在更新阶段reducer没有发生变化，可以直接使用eager state，不需要重新调用eager reducer在调用一遍
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

function areHookInputsEqual(nextDeps: any[], prevDeps: any[] | null): Boolean {
  if (prevDeps === null) {
    return false
  }

  for (let i = 0; i < prevDeps.length && i < nextDeps.length; i++) {
    if (Object.is(nextDeps[i], prevDeps[i])) {
      continue
    }
    return false
  }
  return true
}

const State = {
  basicStateReducer<S>(state: S, action: BasicStateAction<S>): S {
    return isFunction(action) ? (action as Function)(state) : action
  },

  mountState<S>(initialState: (() => S) | S): [S, Dispatch<BasicStateAction<S>>] {
    if (isFunction(initialState)) {
      initialState = (initialState as Function)()
    }
    return Reducer.mountReducer(State.basicStateReducer, initialState)
  },

  updateState<S>(_initialState: (() => S) | S): [S, Dispatch<BasicStateAction<S>>] {
    return Reducer.updateReducer(State.basicStateReducer)
  },
}

const Reducer = {
  mountReducer<S, I, A>(reducer: (s: S, a: A) => S, initialArg: I, init?: (i: I) => S): [S, Dispatch<A>] {
    const hook: Hook = mountWorkInProgressHook()

    let initialState: S = null
    if (init !== null) {
      initialState = init(initialArg)
    } else {
      initialState = initialArg as any
    }

    hook.memoizedState = hook.baseState = initialState
    const queue = hook.queue = {
      last: null,
      dispatch: null,
      eagerReducer: reducer,
      eagerState: initialState,
    }

    const dispatch: Dispatch<A> = queue.dispatch = dispatchAction.bind(null, currentlyRenderingFiber, queue)
    return [hook.memoizedState, dispatch]
  },

  updateReducer<S, A>(reducer: (s: S, a: A) => S): [S, Dispatch<A>] {
    const hook = updateWorkInProgressHook()
    const { queue } = hook

    if (numberOfReRenders > 0) { // 处于re-render状态
      const { dispatch: _dispatch } = queue

      if (renderPhaseUpdates !== null) {
        const firstRenderPhaseUpdate = renderPhaseUpdates.get(queue)
        if (firstRenderPhaseUpdate !== undefined) {
          renderPhaseUpdates.delete(queue)

          let newState = hook.memoizedState
          let update = firstRenderPhaseUpdate
          do {
            const { action } = update
            newState = reducer(newState, action)
            update = update.next
          } while (update !== null)

          if (!Object.is(newState, hook.memoizedState)) { // 标记为更新
            markWorkInProgressReceivedUpdate()
          }

          hook.memoizedState = newState

          if (hook.baseUpdate === queue.last) {
            hook.baseState = newState
          }

          queue.eagerReducer = reducer
          queue.eagerState = newState

          return [newState, _dispatch]
        }
      }

      return [hook.memoizedState, _dispatch]
    }

    const { last } = queue
    const { baseState, baseUpdate } = hook

    let first: Update<S, A> = null
    if (baseUpdate !== null) {
      if (last !== null) { // 从一次停顿的地方开始，为了防止无限循环，需把环形链表解开
        last.next = null
      }
      first = baseUpdate.next
    } else {
      first = last !== null ? last.next : null
    }

    if (first !== null) {
      let newState: S = baseState
      let prevUpdate: Update<S, A> = baseUpdate
      let update: Update<S, A> = first

      let newBaseState: S = null
      let newBaseUpdate: Update<S, A> = null
      let didSkip: boolean = false

      do {
        const updateExpirationTime: ExpirationTime = update.expirationTime
        if (updateExpirationTime < renderExpirationTime) {
          if (!didSkip) { // 优先级低需要跳过，如果是第一个跳过的Update,需要记录下来
            didSkip = true
            newBaseState = newState
            newBaseUpdate = prevUpdate
          }

          if (updateExpirationTime > remainingExpirationTime) {
            remainingExpirationTime = updateExpirationTime
          }
        } else {
          if (update.eagerReducer === reducer) { // 直接使用提前计算的结果
            newState = update.eagerState
          } else {
            const { action } = update
            newState = reducer(newState, action)
          }
        }

        prevUpdate = update
        update = update.next
      } while (update !== null && update !== first)

      if (!didSkip) {
        newBaseState = newState
        newBaseUpdate = prevUpdate
      }

      if (!Object.is(newState, hook.memoizedState)) {
        markWorkInProgressReceivedUpdate()
      }

      hook.memoizedState = newState
      hook.baseUpdate = newBaseUpdate
      hook.baseState = newBaseState

      queue.eagerReducer = reducer
      queue.eagerState = newState
    }

    const { dispatch } = queue
    return [hook.memoizedState, dispatch]
  },
}

const Effect = {
  pushEffect(tag: HookEffectTag, create: () => (() => void), destroy: (() => void), deps?: any[]) {
    const effect: Effect = { tag, create, destroy, deps, next: null }

    if (componentUpdateQueue === null) {
      componentUpdateQueue = { lastEffect: null }
      componentUpdateQueue.lastEffect = effect.next = effect
    } else {
      const { lastEffect } = componentUpdateQueue
      if (lastEffect === null) {
        componentUpdateQueue.lastEffect = effect.next = effect
      } else {
        const firstEffect: Effect = lastEffect.next
        lastEffect.next = effect
        effect.next = firstEffect
        componentUpdateQueue.lastEffect = effect
      }
    }
    return effect
  },

  mountEffectImpl(fiberEffectTag: SideEffectTag, hookEffectTag: HookEffectTag, create: () => (() => void), deps?: any[]) {
    const hook = mountWorkInProgressHook()
    const nextDeps = deps === undefined ? null : deps
    sideEffectTag |= fiberEffectTag

    hook.memoizedState = Effect.pushEffect(hookEffectTag, create, undefined, nextDeps)
  },

  updateEffectImpl(fiberEffectTag: SideEffectTag, hookEffectTag: HookEffectTag, create: () => (() => void), deps?: any[]) {
    const hook = updateWorkInProgressHook()
    const nextDeps = deps === undefined ? null : deps
    let destroy: any

    if (currentHook !== null) {
      const prevEffect: Effect = currentHook.memoizedState
      destroy = prevEffect.destroy

      if (nextDeps !== null) {
        const prevDeps = prevEffect.deps
        if (areHookInputsEqual(nextDeps, prevDeps)) {
          Effect.pushEffect(NoHookEffect, create, destroy, nextDeps)
          return
        }
      }
    }

    sideEffectTag |= fiberEffectTag
    hook.memoizedState = Effect.pushEffect(hookEffectTag, create, destroy, nextDeps)
  },


  mountEffect(create: () => (() => void), deps?: any[]) {
    return Effect.mountEffectImpl(UpdateTag | Passive, UnmountPassive | MountPassive, create, deps)
  },

  updateEffect(create: () => (() => void), deps?: any[]) {
    return Effect.updateEffectImpl(UpdateTag | Passive, UnmountPassive | MountPassive, create, deps)
  },
  mountLayoutEffect(create: () => (() => void), deps?: any[]) {
    return Effect.mountEffectImpl(UpdateTag, UnmountMutation | MountLayout, create, deps)
  },

  updateLayoutEffect(create: () => (() => void), deps?: any[]) {
    return Effect.updateEffectImpl(UpdateTag, UnmountMutation | MountLayout, create, deps)
  },
}

const Callback = {
  mountCallback<T>(callback: T, deps?: any[]): T {
    const hook = mountWorkInProgressHook()
    const nextDeps = deps === undefined ? null : deps
    hook.memoizedState = [callback, nextDeps]
    return callback
  },

  updateCallback<T>(callback: T, deps?: any[]): T {
    const hook = updateWorkInProgressHook()
    const nextDeps = deps === undefined ? null : deps
    const prevState = hook.memoizedState

    if (prevState !== null) {
      if (nextDeps !== null) {
        const prevDeps: any[] | null = prevState[1]
        if (areHookInputsEqual(nextDeps, prevDeps)) {
          return prevState[0]
        }
      }
    }

    hook.memoizedState = [callback, nextDeps]
    return callback
  },
}

const Memo = {
  mountMemo<T>(nextCreate: () => T, deps?: any[] | null): T {
    const hook = mountWorkInProgressHook()
    const nextDeps = deps === undefined ? null : deps
    const nextValue = nextCreate()
    hook.memoizedState = [nextValue, nextDeps]

    return nextValue
  },

  updateMemo<T>(nextCreate: () => T, deps?: any[] | null): T {
    const hook = updateWorkInProgressHook()
    const nextDeps = deps === undefined ? null : deps
    const prevState = hook.memoizedState
    if (prevState !== null) {
      if (nextDeps !== null) {
        const prevDeps: any[] | null = prevState[1]
        if (areHookInputsEqual(nextDeps, prevDeps)) {
          return prevState[0]
        }
      }
    }

    const nextValue = nextCreate()
    hook.memoizedState = [nextValue, nextDeps]
    return nextValue
  },
}

const Ref = {
  mountRef<T>(initialValue: T): { current: T } {
    const hook = mountWorkInProgressHook()
    const ref = { current: initialValue }

    hook.memoizedState = ref
    return ref
  },

  updateRef<T>(_initialValue: T): { current: T } {
    const hook = updateWorkInProgressHook()
    return hook.memoizedState
  },
}

const HooksDispatcherOnMount: Dispatcher = {
  readContext,

  useState: State.mountState,
  useEffect: Effect.mountEffect,
  useContext: readContext,

  useReducer: Reducer.mountReducer,
  useCallback: Callback.mountCallback,
  useMemo: Memo.mountMemo,
  useRef: Ref.mountRef,
  useLayoutEffect: Effect.mountLayoutEffect,
}

const HooksDispatcherOnUpdate: Dispatcher = {
  readContext,

  useState: State.updateState,
  useEffect: Effect.updateEffect,
  useContext: readContext,

  useReducer: Reducer.updateReducer,
  useCallback: Callback.updateCallback,
  useMemo: Memo.updateMemo,
  useRef: Ref.updateRef,
  useLayoutEffect: Effect.updateLayoutEffect,
}

const HooksDispatcherOnEmpty: Dispatcher = {
  readContext,

  useState: () => { throw new Error('请在function中使用') },
  useEffect: () => { throw new Error('请在function中使用') },
  useContext: () => { throw new Error('请在function中使用') },

  useReducer: () => { throw new Error('请在function中使用') },
  useCallback: () => { throw new Error('请在function中使用') },
  useMemo: () => { throw new Error('请在function中使用') },
  useRef: () => { throw new Error('请在function中使用') },
  useLayoutEffect: () => { throw new Error('请在function中使用') },
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

  let children: any = Component(props, refOrContext)

  if (didScheduleRenderPhaseUpdate) {
    do {
      didScheduleRenderPhaseUpdate = false
      numberOfReRenders += 1

      // 从链表头开始
      nextCurrentHook = current !== null ? current.memoizedState : null
      nextWorkInProgressHook = firstWorkInProgressHook

      currentHook = null
      workInProgressHook = null
      componentUpdateQueue = null

      children = Component(props, refOrContext)
    } while (didScheduleRenderPhaseUpdate)

    renderPhaseUpdates = null
    numberOfReRenders = 0
  }

  ReactCurrentDispatcher.current = HooksDispatcherOnEmpty

  currentlyRenderingFiber.memoizedState = firstWorkInProgressHook
  currentlyRenderingFiber.expirationTime = remainingExpirationTime
  currentlyRenderingFiber.updateQueue = componentUpdateQueue as any
  currentlyRenderingFiber.effectTag |= sideEffectTag

  renderExpirationTime = NoWork
  currentlyRenderingFiber = null

  currentHook = null
  nextCurrentHook = null

  firstWorkInProgressHook = null
  workInProgressHook = null
  nextWorkInProgressHook = null

  remainingExpirationTime = NoWork
  componentUpdateQueue = null
  sideEffectTag = 0

  return children
}

function resetHooks() {
  ReactCurrentDispatcher.current = HooksDispatcherOnEmpty

  renderExpirationTime = NoWork
  currentlyRenderingFiber = null

  currentHook = null
  nextCurrentHook = null

  firstWorkInProgressHook = null
  workInProgressHook = null
  nextWorkInProgressHook = null

  remainingExpirationTime = NoWork
  componentUpdateQueue = null
  sideEffectTag = 0

  didScheduleRenderPhaseUpdate = false
  renderPhaseUpdates = null
  numberOfReRenders = 0
}

export {
  HooksDispatcherOnEmpty,
  bailoutHooks,
  renderWithHooks,
  resetHooks,
}
