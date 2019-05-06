import { getClosestInstanceFromNode } from '../../react-dom/dom/dom-component-tree'
import { Fiber } from '../../react-fiber/fiber'
import { isFiberMounted } from '../../react-fiber/fiber-tree-reflection'
import { AnyNativeEvent, TopLevelType } from '../../react-type/event-type'
import { HostRoot } from '../../react-type/tag-type'
import { addEventBubbledListener, addEventCaptureListener } from '../../utils/browser'
import { isNumber } from '../../utils/getType'
import { getEventTarget } from '../event-info/get-event-target'
import { batchedUpdates, interactiveUpdates } from '../generic-batching'
import { runExtractedEventsInBatch } from '../plugin-hub'
import SimpleEventPlugin from './simple-event-plugin'

export interface BookKeeping {
  topLevelType?: TopLevelType,
  nativeEvent?: AnyNativeEvent,
  targetInst: Fiber,
  ancestors: Fiber[]
}

const { isInteractiveTopLevelEventType } = SimpleEventPlugin

const CALLBACK_BOOKKEEPING_POOL_SIZE = 10
const callbackBookkeepingPool: BookKeeping[] = []

export let _enabled: boolean = true

function setBrowserEventEmitterisEnabled(enabled?: boolean) {
  _enabled = !!enabled
}

function getBrowserEventEmitterisEnabled() {
  return _enabled
}

function getTopLevelCallbackBookKeeping(topLevelType: TopLevelType, nativeEvent: AnyNativeEvent, targetInst: Fiber): BookKeeping {
  if (callbackBookkeepingPool.length) {
    const instance: BookKeeping = callbackBookkeepingPool.pop()

    instance.topLevelType = topLevelType
    instance.nativeEvent = nativeEvent
    instance.targetInst = targetInst
    return instance
  }

  return {
    topLevelType,
    nativeEvent,
    targetInst,
    ancestors: [],
  }
}

function releaseTopLevelCallbackBookKeeping(instance: BookKeeping) {
  instance.topLevelType = null
  instance.nativeEvent = null
  instance.targetInst = null
  instance.ancestors.length = 0

  if (callbackBookkeepingPool.length < CALLBACK_BOOKKEEPING_POOL_SIZE) {
    callbackBookkeepingPool.push(instance)
  }
}

function handleTopLevel(bookKeeping: BookKeeping) {
  let targetInst: Fiber = bookKeeping.targetInst
  let ancestor: Fiber = targetInst

  do {
    if (!ancestor) {
      bookKeeping.ancestors.push(ancestor)
      break
    }

    const root = findRootContainerNode(ancestor)
    if (!root) {
      break
    }

    bookKeeping.ancestors.push(ancestor)
    ancestor = getClosestInstanceFromNode(root)
  } while (ancestor)

  bookKeeping.ancestors.forEach((target: Fiber) => {
    targetInst = target

    runExtractedEventsInBatch(bookKeeping.topLevelType, targetInst, bookKeeping.nativeEvent, getEventTarget(bookKeeping.nativeEvent))
  })
}

function findRootContainerNode(inst: Fiber) {
  while (inst.return) {
    inst = inst.return
  }

  if (inst.tag !== HostRoot) {
    return null
  }

  return inst.stateNode.containerInfo
}

function dispatchEvent(topLevelType: TopLevelType, nativeEvent: AnyNativeEvent) {
  if (!_enabled) {
    return
  }

  const nativeEventTarget = getEventTarget(nativeEvent)
  let targetInst: Fiber = getClosestInstanceFromNode(nativeEventTarget)

  if (targetInst !== null && isNumber(targetInst.tag) && !isFiberMounted(targetInst)) {
    targetInst = null
  }

  const bookKeeping = getTopLevelCallbackBookKeeping(topLevelType, nativeEvent, targetInst)

  try {
    batchedUpdates(handleTopLevel, bookKeeping)
  } catch {
    releaseTopLevelCallbackBookKeeping(bookKeeping)
  }
}

function dispatchInteractiveEvent(topLevelType: TopLevelType, nativeEvent: AnyNativeEvent) {
  interactiveUpdates(dispatchEvent, topLevelType, nativeEvent)
}

function trapBubbledEvent(topLevelType: TopLevelType, element: Document | Element) {
  if (!element) {
    return null
  }

  const dispatch = isInteractiveTopLevelEventType(topLevelType) ? dispatchInteractiveEvent : dispatchEvent
  addEventBubbledListener(element, topLevelType, dispatch.bind(null, topLevelType))
}

function trapCaptureEvent(topLevelType: TopLevelType, element: Document | Element) {
  if (!element) {
    return null
  }

  const dispatch = isInteractiveTopLevelEventType(topLevelType) ? dispatchInteractiveEvent : dispatchEvent
  addEventCaptureListener(element, topLevelType, dispatch.bind(null, topLevelType))
}

export {
  setBrowserEventEmitterisEnabled,
  getBrowserEventEmitterisEnabled,
  trapBubbledEvent,
  trapCaptureEvent,
}
