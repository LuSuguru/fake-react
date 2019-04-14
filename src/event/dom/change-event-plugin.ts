import { getNodeFromInstance } from '../../react-dom/dom/dom-component-tree'
import { Fiber } from '../../react-fiber/fiber'
import { AnyNativeEvent, TopLevelType } from '../../react-type/event-type'
import { isTextInputElement } from '../../utils/browser'
import isEventSupported from '../event-info/is-event-supported'
import SyntheticEvent from '../synthetic-event'
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

function createAndAccumulateChangeEvent(inst, nativeEvent, target) {
  const event = SyntheticEvent.getPooled(
    eventTypes.change,
    inst,
    nativeEvent,
    target,
  )
  event.type = 'change'
  // Flag this event loop as needing state restore.
  enqueueStateRestore(target)
  accumulateTwoPhaseDispatches(event)
  return event
}
/**
 * For IE shims
 */
let activeElement = null
let activeElementInst = null


function shouldUseChangeEvent(elem: Element) {
  const nodeName = elem.nodeName && elem.nodeName.toLowerCase()
  return (
    nodeName === 'select' || (nodeName === 'input' && elem.type === 'file')
  )
}

function manualDispatchChangeEvent(nativeEvent) {
  const event = createAndAccumulateChangeEvent(
    activeElementInst,
    nativeEvent,
    getEventTarget(nativeEvent),
  )

  // If change and propertychange bubbled, we'd just bind to it like all the
  // other events and have it go through ReactBrowserEventEmitter. Since it
  // doesn't, we manually listen for the events and so we have to enqueue and
  // process the abstract event manually.
  //
  // Batching is necessary here in order to ensure that all event handlers run
  // before the next rerender (including event handlers attached to ancestor
  // elements instead of directly on the input). Without this, controlled
  // components don't work properly in conjunction with event bubbling because
  // the component is rerendered and the value reverted before all the event
  // handlers can run. See https://github.com/facebook/react/issues/708.
  batchedUpdates(runEventInBatch, event)
}

function runEventInBatch(event) {
  runEventsInBatch(event)
}

function getInstIfValueChanged(targetInst) {
  const targetNode = getNodeFromInstance(targetInst)
  if (updateValueIfChanged(targetNode)) {
    return targetInst
  }
}

function getTargetInstForChangeEvent(topLevelType: TopLevelType, targetInst: Fiber) {
  if (topLevelType === TOP_CHANGE) {
    return targetInst
  }
}


/**
 * (For IE <=9) Starts tracking propertychange events on the passed-in element
 * and override the value property so that we can distinguish user events from
 * value changes in JS.
 */
function startWatchingForValueChange(target, targetInst) {
  activeElement = target
  activeElementInst = targetInst
  activeElement.attachEvent('onpropertychange', handlePropertyChange)
}

/**
 * (For IE <=9) Removes the event listeners from the currently-tracked element,
 * if any exists.
 */
function stopWatchingForValueChange() {
  if (!activeElement) {
    return
  }
  activeElement.detachEvent('onpropertychange', handlePropertyChange)
  activeElement = null
  activeElementInst = null
}

/**
 * (For IE <=9) Handles a propertychange event, sending a `change` event if
 * the value of the active element has changed.
 */
function handlePropertyChange(nativeEvent) {
  if (nativeEvent.propertyName !== 'value') {
    return
  }
  if (getInstIfValueChanged(activeElementInst)) {
    manualDispatchChangeEvent(nativeEvent)
  }
}

function handleEventsForInputEventPolyfill(topLevelType, target, targetInst) {
  if (topLevelType === TOP_FOCUS) {
    // In IE9, propertychange fires for most input events but is buggy and
    // doesn't fire when text is deleted, but conveniently, selectionchange
    // appears to fire in all of the remaining cases so we catch those and
    // forward the event if the value has changed
    // In either case, we don't want to call the event handler if the value
    // is changed from JS so we redefine a setter for `.value` that updates
    // our activeElementValue variable, allowing us to ignore those changes
    //
    // stopWatching() should be a noop here but we call it just in case we
    // missed a blur event somehow.
    stopWatchingForValueChange()
    startWatchingForValueChange(target, targetInst)
  } else if (topLevelType === TOP_BLUR) {
    stopWatchingForValueChange()
  }
}

