import { Fiber } from '../react-fiber/fiber'
import { AnyNativeEvent, PluginModule, TopLevelType } from '../react-type/event-type'
import { accumulateInto, forEachAccumulated } from '../utils/lib'
import { injectEventPluginOrder, injectEventPluginsByName, plugins } from './plugin-registry'
import { executeDispatchesInOrder } from './plugin-utils'
import SyntheticEvent from './synthetic-event'

let eventQueue: SyntheticEvent[] | SyntheticEvent = null

export const injection = {
  injectEventPluginOrder,
  injectEventPluginsByName,
}

function executeDispatchesAndReleaseTopLevel(event: SyntheticEvent) {
  if (event) {
    executeDispatchesInOrder(event)
  }

  if (!event.isPersistent()) {
    (event.constructor as any).release(event)
  }
}

function extractEvents(topLevelType: TopLevelType, targetInst: Fiber, nativeEvent: AnyNativeEvent, nativeEventTarget: EventTarget): SyntheticEvent[] | SyntheticEvent {
  return plugins.reduce((events: SyntheticEvent[] | SyntheticEvent, plugin: PluginModule<any>): SyntheticEvent[] | SyntheticEvent => {
    const extractedEvents = plugin.extractEvents(topLevelType, targetInst, nativeEvent, nativeEventTarget)

    if (extractEvents) {
      events = accumulateInto(extractedEvents, events)
    }
    return events
  }, null)
}

function runEventsInBatch(events: SyntheticEvent[] | SyntheticEvent) {
  if (events !== null) {
    eventQueue = accumulateInto(eventQueue, events)
  }

  const processingEventQueue = eventQueue
  eventQueue = null

  if (!processingEventQueue) {
    return
  }

  forEachAccumulated(processingEventQueue, executeDispatchesAndReleaseTopLevel)
}

function runExtractedEventsInBatch(topLevelType: TopLevelType, targetInst: Fiber, nativeEvent: AnyNativeEvent, nativeEventTarget: EventTarget) {
  const events = extractEvents(topLevelType, targetInst, nativeEvent, nativeEventTarget)
  runEventsInBatch(events)
}

export {
  runExtractedEventsInBatch,
}
