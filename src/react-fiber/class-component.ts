import { readContext } from '../react-context/fiber-context'
import { computeExpirationTimeForFiber, flushPassiveEffects, requestCurrentTime, scheduleWork } from '../react-scheduler'
import { Snapshot, Update as UpdateTag } from '../react-type/effect-type'
import Update, { ForceUpdate, ReplaceState, UpdateState } from '../react-update/update'
import { changeHasForceUpdate, enqueueUpdate, getHasForceUpdate, processUpdateQueue, UpdateQueue } from '../react-update/update-queue'
import { Component } from '../react/react-component'
import { ReactUpdateQueue } from '../react/react-noop-update-queue'
import { isEmpty, isFunction, isObject } from '../utils/getType'
import { shallowEqual } from '../utils/lib'
import { ExpirationTime, NoWork } from './expiration-time'
import { Fiber } from './fiber'
import { isMounted } from './fiber-tree-reflection'
import { resolveDefaultProps } from './lazy-component'

const classComponentUpdater: ReactUpdateQueue = {
  isMounted,
  enqueueSetState(inst: Component, payload: any, callback: Function) {
    const fiber = inst._reactInternalFiber
    const currentTime = requestCurrentTime()
    const expirationTime = computeExpirationTimeForFiber(currentTime, fiber)
    const update = new Update(expirationTime, UpdateState, payload, callback)

    flushPassiveEffects()
    enqueueUpdate(fiber, update)
    scheduleWork(fiber, expirationTime)
  },

  enqueueReplaceState(inst: Component, payload: any, callback: Function) {
    const fiber = inst._reactInternalFiber
    const currentTime = requestCurrentTime()
    const expirationTime = computeExpirationTimeForFiber(currentTime, fiber)
    const update = new Update(expirationTime, ReplaceState, payload, callback)

    flushPassiveEffects()
    enqueueUpdate(fiber, update)
    scheduleWork(fiber, expirationTime)
  },

  enqueueForceUpdate(inst: Component, callback: Function) {
    const fiber = inst._reactInternalFiber
    const currentTime = requestCurrentTime()
    const expirationTime = computeExpirationTimeForFiber(currentTime, fiber)
    const update = new Update(expirationTime, ForceUpdate, null, callback)


    flushPassiveEffects()
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

function checkShouldComponentUpdate(instance: any, ctor: any, oldProps: any, newProps: any, oldState: any, newState: any, newContext: any) {
  if (isFunction(instance.shouldComponentUpdate)) {
    const shouldUpdate = instance.shouldComponentUpdate(newProps, newState, newContext)
    return shouldUpdate
  }

  if (ctor.isPureReactComponent) {
    !shallowEqual(oldProps, newProps) || !shallowEqual(oldState, newState)
  }
  return true
}

function addOptionClassInstace(workInProgress: Fiber, instance: Component) {
  instance.updater = classComponentUpdater
  workInProgress.stateNode = instance

  instance._reactInternalFiber = workInProgress
}

function constructClassInstance(workInProgress: Fiber, ctor: any, props: any): any {
  let context: any = null
  const { contextType } = ctor

  if (isObject(contextType)) {
    context = readContext(contextType)
  }

  const instance = new ctor(props, context)
  workInProgress.memoizedState = isEmpty(instance.state) ? null : instance.state
  addOptionClassInstace(workInProgress, instance)

  return instance
}

function mountClassInstance(workInProgress: Fiber, ctor: any, newProps: any, renderExpirationTime: ExpirationTime) {
  const { stateNode: instance, memoizedState } = workInProgress
  instance.props = newProps
  instance.state = memoizedState
  instance.refs = {}

  const { contextType } = ctor
  if (isObject(contextType)) {
    instance.context = readContext(contextType)
  }

  let updateQueue: UpdateQueue<any> = workInProgress.updateQueue
  if (updateQueue !== null) {
    processUpdateQueue(workInProgress, updateQueue, newProps, instance, renderExpirationTime)
    instance.state = workInProgress.memoizedState
  }

  const { getDerivedStateFromProps } = ctor
  if (isFunction(getDerivedStateFromProps)) {
    applyDerivedStateFromProps(workInProgress, getDerivedStateFromProps, newProps)
    instance.state = workInProgress.memoizedState
  }

  const haveNewLifecycle = isFunction(ctor.getDerivedStateFromProps) && isFunction(instance.getSnapshotBeforeUpdate)
  const haveComponentWillMount = isFunction(instance.UNSAFE_componentWillMount) && isFunction(instance.componentWillMount)
  if (!haveNewLifecycle && haveComponentWillMount) {
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

  const oldContext = instance.context
  const { contextType } = ctor
  let nextContext: any = null
  if (isObject(contextType)) {
    nextContext = readContext(contextType)
  }

  const { getDerivedStateFromProps } = ctor

  const haveNewLifecycles = isFunction(getDerivedStateFromProps) || isFunction(instance.getSnapshotBeforeUpdate)
  const havecomponentWillReceiveProps = isFunction(instance.UNSAFE_componentWillReceiveProps) || isFunction(instance.componentWillReceiveProps)
  if (!haveNewLifecycles && havecomponentWillReceiveProps) {
    if (oldProps !== newProps || oldContext !== nextContext) {
      applyComponentWillReceiveProps(instance, newProps, nextContext)
    }
  }

  changeHasForceUpdate(false)

  const oldState = workInProgress.memoizedState
  let newState: any = (instance.state = oldState)

  const updateQueue = workInProgress.updateQueue
  if (updateQueue !== null) {
    processUpdateQueue(workInProgress, updateQueue, newProps, instance, renderExpirationTime)
    newState = workInProgress.memoizedState
  }

  const haveComponentDidMount = isFunction(instance.componentDidMount)
  if (oldProps === newProps && oldState === newState && !getHasForceUpdate()) {
    if (haveComponentDidMount) {
      workInProgress.effectTag |= UpdateTag
    }
    return false
  }

  if (isFunction(getDerivedStateFromProps)) {
    applyDerivedStateFromProps(workInProgress, getDerivedStateFromProps, newProps)
    newState = workInProgress.memoizedState
  }

  const shouldUpdate = getHasForceUpdate() || checkShouldComponentUpdate(instance, ctor, oldProps, newProps, oldState, newState, nextContext)

  if (shouldUpdate) {
    if (!haveNewLifecycles) {
      if (isFunction(instance.componentWillMount)) {
        instance.componentWillMount()
      }
      if (isFunction(instance.UNSAFE_componentWillMount)) {
        instance.UNSAFE_componentWillMount()
      }
    }
  } else {
    workInProgress.memoizedProps = newProps
    workInProgress.memoizedState = newState
  }

  if (haveComponentDidMount) {
    workInProgress.effectTag |= UpdateTag
  }

  instance.props = newProps
  instance.state = newState
  instance.context = nextContext

  return shouldUpdate
}

function updateClassInstance(current: Fiber, workInProgress: Fiber, ctor: any, newProps: any, renderExpirationTime: ExpirationTime): boolean {
  const { stateNode: instance } = workInProgress

  const oldProps = workInProgress.memoizedProps
  instance.props = workInProgress.type === workInProgress.elementType ? oldProps : resolveDefaultProps(workInProgress.type, oldProps)

  const oldContext = instance.context
  const { contextType } = ctor
  let nextContext: any = null
  if (typeof contextType === 'object' && contextType !== null) {
    nextContext = readContext(contextType)
  }

  const { getDerivedStateFromProps } = ctor

  const haveNewLifecycles = isFunction(getDerivedStateFromProps) || isFunction(instance.getSnapshotBeforeUpdate)
  const havecomponentWillReceiveProps = isFunction(instance.UNSAFE_componentWillReceiveProps) || isFunction(instance.componentWillReceiveProps)
  if (!haveNewLifecycles && havecomponentWillReceiveProps) {
    if (oldProps !== newProps || oldContext !== nextContext) {
      applyComponentWillReceiveProps(instance, newProps, nextContext)
    }
  }

  changeHasForceUpdate(false)

  const oldState = workInProgress.memoizedState
  let newState: any = (instance.state = oldState)

  const updateQueue = workInProgress.updateQueue
  if (updateQueue !== null) {
    processUpdateQueue(workInProgress, updateQueue, newProps, instance, renderExpirationTime)
    newState = workInProgress.memoizedState
  }

  if (oldProps === newProps && oldState === newState && !getHasForceUpdate()) {
    if (isFunction(instance.componentDidUpdate)) {
      if (oldProps !== current.memoizedProps || oldState !== current.memoizedState) {
        workInProgress.effectTag |= UpdateTag
      }
    }

    if (isFunction(instance.getSnapshotBeforeUpdate)) {
      if (oldProps !== current.memoizedProps || oldState !== current.memoizedState) {
        workInProgress.effectTag |= Snapshot
      }
    }
    return false
  }

  if (isFunction(getDerivedStateFromProps)) {
    applyDerivedStateFromProps(workInProgress, getDerivedStateFromProps, newProps)
    newState = workInProgress.memoizedState
  }

  const shouldUpdate = getHasForceUpdate() || checkShouldComponentUpdate(instance, ctor, oldProps, newProps, oldState, newState, nextContext)

  if (shouldUpdate) {
    if (!haveNewLifecycles) {
      if (isFunction(instance.componentWillUpdate)) {
        instance.componentWillUpdate(newProps, newState, nextContext)
      }
      if (isFunction(instance.UNSAFE_componentWillUpdate)) {
        instance.UNSAFE_componentWillUpdate(newProps, newState, nextContext)
      }
    }

    if (isFunction(instance.componentDidUpdate)) {
      workInProgress.effectTag |= UpdateTag
    }
    if (isFunction(instance.getSnapshotBeforeUpdate)) {
      workInProgress.effectTag |= Snapshot
    }
  } else {
    if (isFunction(instance.componentDidUpdate)) {
      if (oldProps !== current.memoizedProps || oldState !== current.memoizedState) {
        workInProgress.effectTag |= UpdateTag
      }
    }
    if (isFunction(instance.getSnapshotBeforeUpdate)) {
      if (oldProps !== current.memoizedProps || oldState !== current.memoizedState) {
        workInProgress.effectTag |= Snapshot
      }
    }

    workInProgress.memoizedProps = newProps
    workInProgress.memoizedState = newState
  }

  instance.props = newProps
  instance.state = newState
  instance.context = nextContext

  return shouldUpdate
}

export {
  addOptionClassInstace,
  applyDerivedStateFromProps,
  constructClassInstance,
  mountClassInstance,
  resumeMountClassInstance,
  updateClassInstance,
}
