import { now } from '../utils/browser'

let scheduledHostCallback: Function = null
let isMessageEventScheduled: boolean = false
let timeoutTime = -1

let isAnimationFrameScheduled: boolean = false

const frameDeadline: number = 0

const channel = new MessageChannel()
const port = channel.port2

channel.port1.onmessage = (event) => {
  isMessageEventScheduled = true

  const prevScheduledCallback = scheduledHostCallback
  const prevTimeoutTime = timeoutTime
  scheduledHostCallback = null
  timeoutTime = -1

  const currentTime = now()

  let didTimeout: boolean = false

  if (frameDeadline - currentTime <= 0) {
    if (prevTimeoutTime !== -1 && prevTimeoutTime <= currentTime) {
      didTimeout = true
    } else {
      if (!isAnimationFrameScheduled) {
        isAnimationFrameScheduled = true

      }
    }
  }

}
