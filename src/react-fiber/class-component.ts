import { computeExpirationTimeForFiber, requestCurrentTime, scheduleWork } from '../react-scheduler'
import Update, { ForceUpdate, ReplaceState, UpdateState } from '../react-update/update'
import { enqueueUpdate } from '../react-update/update-queue'
import { Component } from '../react/react-component'
import { ReactUpdateQueue } from '../react/react-noop-update-queue'
import { isEmpty } from '../utils/getType'
import { ExpirationTime } from './expiration-time'
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

}

export { constructClassInstance }
