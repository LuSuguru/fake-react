import { getNodeFromInstance } from '../../react-dom/dom/dom-component-tree'
import { Fiber } from '../../react-fiber/fiber'
import { AnyNativeEvent, PluginModule, TopLevelType } from '../../react-type/event-type'
import { DOCUMENT_NODE } from '../../react-type/html-type'
import { getActiveElement, isTextInputElement } from '../../utils/browser'
import { shallowEqual } from '../../utils/lib'
import { accumulateTwoPhaseDispatches } from '../propagators'
import SyntheticEvent from '../synthetic-event'
import SyntheticRootEvent from '../synthetic-event/root-event'
import { TOP_BLUR, TOP_CONTEXT_MENU, TOP_DRAG_END, TOP_FOCUS, TOP_KEY_DOWN, TOP_KEY_UP, TOP_MOUSE_DOWN, TOP_MOUSE_UP, TOP_SELECTION_CHANGE } from '../top-level-type'
import { isListeningToAllDependencies } from './browser-event-emitter'

let activeElement: Element = null
let activeElementInst: Fiber = null
let lastSelection: Selection = null
let mouseDown: boolean = false

const eventTypes = {
  select: {
    phasedRegistrationNames: {
      bubbled: 'onSelect',
      captured: 'onSelectCapture',
    },
    dependencies: [
      TOP_BLUR,
      TOP_CONTEXT_MENU,
      TOP_DRAG_END,
      TOP_FOCUS,
      TOP_KEY_DOWN,
      TOP_KEY_UP,
      TOP_MOUSE_DOWN,
      TOP_MOUSE_UP,
      TOP_SELECTION_CHANGE,
    ],
  },
}

function getEventTargetDocument(eventTarget: any): Document {
  return eventTarget.window === eventTarget
    ? eventTarget.document
    : eventTarget.nodeType === DOCUMENT_NODE
      ? eventTarget
      : eventTarget.ownerDocument
}

function constructSelectEvent(nativeEvent: Event, nativeTarget: EventTarget): SyntheticEvent {
  const doc: Document = getEventTargetDocument(nativeTarget)
  if (mouseDown || activeElement == null || activeElement !== getActiveElement(doc)) {
    return null
  }

  const currentSelection: Selection = getSelection()
  if (!lastSelection || !shallowEqual(lastSelection, currentSelection)) {
    lastSelection = currentSelection

    const event = SyntheticRootEvent.getPooled(eventTypes.select, activeElementInst, nativeEvent, nativeTarget)
    event.type = 'select'
    event.target = activeElement

    accumulateTwoPhaseDispatches(event)
    return event
  }
  return null
}

const selectEventPlugin: PluginModule<Event> = {
  eventTypes,

  extractEvents(topLevelType: TopLevelType, targetInst: Fiber, nativeEvent: Event, nativeTarget: EventTarget): SyntheticEvent {
    const doc: Document = getEventTargetDocument(nativeTarget)
    if (!doc || isListeningToAllDependencies('onSelect', doc)) {
      return null
    }

    const targetNode: any = targetInst ? getNodeFromInstance(targetInst) : window

    switch (topLevelType) {
      case TOP_FOCUS:
        if (isTextInputElement(targetNode) || targetNode.contentEditable === 'true') {
          activeElement = targetNode
          activeElementInst = targetInst
          lastSelection = null
        }
        break
      case TOP_BLUR:
        activeElement = null
        activeElementInst = null
        lastSelection = null
        break
      case TOP_MOUSE_DOWN:
        mouseDown = true
        break
      case TOP_CONTEXT_MENU:
      case TOP_MOUSE_UP:
      case TOP_DRAG_END:
        mouseDown = false
        return constructSelectEvent(nativeEvent, nativeTarget)

      case TOP_SELECTION_CHANGE: // IE 11下能监听到
        if ('documentMode' in document && (document as any).documentMode <= 11) {
          break
        }
      case TOP_KEY_DOWN:
      case TOP_KEY_UP:
        return constructSelectEvent(nativeEvent, nativeTarget)
    }
    return null
  },
}

export default selectEventPlugin
