import { getNodeFromInstance } from '../../react-dom/dom/dom-component-tree'
import { setDefaultValue } from '../../react-dom/dom/dom-input'
import { updateValueIfChanged } from '../../react-dom/dom/input-value-track'
import { Fiber } from '../../react-fiber/fiber'
import { AnyNativeEvent, PluginModule, TopLevelType } from '../../react-type/event-type'
import { isTextInputElement } from '../../utils/browser'
import { enqueueStateRestore } from '../controlled-component'
import { accumulateTwoPhaseDispatches } from '../propagators'
import SyntheticEvent from '../synthetic-event'
import SyntheticRootEvent from '../synthetic-event/root-event'
import { TOP_BLUR, TOP_CHANGE, TOP_CLICK, TOP_FOCUS, TOP_INPUT, TOP_KEY_DOWN, TOP_KEY_UP, TOP_SELECTION_CHANGE } from '../top-level-type'

const eventTypes = {
  change: {
    phasedRegistrationNames: {
      bubbled: 'onChange',
      captured: 'onChangeCapture',
    },
    dependencies: [
      TOP_BLUR,
      TOP_CHANGE,
      TOP_CLICK,
      TOP_FOCUS,
      TOP_INPUT,
      TOP_KEY_DOWN,
      TOP_KEY_UP,
      TOP_SELECTION_CHANGE,
    ],
  },
}

function createAndAccumulateChangeEvent(inst: Fiber, nativeEvent: Event, target: EventTarget) {
  const event = SyntheticRootEvent.getPooled(eventTypes.change, inst, nativeEvent,
    target)
  event.type = 'change'

  enqueueStateRestore(target)
  accumulateTwoPhaseDispatches(event)
  return event
}

function shouldUseChangeEvent(elem: any) {
  const nodeName: any = elem.nodeName && elem.nodeName.toLowerCase()
  return nodeName === 'select' || (nodeName === 'input' && elem.type === 'file')
}

function shouldUseClickEvent(elem: any) {
  const nodeName = elem.nodeName
  return nodeName && nodeName.toLowerCase() === 'input' && (elem.type === 'checkbox' || elem.type === 'radio')
}

function getInstIfValueChanged(targetInst: Fiber) {
  const targetNode: any = getNodeFromInstance(targetInst)
  if (updateValueIfChanged(targetNode)) {
    return targetInst
  }
}

function getTargetInstForChangeEvent(topLevelType: TopLevelType, targetInst: Fiber) {
  if (topLevelType === TOP_CHANGE) {
    return targetInst
  }
}

function getTargetInstForClickEvent(topLevelType: TopLevelType, targetInst: Fiber) {
  if (topLevelType === TOP_CLICK) {
    return getInstIfValueChanged(targetInst)
  }
}

function getTargetInstForInputOrChangeEvent(topLevelType: TopLevelType, targetInst: Fiber) {
  if (topLevelType === TOP_INPUT || topLevelType === TOP_CHANGE) {
    return getInstIfValueChanged(targetInst)
  }
}

function handleControlledInputBlur(node: any) {
  const state = node._wrapperState

  if (!state || !state.controlled || node.type !== 'number') {
    return
  }

  setDefaultValue(node, 'number', node.value)

}

const ChangeEventPlugin: PluginModule<AnyNativeEvent> = {
  eventTypes,

  extractEvents(topLevelType: TopLevelType, targetInst: Fiber, nativeEvent: AnyNativeEvent, nativeEventTarget: EventTarget): SyntheticEvent {
    const targetNode: any = targetInst ? getNodeFromInstance(targetInst) : window

    let getTargetInstFunc: Function
    if (shouldUseChangeEvent(targetNode)) {
      getTargetInstFunc = getTargetInstForChangeEvent
    } else if (isTextInputElement(targetNode)) {
      getTargetInstFunc = getTargetInstForInputOrChangeEvent
    } else if (shouldUseClickEvent(targetNode)) {
      getTargetInstFunc = getTargetInstForClickEvent
    }

    if (getTargetInstFunc) {
      const inst: Fiber = getTargetInstFunc(topLevelType, targetInst)
      if (inst) {
        const event = createAndAccumulateChangeEvent(inst, nativeEvent as Event, nativeEventTarget)
        return event
      }
    }

    if (topLevelType === TOP_BLUR) {
      handleControlledInputBlur(targetNode)
    }
  },
}

export default ChangeEventPlugin