// For IE8 and IE9.
function getTargetInstForInputEventPolyfill(topLevelType, targetInst) {
  if (
    topLevelType === TOP_SELECTION_CHANGE ||
    topLevelType === TOP_KEY_UP ||
    topLevelType === TOP_KEY_DOWN
  ) {
    // On the selectionchange event, the target is just document which isn't
    // helpful for us so just check activeElement instead.
    //
    // 99% of the time, keydown and keyup aren't necessary. IE8 fails to fire
    // propertychange on the first input event after setting `value` from a
    // script and fires only keydown, keypress, keyup. Catching keyup usually
    // gets it and catching keydown lets us fire an event for the first
    // keystroke if user does a key repeat (it'll be a little delayed: right
    // before the second keystroke). Other input methods (e.g., paste) seem to
    // fire selectionchange normally.
    return getInstIfValueChanged(activeElementInst)
  }
}

/**
 * SECTION: handle `click` event
 */
function shouldUseClickEvent(elem) {
  // Use the `click` event to detect changes to checkbox and radio inputs.
  // This approach works across all browsers, whereas `change` does not fire
  // until `blur` in IE8.
  const nodeName = elem.nodeName
  return (
    nodeName &&
    nodeName.toLowerCase() === 'input' &&
    (elem.type === 'checkbox' || elem.type === 'radio')
  )
}

function getTargetInstForClickEvent(topLevelType, targetInst) {
  if (topLevelType === TOP_CLICK) {
    return getInstIfValueChanged(targetInst)
  }
}

function getTargetInstForInputOrChangeEvent(topLevelType, targetInst) {
  if (topLevelType === TOP_INPUT || topLevelType === TOP_CHANGE) {
    return getInstIfValueChanged(targetInst)
  }
}

function handleControlledInputBlur(node) {
  const state = node._wrapperState

  if (!state || !state.controlled || node.type !== 'number') {
    return
  }

  if (!disableInputAttributeSyncing) {
    // If controlled, assign the value attribute to the current value on blur
    setDefaultValue(node, 'number', node.value)
  }
}

const isInputEventSupported: boolean = isEventSupported('input') && (!(document as any).documentMode || (document as any).documentMode > 9)

const ChangeEventPlugin = {
  eventTypes,

  _isInputEventSupported: isInputEventSupported,

  extractEvents(topLevelType: TopLevelType, targetInst: Fiber, nativeEvent: AnyNativeEvent, nativeEventTarget: EventTarget): SyntheticEvent {
    const targetNode: any = targetInst ? getNodeFromInstance(targetInst) : window

    let getTargetInstFunc: Function
    let handleEventFunc: Function
    if (shouldUseChangeEvent(targetNode)) {
      getTargetInstFunc = getTargetInstForChangeEvent
    } else if (isTextInputElement(targetNode)) {
      if (isInputEventSupported) {
        getTargetInstFunc = getTargetInstForInputOrChangeEvent
      } else {
        getTargetInstFunc = getTargetInstForInputEventPolyfill
        handleEventFunc = handleEventsForInputEventPolyfill
      }
    } else if (shouldUseClickEvent(targetNode)) {
      getTargetInstFunc = getTargetInstForClickEvent
    }

    if (getTargetInstFunc) {
      const inst = getTargetInstFunc(topLevelType, targetInst)
      if (inst) {
        const event = createAndAccumulateChangeEvent(
          inst,
          nativeEvent,
          nativeEventTarget,
        )
        return event
      }
    }

    if (handleEventFunc) {
      handleEventFunc(topLevelType, targetNode, targetInst)
    }

    if (topLevelType === TOP_BLUR) {
      handleControlledInputBlur(targetNode)
    }
  },
}

export default ChangeEventPlugin
