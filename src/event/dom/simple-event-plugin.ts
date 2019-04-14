import { Fiber } from '../../react-fiber/fiber'
import { DispatchConfig, EventTypes, PluginModule, StaticSyntheticEvent, TopLevelType } from '../../react-type/event-type'
import getEventCharCode from '../event-info/get-event-char-code'
import { accumulateTwoPhaseDispatches } from '../propagators'
import SyntheticEvent from '../synthetic-event'
import SyntheticAnimationEvent from '../synthetic-event/animation-event'
import SyntheticClipboardEvent from '../synthetic-event/clipboard-event'
import SyntheticDragEvent from '../synthetic-event/drag-event'
import SyntheticFocusEvent from '../synthetic-event/focus-event'
import SyntheticKeyboardEvent from '../synthetic-event/keyboard-event'
import SyntheticMouseEvent from '../synthetic-event/mouse-event'
import SyntheticPointerEvent from '../synthetic-event/pointer-event'
import SyntheticRootEvent from '../synthetic-event/root-event'
import SyntheticTouchEvent from '../synthetic-event/touch-event'
import SyntheticTransitionEvent from '../synthetic-event/transition-event'
import SyntheticUiEvent from '../synthetic-event/ui-event'
import SyntheticWheelEvent from '../synthetic-event/wheel-event'
import * as DOMTopLevelEventTypes from '../top-level-type'

