import { now } from '../utils/browser'

const channel = new MessageChannel()
const port = channel.port2

let scheduledHostCallback: Function = null
let timeoutTime: number = -1

let isMessageEventScheduled: boolean = false
let isAnimationFrameScheduled: boolean = false
let isFlushingHostCallback: boolean = false

let frameDeadline: number = 0  // 从30fps（即30帧）开始调整得到的更适于当前环境的一帧限制时间
let previousFrameTime: number = 33
let activeFrameTime: number = 33 // 30fps为参考值

const ANIMATION_FRAME_TIMEOUT = 100
let raFID: number = -1
let rAFTimeoutID: any = -1

function requestAnimationFrameWithTimeout(callback: Function) {
  raFID = requestAnimationFrame((timestamp) => {
    clearTimeout(rAFTimeoutID)
    callback(timestamp)
  })

  rAFTimeoutID = setTimeout(() => {
    cancelAnimationFrame(raFID)
    callback(now())
  }, ANIMATION_FRAME_TIMEOUT)
}

channel.port1.onmessage = (_event) => {
  isMessageEventScheduled = false

  const prevScheduledCallback = scheduledHostCallback
  const prevTimeoutTime = timeoutTime
  scheduledHostCallback = null
  timeoutTime = -1

  const currentTime = now()

  let didTimeout: boolean = false

  // 是否空闲
  if (frameDeadline - currentTime <= 0) {
    // 当前任务是否超时
    if (prevTimeoutTime !== -1 && prevTimeoutTime <= currentTime) {
      // 超时
      didTimeout = true
    } else {
      // 没有超时，重新起animation frame
      if (!isAnimationFrameScheduled) {
        isAnimationFrameScheduled = true
        requestAnimationFrameWithTimeout(animationTick)
      }
      scheduledHostCallback = prevScheduledCallback
      timeoutTime = prevTimeoutTime
      return
    }
  }

  if (prevScheduledCallback !== null) {
    isFlushingHostCallback = true
    try {
      prevScheduledCallback(didTimeout)
    } finally {
      isFlushingHostCallback = false
    }
  }
}

function animationTick(rafTime: number) {
  if (scheduledHostCallback !== null) {
    requestAnimationFrameWithTimeout(animationTick)
  } else {
    isAnimationFrameScheduled = false
    return
  }

  // 自发地调整使activeFrameTime约为当前设备的帧时间，便于计算帧过期时间
  let nextFrameTime = rafTime - frameDeadline + activeFrameTime
  if (nextFrameTime < activeFrameTime && previousFrameTime < activeFrameTime) {
    // 最小不能小于8ms，也频率就是120hz
    if (nextFrameTime < 8) {
      nextFrameTime = 8
    }
    activeFrameTime = nextFrameTime < previousFrameTime ? previousFrameTime : nextFrameTime
  } else {
    previousFrameTime = nextFrameTime
  }
  frameDeadline = rafTime + activeFrameTime
  if (!isMessageEventScheduled) {
    isMessageEventScheduled = true
    port.postMessage(undefined)
  }
}

function requestHostCallback(callback: Function, absoluteTimeout: number) {
  scheduledHostCallback = callback
  timeoutTime = absoluteTimeout

  // 不等待下一帧，尽快执行下一个callback
  if (isFlushingHostCallback || absoluteTimeout < 0) {
    port.postMessage(undefined)
  } else if (!isAnimationFrameScheduled) {
    isAnimationFrameScheduled = true
    requestAnimationFrameWithTimeout(animationTick)
  }
}

function cancelHostCallback() {
  scheduledHostCallback = null
  timeoutTime = -1
  isMessageEventScheduled = false
}

function shouldYieldToHost() {
  return frameDeadline <= now()
}

export {
  requestHostCallback,
  cancelHostCallback,
  shouldYieldToHost,
}

