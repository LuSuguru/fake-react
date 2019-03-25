import { isFunction } from 'util'
import { computeExpirationTimeForFiber, requestCurrentTime, scheduleWork } from '../react-scheduler'
import { Update as UpdateTag } from '../react-type/effect-type'
import Update, { ForceUpdate, ReplaceState, UpdateState } from '../react-update/update'
import { changeHasForceUpdate, enqueueUpdate, getHasForceUpdate, processUpdateQueue, UpdateQueue } from '../react-update/update-queue'
import { Component } from '../react/react-component'
import { ReactUpdateQueue } from '../react/react-noop-update-queue'
import { isEmpty } from '../utils/getType'
import { ExpirationTime, NoWork } from './expiration-time'
import { Fiber } from './fiber'
import { isMounted } from './fiber-tree-reflection'

const classComponentUpdater: ReactUpdateQueue = {
  isMounted,
  enqueueSetState(inst: Component, payload: any, callback: Function) {
    const fiber = inst._reactInternalFiber
    const currentTime = requestCurrentTime()
    const expirationTime = computeExpirationTimeForFiber(currentTime, fiber)
    const update = new Update(expirationTime, UpdateState, payload, callback)

    // flushPassiveEffects() // 事件相关，待实现
    enqueueUpdate(fiber, update)
    scheduleWork(fiber, expirationTime)
  },

  enqueueReplaceState(inst: Component, payload: any, callback: Function) {
    const fiber = inst._reactInternalFiber
    const currentTime = requestCurrentTime()
    const expirationTime = computeExpirationTimeForFiber(currentTime, fiber)
    const update = new Update(expirationTime, ReplaceState, payload, callback)

    // flushPassiveEffects() // 事件相关，待实现
    enqueueUpdate(fiber, update)
    scheduleWork(fiber, expirationTime)
  },

  enqueueForceUpdate(inst: Component, callback: Function) {
    const fiber = inst._reactInternalFiber
    const currentTime = requestCurrentTime()
    const expirationTime = computeExpirationTimeForFiber(currentTime, fiber)
    const update = new Update(expirationTime, ForceUpdate, null, callback)


    // flushPassiveEffects() // 事件相关，待实现
    enqueueUpdate(fiber, update)
    scheduleWork(fiber, expirationTime)
  },
}

function applyDerivedStateFromProps(workInProgress: Fiber, getDerivedStateFromProps: (props: any, state: any) => any, nextProps: any) {
  const { memoizedState: prevState, updateQueue } = workInProgress
  const partialState = getDerivedStateFromProps(nextProps, prevState)

  const memoizedState = isEmpty(partialState) ? prevState : { ...prevState, ...partialState }
  workInProgress.memoizedState = memoizedState
  if (updateQueue !== null && workInProgress.expirationTime === NoWork) {
    updateQueue.baseState = memoizedState
  }
}

function applyComponentWillMount(instance: any) {
  const oldState = instance.state
  if (isFunction(instance.componentWillMount)) {
    instance.componentWillMount()
  }
  if (isFunction(instance.UNSAFE_componentWillMount)) {
    instance.UNSAFE_componentWillMount()
  }

  if (oldState !== instance.state) {
    classComponentUpdater.enqueueReplaceState(instance, instance.state)
  }
}

function applyComponentWillReceiveProps(instance: any, newProps: any, nextContext: any) {
  const oldState = instance.state

  if (isFunction(instance.componentWillReceiveProps)) {
    instance.componentWillReceiveProps(newProps, nextContext)
  }
  if (isFunction(instance.UNSAFE_componentWillReceiveProps)) {
    instance.UNSAFE_componentWillReceiveProps(newProps, nextContext)
  }

  if (oldState !== instance.state) {
    classComponentUpdater.enqueueReplaceState(instance, instance.state)
  }
}



function addOptionClassInstace(workInProgress: Fiber, instance: Component) {
  instance.updater = classComponentUpdater
  workInProgress.stateNode = instance

  instance._reactInternalFiber = workInProgress
}