type EventTuple = [TopLevelType, string]
const interactiveEventTypeNames: EventTuple[] = [
  [DOMTopLevelEventTypes.TOP_BLUR, 'blur'],
  [DOMTopLevelEventTypes.TOP_CANCEL, 'cancel'],
  [DOMTopLevelEventTypes.TOP_CLICK, 'click'],
  [DOMTopLevelEventTypes.TOP_CLOSE, 'close'],
  [DOMTopLevelEventTypes.TOP_CONTEXT_MENU, 'contextMenu'],
  [DOMTopLevelEventTypes.TOP_COPY, 'copy'],
  [DOMTopLevelEventTypes.TOP_CUT, 'cut'],
  [DOMTopLevelEventTypes.TOP_AUX_CLICK, 'auxClick'],
  [DOMTopLevelEventTypes.TOP_DOUBLE_CLICK, 'doubleClick'],
  [DOMTopLevelEventTypes.TOP_DRAG_END, 'dragEnd'],
  [DOMTopLevelEventTypes.TOP_DRAG_START, 'dragStart'],
  [DOMTopLevelEventTypes.TOP_DROP, 'drop'],
  [DOMTopLevelEventTypes.TOP_FOCUS, 'focus'],
  [DOMTopLevelEventTypes.TOP_INPUT, 'input'],
  [DOMTopLevelEventTypes.TOP_INVALID, 'invalid'],
  [DOMTopLevelEventTypes.TOP_KEY_DOWN, 'keyDown'],
  [DOMTopLevelEventTypes.TOP_KEY_PRESS, 'keyPress'],
  [DOMTopLevelEventTypes.TOP_KEY_UP, 'keyUp'],
  [DOMTopLevelEventTypes.TOP_MOUSE_DOWN, 'mouseDown'],
  [DOMTopLevelEventTypes.TOP_MOUSE_UP, 'mouseUp'],
  [DOMTopLevelEventTypes.TOP_PASTE, 'paste'],
  [DOMTopLevelEventTypes.TOP_PAUSE, 'pause'],
  [DOMTopLevelEventTypes.TOP_PLAY, 'play'],
  [DOMTopLevelEventTypes.TOP_POINTER_CANCEL, 'pointerCancel'],
  [DOMTopLevelEventTypes.TOP_POINTER_DOWN, 'pointerDown'],
  [DOMTopLevelEventTypes.TOP_POINTER_UP, 'pointerUp'],
  [DOMTopLevelEventTypes.TOP_RATE_CHANGE, 'rateChange'],
  [DOMTopLevelEventTypes.TOP_RESET, 'reset'],
  [DOMTopLevelEventTypes.TOP_SEEKED, 'seeked'],
  [DOMTopLevelEventTypes.TOP_SUBMIT, 'submit'],
  [DOMTopLevelEventTypes.TOP_TOUCH_CANCEL, 'touchCancel'],
  [DOMTopLevelEventTypes.TOP_TOUCH_END, 'touchEnd'],
  [DOMTopLevelEventTypes.TOP_TOUCH_START, 'touchStart'],
  [DOMTopLevelEventTypes.TOP_VOLUME_CHANGE, 'volumeChange'],
]
const nonInteractiveEventTypeNames: EventTuple[] = [
  [DOMTopLevelEventTypes.TOP_ABORT, 'abort'],
  [DOMTopLevelEventTypes.TOP_ANIMATION_END, 'animationEnd'],
  [DOMTopLevelEventTypes.TOP_ANIMATION_ITERATION, 'animationIteration'],
  [DOMTopLevelEventTypes.TOP_ANIMATION_START, 'animationStart'],
  [DOMTopLevelEventTypes.TOP_CAN_PLAY, 'canPlay'],
  [DOMTopLevelEventTypes.TOP_CAN_PLAY_THROUGH, 'canPlayThrough'],
  [DOMTopLevelEventTypes.TOP_DRAG, 'drag'],
  [DOMTopLevelEventTypes.TOP_DRAG_ENTER, 'dragEnter'],
  [DOMTopLevelEventTypes.TOP_DRAG_EXIT, 'dragExit'],
  [DOMTopLevelEventTypes.TOP_DRAG_LEAVE, 'dragLeave'],
  [DOMTopLevelEventTypes.TOP_DRAG_OVER, 'dragOver'],
  [DOMTopLevelEventTypes.TOP_DURATION_CHANGE, 'durationChange'],
  [DOMTopLevelEventTypes.TOP_EMPTIED, 'emptied'],
  [DOMTopLevelEventTypes.TOP_ENCRYPTED, 'encrypted'],
  [DOMTopLevelEventTypes.TOP_ENDED, 'ended'],
  [DOMTopLevelEventTypes.TOP_ERROR, 'error'],
  [DOMTopLevelEventTypes.TOP_GOT_POINTER_CAPTURE, 'gotPointerCapture'],
  [DOMTopLevelEventTypes.TOP_LOAD, 'load'],
  [DOMTopLevelEventTypes.TOP_LOADED_DATA, 'loadedData'],
  [DOMTopLevelEventTypes.TOP_LOADED_METADATA, 'loadedMetadata'],
  [DOMTopLevelEventTypes.TOP_LOAD_START, 'loadStart'],
  [DOMTopLevelEventTypes.TOP_LOST_POINTER_CAPTURE, 'lostPointerCapture'],
  [DOMTopLevelEventTypes.TOP_MOUSE_MOVE, 'mouseMove'],
  [DOMTopLevelEventTypes.TOP_MOUSE_OUT, 'mouseOut'],
  [DOMTopLevelEventTypes.TOP_MOUSE_OVER, 'mouseOver'],
  [DOMTopLevelEventTypes.TOP_PLAYING, 'playing'],
  [DOMTopLevelEventTypes.TOP_POINTER_MOVE, 'pointerMove'],
  [DOMTopLevelEventTypes.TOP_POINTER_OUT, 'pointerOut'],
  [DOMTopLevelEventTypes.TOP_POINTER_OVER, 'pointerOver'],
  [DOMTopLevelEventTypes.TOP_PROGRESS, 'progress'],
  [DOMTopLevelEventTypes.TOP_SCROLL, 'scroll'],
  [DOMTopLevelEventTypes.TOP_SEEKING, 'seeking'],
  [DOMTopLevelEventTypes.TOP_STALLED, 'stalled'],
  [DOMTopLevelEventTypes.TOP_SUSPEND, 'suspend'],
  [DOMTopLevelEventTypes.TOP_TIME_UPDATE, 'timeUpdate'],
  [DOMTopLevelEventTypes.TOP_TOGGLE, 'toggle'],
  [DOMTopLevelEventTypes.TOP_TOUCH_MOVE, 'touchMove'],
  [DOMTopLevelEventTypes.TOP_TRANSITION_END, 'transitionEnd'],
  [DOMTopLevelEventTypes.TOP_WAITING, 'waiting'],
  [DOMTopLevelEventTypes.TOP_WHEEL, 'wheel'],
]

const eventTypes: EventTypes = {}
const topLevelEventsToDispatchConfig: { [key: string]: DispatchConfig } = {}

function addEventTypeNameToConfig([topEvent, event]: EventTuple, isInteractive: boolean) {
  const capitalizedEvent = event[0].toUpperCase() + event.slice(1)
  const onEvent = 'on' + capitalizedEvent

  const type = {
    phasedRegistrationNames: {
      bubbled: onEvent,
      captured: onEvent + 'Capture',
    },
    dependencies: [topEvent],
    isInteractive,
  }

  eventTypes[event] = type
  topLevelEventsToDispatchConfig[topEvent] = type
}

interactiveEventTypeNames.forEach((eventTuple) => {
  addEventTypeNameToConfig(eventTuple, true)
})
nonInteractiveEventTypeNames.forEach((eventTuple) => {
  addEventTypeNameToConfig(eventTuple, false)
})

