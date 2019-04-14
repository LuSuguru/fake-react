import { getClosestInstanceFromNode, getNodeFromInstance } from '../../react-dom/dom/dom-component-tree'
import { Fiber } from '../../react-fiber/fiber'
import { PluginModule, StaticSyntheticEvent, TopLevelType } from '../../react-type/event-type'
import { accumulateEnterLeaveDispatches } from '../propagators'
import SyntheticEvent from '../synthetic-event'
import SyntheticMouseEvent from '../synthetic-event/mouse-event'
import SyntheticPointerEvent from '../synthetic-event/pointer-event'
import { TOP_MOUSE_OUT, TOP_MOUSE_OVER, TOP_POINTER_OUT, TOP_POINTER_OVER } from '../top-level-type'

const eventTypes = {
  mouseEnter: {
    registrationName: 'onMouseEnter',
    dependencies: [TOP_MOUSE_OUT, TOP_MOUSE_OVER],
  },
  mouseLeave: {
    registrationName: 'onMouseLeave',
    dependencies: [TOP_MOUSE_OUT, TOP_MOUSE_OVER],
  },
  pointerEnter: {
    registrationName: 'onPointerEnter',
    dependencies: [TOP_POINTER_OUT, TOP_POINTER_OVER],
  },
  pointerLeave: {
    registrationName: 'onPointerLeave',
    dependencies: [TOP_POINTER_OUT, TOP_POINTER_OVER],
  },
}

const EnterLeaveEventPlugin: PluginModule<MouseEvent> = {
  eventTypes,
  extractEvents(topLevelType: TopLevelType, targetInst: Fiber, nativeEvent: MouseEvent, nativeEventTarget: EventTarget): SyntheticEvent {
    const isOverEvent = topLevelType === TOP_MOUSE_OVER || topLevelType === TOP_POINTER_OVER
    const isOutEvent = topLevelType === TOP_MOUSE_OUT || topLevelType === TOP_POINTER_OUT

    if (isOverEvent && (nativeEvent.relatedTarget || nativeEvent.fromElement)) {
      return null
    }

    if (!isOutEvent && !isOverEvent) {
      return null
    }

    let win: any
    if ((nativeEventTarget as any).window === nativeEventTarget) {
      win = nativeEventTarget
    } else {
      const doc: any = (nativeEventTarget as Element).ownerDocument
      if (doc) {
        win = doc.defaultView || doc.parentWindow
      } else {
        win = window
      }
    }

    let from: Fiber
    let to: Fiber
    if (isOutEvent) {
      from = targetInst
      const related = nativeEvent.relatedTarget || nativeEvent.toElement
      to = related ? getClosestInstanceFromNode(related) : null
    } else {
      from = null
      to = targetInst
    }

    if (from === to) {
      return null
    }

    let eventInterface: StaticSyntheticEvent
    let leaveEventType
    let enterEventType
    let eventTypePrefix

    if (topLevelType === TOP_MOUSE_OUT || topLevelType === TOP_MOUSE_OVER) {
      eventInterface = SyntheticMouseEvent
      leaveEventType = eventTypes.mouseLeave
      enterEventType = eventTypes.mouseEnter
      eventTypePrefix = 'mouse'
    } else if (
      topLevelType === TOP_POINTER_OUT ||
      topLevelType === TOP_POINTER_OVER
    ) {
      eventInterface = SyntheticPointerEvent
      leaveEventType = eventTypes.pointerLeave
      enterEventType = eventTypes.pointerEnter
      eventTypePrefix = 'pointer'
    }

    const fromNode = from == null ? win : getNodeFromInstance(from)
    const toNode = to == null ? win : getNodeFromInstance(to)

    const leave = eventInterface.getPooled(
      leaveEventType,
      from,
      nativeEvent,
      nativeEventTarget,
    )
    leave.type = eventTypePrefix + 'leave'
    leave.target = fromNode
    leave.relatedTarget = toNode

    const enter = eventInterface.getPooled(
      enterEventType,
      to,
      nativeEvent,
      nativeEventTarget,
    )
    enter.type = eventTypePrefix + 'enter'
    enter.target = toNode
    enter.relatedTarget = fromNode

    accumulateEnterLeaveDispatches(leave, enter, from, to)

    return [leave, enter]
  },
}

export default EnterLeaveEventPlugin
