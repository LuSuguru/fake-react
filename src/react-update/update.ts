import { ExpirationTime } from '../react-fiber/expiration-time'
import { isEmpty } from '../utils/getType'

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
