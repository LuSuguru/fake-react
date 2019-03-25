import { isFunction } from 'util'
import { ExpirationTime } from '../react-fiber/expiration-time'
import { Fiber } from '../react-fiber/fiber'
import { DidCapture, ShouldCapture } from '../react-type/effect-type'
import { isEmpty } from '../utils/getType'
import { changeHasForceUpdate } from './update-queue'

type UpdateTag = 0 | 1 | 2 | 3

export const UpdateState = 0
export const ReplaceState = 1
export const ForceUpdate = 2
export const CaptureUpdate = 3

export default class Update<State> {
  expirationTime: ExpirationTime

  tag: UpdateTag
  payload: any = null
  callback: Function = null

  next: Update<State> = null
  nextEffect: Update<State> = null

  constructor(expirationTime: ExpirationTime, tag: UpdateTag, payload?: any, callback?: Function) {
    this.expirationTime = expirationTime
    this.tag = tag

    if (payload) {
      this.payload = payload
    }

    if (!isEmpty(callback)) {
      this.callback = callback
    }
  }
}

export function getStateFromUpdate<State>(workInProgress: Fiber, update: Update<State>, prevState: State, nextProps: any, instance: any): any {
  switch (update.tag) {
    case ReplaceState: {
      const { payload } = update
      if (isFunction(payload)) {
        const nextState = payload.call(instance, prevState, nextProps)
        return nextState
      }
      return payload
    }
    case CaptureUpdate: {
      workInProgress.effectTag = (workInProgress.effectTag & ~ShouldCapture) | DidCapture
    }
    case UpdateState: {
      const { payload } = update
      let partialState: any

      if (isFunction(payload)) {
        partialState = payload.call(instance, prevState, nextProps)
      } else {
        partialState = payload
      }

      if (isEmpty(partialState)) {
        return prevState
      }

      return { ...prevState, ...partialState }
    }

    case ForceUpdate: {
      changeHasForceUpdate(true)
      return prevState
    }
  }

  return prevState
}
