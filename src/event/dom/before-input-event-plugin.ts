import { Fiber } from '../../react-fiber/fiber'
import { AnyNativeEvent, DispatchConfig, PluginModule, TopLevelType } from '../../react-type/event-type'
import { accumulateEnterLeaveDispatches, accumulateTwoPhaseDispatches } from '../propagators'
import SyntheticEvent from '../synthetic-event'
import SyntheticCompositionEvent from '../synthetic-event/composition-event'
import { TOP_BLUR, TOP_COMPOSITION_END, TOP_COMPOSITION_START, TOP_COMPOSITION_UPDATE, TOP_KEY_DOWN, TOP_KEY_PRESS, TOP_KEY_UP, TOP_MOUSE_DOWN, TOP_PASTE, TOP_TEXT_INPUT } from '../top-level-type'

const START_KEYCODE: number = 229

const eventTypes = {
  beforeInput: {
    phasedRegistrationNames: {
      bubbled: 'onBeforeInput',
      captured: 'onBeforeInputCapture',
    },
    dependencies: [
      TOP_COMPOSITION_END,
      TOP_KEY_PRESS,
      TOP_TEXT_INPUT,
      TOP_PASTE,
    ],
  },
  compositionEnd: {
    phasedRegistrationNames: {
      bubbled: 'onCompositionEnd',
      captured: 'onCompositionEndCapture',
    },
    dependencies: [
      TOP_BLUR,
      TOP_COMPOSITION_END,
      TOP_KEY_DOWN,
      TOP_KEY_PRESS,
      TOP_KEY_UP,
      TOP_MOUSE_DOWN,
    ],
  },
  compositionStart: {
    phasedRegistrationNames: {
      bubbled: 'onCompositionStart',
      captured: 'onCompositionStartCapture',
    },
    dependencies: [
      TOP_BLUR,
      TOP_COMPOSITION_START,
      TOP_KEY_DOWN,
      TOP_KEY_PRESS,
      TOP_KEY_UP,
      TOP_MOUSE_DOWN,
    ],
  },
  compositionUpdate: {
    phasedRegistrationNames: {
      bubbled: 'onCompositionUpdate',
      captured: 'onCompositionUpdateCapture',
    },
    dependencies: [
      TOP_BLUR,
      TOP_COMPOSITION_UPDATE,
      TOP_KEY_DOWN,
      TOP_KEY_PRESS,
      TOP_KEY_UP,
      TOP_MOUSE_DOWN,
    ],
  },
}

const canUseCompositionEvent: boolean = 'CompositionEvent' in window

function isKeypressCommand(nativeEvent: KeyboardEvent) {
  return (nativeEvent.ctrlKey || nativeEvent.altKey || nativeEvent.metaKey) && !(nativeEvent.ctrlKey && nativeEvent.altKey)
}

function getCompositionEventType(topLevelType: TopLevelType): DispatchConfig {
  switch (topLevelType) {
    case TOP_COMPOSITION_START:
      return eventTypes.compositionStart
    case TOP_COMPOSITION_END:
      return eventTypes.compositionEnd
    case TOP_COMPOSITION_UPDATE:
      return eventTypes.compositionUpdate
  }
}

function getDataFromCustomEvent(nativeEvent: any): string {
  const { detail } = nativeEvent
  if (typeof detail === 'object' && 'data' in detail) {
    return detail.data
  }
  return null
}

function getFallbackBeforeInputChars(topLevelType: TopLevelType, nativeEvent: any): string {
  switch (topLevelType) {
    case TOP_PASTE:
      return null
    case TOP_KEY_PRESS:
      if (!isKeypressCommand(nativeEvent)) {
        if (nativeEvent.char && nativeEvent.char.length > 1) {
          return nativeEvent.char
        } else if (nativeEvent.which) {
          return String.fromCharCode(nativeEvent.which)
        }
      }
      return null
    case TOP_COMPOSITION_END:
      return nativeEvent.data
    default:
      return null
  }
}

function isFallbackCompositionStart(topLevelType: TopLevelType, nativeEvent: KeyboardEvent): boolean {
  return topLevelType === TOP_KEY_DOWN && (nativeEvent as any).keyCode === START_KEYCODE
}

function isFallbackCompositionEnd(topLevelType: TopLevelType, nativeEvent: KeyboardEvent): boolean {
  const END_KEYCODES = [9, 13, 27, 32]

  switch (topLevelType) {
    case TOP_KEY_UP:
      return END_KEYCODES.indexOf(nativeEvent.keyCode) !== -1
    case TOP_KEY_DOWN:
      return nativeEvent.keyCode !== START_KEYCODE
    case TOP_KEY_PRESS:
    case TOP_MOUSE_DOWN:
    case TOP_BLUR:
      return true
    default:
      return false
  }
}

function extractCompositionEvent(topLevelType: TopLevelType, targetInst: Fiber, nativeEvent: KeyboardEvent, nativeTarget: EventTarget): SyntheticEvent {
  let eventType: DispatchConfig = null

  if (canUseCompositionEvent) {
    eventType = getCompositionEventType(topLevelType)
  } else if (isFallbackCompositionStart(topLevelType, nativeEvent)) {
    eventType = eventTypes.compositionStart
  } else if (isFallbackCompositionEnd(topLevelType, nativeEvent)) {
    eventType = eventTypes.compositionEnd
  }

  if (!eventType) {
    return null
  }

  const event: SyntheticEvent = SyntheticCompositionEvent.getPooled(eventType, targetInst, nativeEvent, nativeTarget)
  const customData = getDataFromCustomEvent(event)
  event.data = customData

  accumulateTwoPhaseDispatches(event)
  return event
}

function extractBeforeInputEvent(topLevelType: TopLevelType, targetInst: Fiber, nativeEvent: KeyboardEvent, nativeTarget: EventTarget): SyntheticEvent {
  const chars: string = getFallbackBeforeInputChars(topLevelType, nativeEvent)
  if (!chars) {
    return null
  }

  const event = SyntheticCompositionEvent.getPooled(eventTypes.beforeInput, targetInst, nativeEvent, nativeTarget)

  event.data = chars
  accumulateTwoPhaseDispatches(event)
  return event
}



const BeforeInputEventPlugin: PluginModule<KeyboardEvent> = {
  eventTypes,

  extractEvents(topLevelType: TopLevelType, targetInst: Fiber, nativeEvent: KeyboardEvent, nativeTarget: EventTarget): SyntheticEvent[] | SyntheticEvent {
    const composition = extractCompositionEvent(topLevelType, targetInst, nativeEvent, nativeTarget)
    const beforeInput = extractBeforeInputEvent(topLevelType, targetInst, nativeEvent, nativeTarget)

    if (composition) {
      return beforeInput
    }

    if (beforeInput) {
      return composition
    }

    return [composition, beforeInput]
  },
}

export default BeforeInputEventPlugin