function constructClassInstance(workInProgress: Fiber, ctor: any, props: any): any {
  // 一波context的骚操作，先省略
  //  let isLegacyContextConsumer = false
  const context: any = null
  //     context = isLegacyContextConsumer
  // ? getMaskedContext(workInProgress, unmaskedContext)
  // : emptyContextObject
  const instance = new ctor(props, context)
  workInProgress.memoizedState = isEmpty(instance.state) ? null : instance.state
  addOptionClassInstace(workInProgress, instance)

  // context操作
  // if(isLegacyContextConsumer) {
  //   cacheContext()
  // }

  return instance
}

function mountClassInstance(workInProgress: Fiber, ctor: any, newProps: any, renderExpirationTime: ExpirationTime) {
  const { stateNode: instance, memoizedState } = workInProgress
  instance.props = newProps
  instance.state = memoizedState
  instance.refs = {}

  // context操作
  // const contextType = ctor.contextType
  // if (typeof contextType === 'object' && contextType !== null) {
  //   instance.context = readContext(contextType)
  // } else {
  //   const unmaskedContext = getUnmaskedContext(workInProgress, ctor, true)
  //   instance.context = getMaskedContext(workInProgress, unmaskedContext)
  // }

  let updateQueue: UpdateQueue<any> = workInProgress.updateQueue
  if (updateQueue !== null) {
    processUpdateQueue(workInProgress, updateQueue, newProps, instance, renderExpirationTime)
    instance.state = workInProgress.memoizedState
  }

  const { getDerivedStateFromProps } = ctor
  if (isFunction(getDerivedStateFromProps)) {
    applyDerivedStateFromProps(workInProgress, getDerivedStateFromProps, newProps)
  }

  if (
    typeof ctor.getDerivedStateFromProps !== 'function' && typeof instance.getSnapshotBeforeUpdate !== 'function'
    && (typeof instance.UNSAFE_componentWillMount === 'function' || typeof instance.componentWillMount === 'function')
  ) {
    applyComponentWillMount(instance)

    updateQueue = workInProgress.updateQueue
    if (updateQueue !== null) {
      processUpdateQueue(workInProgress, updateQueue, newProps, instance, renderExpirationTime)
      instance.state = workInProgress.memoizedState
    }
  }

  if (isFunction(instance.componentDidMount)) {
    workInProgress.effectTag |= UpdateTag
  }
}

function resumeMountClassInstance(workInProgress: Fiber, ctor: any, newProps: any, renderExpirationTime: ExpirationTime): boolean {
  const { stateNode: instance } = workInProgress

  const oldProps = workInProgress.memoizedProps
  instance.props = oldProps

  // context操作
  const oldContext = instance.context
  const contextType = ctor.contextType
  let nextContext
  // if (typeof contextType === 'object' && contextType !== null) {
  //   nextContext = readContext(contextType)
  // } else {
  //   const nextLegacyUnmaskedContext = getUnmaskedContext(
  //     workInProgress,
  //     ctor,
  //     true,
  //   )
  //   nextContext = getMaskedContext(workInProgress, nextLegacyUnmaskedContext)
  // }

  const { getDerivedStateFromProps, getSnapshotBeforeUpdate } = ctor

  const hasNewLifecycles = isFunction(getDerivedStateFromProps) || isFunction(getSnapshotBeforeUpdate)
  const hasOldLifeCycles = isFunction(instance.UNSAFE_componentWillReceiveProps) || isFunction(instance.componentWillReceiveProps)
  if (!hasNewLifecycles && hasOldLifeCycles) {
    if (oldProps !== newProps || oldContext !== nextContext) {
      applyComponentWillReceiveProps(instance, newProps, nextContext)
    }

    changeHasForceUpdate(false)


    const oldState = workInProgress.memoizedState
    let newState: any = (instance.state = oldState)
    const updateQueue = workInProgress.updateQueue
    if (updateQueue !== null) {
      processUpdateQueue(workInProgress, updateQueue, newProps, instance, renderExpirationTime)
      newState = workInProgress.memoizedState
    }

    const havaComponentDidMount = typeof()

    if (oldProps === newProps && oldState === newState && !getHasForceUpdate()) { // !hasContextChanged()) {
      if (typeof instance.componentDidMount === 'function') {
        workInProgress.effectTag |= UpdateTag
      }
      return false
    }
  }
}
export { constructClassInstance, mountClassInstance, resumeMountClassInstance }
