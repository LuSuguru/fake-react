import { Fiber } from '../react-fiber/fiber'
import { DispatchConfig } from '../react-type/event-type'

const EVENT_POOL_SIZE = 10


function functionThatReturnsTrue() {
  return true
}

function functionThatReturnsFalse() {
  return false
}

class SyntheticEvent {
  static Interface = {
    type: null,
    target: null,
    currentTarget() {
      return null
    },
    eventPhase: null,
    bubbles: null,
    cancelable: null,
    timeStamp(event) {
      return event.timeStamp || Date.now()
    },
    defaultPrevented: null,
    isTrusted: null,
  }

  static eventPool = []

  static getPooled(dispatchConfig: DispatchConfig, targetInst: Fiber, nativeEvent: Event, nativeEventTarget: EventTarget) {
    if (this.eventPool.length) {
      const instance = this.eventPool.pop()
      instance.init(dispatchConfig, targetInst, nativeEvent, nativeEventTarget)

      return instance
    } else {
      return new this(dispatchConfig, targetInst, nativeEvent, nativeEventTarget)
    }
  }

  static release(event: SyntheticEvent) {
    event.destructor()

    if (this.eventPool.length < EVENT_POOL_SIZE) {
      this.eventPool.push(event)
    }
  }

  dispatchConfig: DispatchConfig
  nativeEvent: Event
  target: EventTarget
  defaultPrevented: boolean
  isDefaultPrevented: () => boolean
  isPropagationStopped: () => boolean
  private _targetInst: Fiber
  private _dispatchListeners: Function
  private _dispatchInstances: Function

  constructor(dispatchConfig: DispatchConfig, targetInst: Fiber, nativeEvent: Event, nativeEventTarget: EventTarget) {
    this.init(dispatchConfig, targetInst, nativeEvent, nativeEventTarget)
  }

  init(dispatchConfig: DispatchConfig, targetInst: Fiber, nativeEvent: Event, nativeEventTarget: EventTarget) {
    this.dispatchConfig = dispatchConfig
    this.nativeEvent = nativeEvent
    this._targetInst = targetInst

    const { Interface } = this.constructor as any
    Object.keys(Interface).forEach((propName) => {
      const normalize = Interface[propName]

      if (normalize) {
        this[propName] = normalize(nativeEvent)
      } else if (propName === 'target') {
        this.target = nativeEventTarget
      } else {
        this[propName] = nativeEvent[propName]
      }
    })

    const defaultPrevented = nativeEvent.defaultPrevented != null ? nativeEvent.defaultPrevented : nativeEvent.returnValue === false
    if (defaultPrevented) {
      this.isDefaultPrevented = functionThatReturnsTrue
    } else {
      this.isDefaultPrevented = functionThatReturnsFalse
    }
    this.isPropagationStopped = functionThatReturnsFalse
  }

  isPersistent() {
    return false
  }

  preventDefault() {
    this.defaultPrevented = true
    const event = this.nativeEvent

    if (!event) {
      return
    }

    if (event.preventDefault) {
      event.preventDefault()
    } else if (typeof event.returnValue) {
      event.returnValue = false
    }
    this.isDefaultPrevented = functionThatReturnsTrue
  }

  stopPropagation() {
    const event = this.nativeEvent

    if (!event) {
      return
    }

    if (event.stopPropagation) {
      event.stopPropagation()
    } else if (typeof event.cancelBubble) {
      event.cancelBubble = true
    }
    this.isPropagationStopped = functionThatReturnsTrue
  }

  persist() {
    this.isPersistent = functionThatReturnsTrue
  }

  destructor() {
    const { Interface } = this.constructor as any

    Object.keys(Interface).forEach((propName) => this[propName] = null)

    this.dispatchConfig = null
    this.nativeEvent = null
    this._targetInst = null

    this.isDefaultPrevented = functionThatReturnsFalse
    this.isPropagationStopped = functionThatReturnsFalse
    this._dispatchListeners = null
    this._dispatchInstances = null
  }
}

