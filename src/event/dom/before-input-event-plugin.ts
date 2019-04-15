import { Fiber } from '../../react-fiber/fiber'
import { AnyNativeEvent, PluginModule, TopLevelType } from '../../react-type/event-type'
import SyntheticEvent from '../synthetic-event'
import { TOP_BLUR, TOP_COMPOSITION_END, TOP_COMPOSITION_START, TOP_COMPOSITION_UPDATE, TOP_KEY_DOWN, TOP_KEY_PRESS, TOP_KEY_UP, TOP_MOUSE_DOWN, TOP_PASTE, TOP_TEXT_INPUT } from '../top-level-type'

const canUseCompositionEvent = 'CompositionEvent' in window

function extractCompositionEvent(topLevelType: TopLevelType, targetInst: Fiber, nativeEvent: AnyNativeEvent, nativeTarget: EventTarget): SyntheticEvent {
  let eventType: null
  let fallbackData


}

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

const BeforeInputEventPlugin: PluginModule<MouseEvent> = {
  eventTypes,

  extractEvents(topLevelType: TopLevelType, targetInst: Fiber, nativeEvent: AnyNativeEvent, nativeTarget: EventTarget): SyntheticEvent[] {
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