const SimpleEventPlugin: PluginModule<MouseEvent> & {
  isInteractiveTopLevelEventType: (topLevelType: TopLevelType) => boolean,
} = {
  eventTypes,
  extractEvents(topLevelType: TopLevelType, targetInst: Fiber, nativeEvent: MouseEvent, nativeEventTarget: EventTarget): SyntheticEvent {
    const dispatchConfig = topLevelEventsToDispatchConfig[topLevelType]
    if (!dispatchConfig) {
      return null
    }

    let EventConstructor: StaticSyntheticEvent
    switch (topLevelType) {
      case DOMTopLevelEventTypes.TOP_KEY_PRESS:
        // Firefox会触发键盘事件，需特殊处理
        if (getEventCharCode(nativeEvent) === 0) {
          return null
        }

      case DOMTopLevelEventTypes.TOP_KEY_DOWN:
      case DOMTopLevelEventTypes.TOP_KEY_UP:
        EventConstructor = SyntheticKeyboardEvent
        break
      case DOMTopLevelEventTypes.TOP_BLUR:
      case DOMTopLevelEventTypes.TOP_FOCUS:
        EventConstructor = SyntheticFocusEvent
        break

      //  Firefox鼠标右击也会触发，需特殊处理
      case DOMTopLevelEventTypes.TOP_CLICK:
        if (nativeEvent.button === 2) {
          return null
        }
      case DOMTopLevelEventTypes.TOP_AUX_CLICK:
      case DOMTopLevelEventTypes.TOP_DOUBLE_CLICK:
      case DOMTopLevelEventTypes.TOP_MOUSE_DOWN:
      case DOMTopLevelEventTypes.TOP_MOUSE_MOVE:
      case DOMTopLevelEventTypes.TOP_MOUSE_UP:
      case DOMTopLevelEventTypes.TOP_MOUSE_OUT:
      case DOMTopLevelEventTypes.TOP_MOUSE_OVER:
      case DOMTopLevelEventTypes.TOP_CONTEXT_MENU:
        EventConstructor = SyntheticMouseEvent
        break
      case DOMTopLevelEventTypes.TOP_DRAG:
      case DOMTopLevelEventTypes.TOP_DRAG_END:
      case DOMTopLevelEventTypes.TOP_DRAG_ENTER:
      case DOMTopLevelEventTypes.TOP_DRAG_EXIT:
      case DOMTopLevelEventTypes.TOP_DRAG_LEAVE:
      case DOMTopLevelEventTypes.TOP_DRAG_OVER:
      case DOMTopLevelEventTypes.TOP_DRAG_START:
      case DOMTopLevelEventTypes.TOP_DROP:
        EventConstructor = SyntheticDragEvent
        break
      case DOMTopLevelEventTypes.TOP_TOUCH_CANCEL:
      case DOMTopLevelEventTypes.TOP_TOUCH_END:
      case DOMTopLevelEventTypes.TOP_TOUCH_MOVE:
      case DOMTopLevelEventTypes.TOP_TOUCH_START:
        EventConstructor = SyntheticTouchEvent
        break
      case DOMTopLevelEventTypes.TOP_ANIMATION_END:
      case DOMTopLevelEventTypes.TOP_ANIMATION_ITERATION:
      case DOMTopLevelEventTypes.TOP_ANIMATION_START:
        EventConstructor = SyntheticAnimationEvent
        break
      case DOMTopLevelEventTypes.TOP_TRANSITION_END:
        EventConstructor = SyntheticTransitionEvent
        break
      case DOMTopLevelEventTypes.TOP_SCROLL:
        EventConstructor = SyntheticUiEvent
        break
      case DOMTopLevelEventTypes.TOP_WHEEL:
        EventConstructor = SyntheticWheelEvent
        break
      case DOMTopLevelEventTypes.TOP_COPY:
      case DOMTopLevelEventTypes.TOP_CUT:
      case DOMTopLevelEventTypes.TOP_PASTE:
        EventConstructor = SyntheticClipboardEvent
        break
      case DOMTopLevelEventTypes.TOP_GOT_POINTER_CAPTURE:
      case DOMTopLevelEventTypes.TOP_LOST_POINTER_CAPTURE:
      case DOMTopLevelEventTypes.TOP_POINTER_CANCEL:
      case DOMTopLevelEventTypes.TOP_POINTER_DOWN:
      case DOMTopLevelEventTypes.TOP_POINTER_MOVE:
      case DOMTopLevelEventTypes.TOP_POINTER_OUT:
      case DOMTopLevelEventTypes.TOP_POINTER_OVER:
      case DOMTopLevelEventTypes.TOP_POINTER_UP:
        EventConstructor = SyntheticPointerEvent
        break
      default:
        EventConstructor = SyntheticRootEvent
        break
    }
    const event = EventConstructor.getPooled(
      dispatchConfig,
      targetInst,
      nativeEvent,
      nativeEventTarget,
    )
    accumulateTwoPhaseDispatches(event) // 设置上层的捕获和冒泡
    return event
  },

  isInteractiveTopLevelEventType(topLevelType: TopLevelType): boolean {
    const config = topLevelEventsToDispatchConfig[topLevelType]
    return config !== undefined && config.isInteractive === true
  },
}

export default SimpleEventPlugin
