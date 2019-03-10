import { ExpirationTime } from './expiration-time'

export const UpdateState = 0
export const ReplaceState = 1
export const ForceUpdate = 2
export const CaptureUpdate = 3

export interface Update<State> {
  expirationTime: ExpirationTime,

  tag: 0 | 1 | 2 | 3,
  payload: any,
  callback: Function | null,

  next: Update<State> | null,
  nextEffect: Update<State> | null,
}

export interface UpdateQueue<State> {
  baseState: State,

  firstUpdate: Update<State> | null,
  lastUpdate: Update<State> | null,

  firstCapturedUpdate: Update<State> | null,
  lastCapturedUpdate: Update<State> | null,

  firstEffect: Update<State> | null,
  lastEffect: Update<State> | null,

  firstCapturedEffect: Update<State> | null,
  lastCapturedEffect: Update<State> | null,
}

