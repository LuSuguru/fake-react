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
  },
}

function addOptionClassInstace(workInProgress: Fiber, instance: Component) {
  instance.updater = classComponentUpdater
  instance._reactInternalFiber = workInProgress

  workInProgress.stateNode = instance
}

function constructClassInstance(workInProgress: Fiber, ctor: any, props: any, renderExpirationTime: ExpirationTime) {
  // 一波context的骚操作，先省略
  //  let isLegacyContextConsumer = false
  const context: any = null
  //     context = isLegacyContextConsumer
  // ? getMaskedContext(workInProgress, unmaskedContext)
  // : emptyContextObject
  const instance = new ctor(props, context)
  const state = (workInProgress.memoizedState = isEmpty(instance.state) ? null : instance.state)

}
