import { TopLevelType } from '../../react-type/event-type'
import { registrationNameDependencies } from '../plugin-registry'
import { mediaEventTypes, TOP_BLUR, TOP_CANCEL, TOP_CLOSE, TOP_FOCUS, TOP_INVALID, TOP_RESET, TOP_SCROLL, TOP_SUBMIT } from '../top-level-type'
import { trapBubbledEvent, trapCaptureEvent } from './dom-event-listener'

let reactTopListenersCounter: number = 0
const alreadyListeningTo = {}

const topListenersIDKey = '_reactListenersID' + ('' + Math.random()).slice(2)

function isEventSupported(eventNameSuffix: string) {

  const eventName = 'on' + eventNameSuffix
  let isSupported = eventName in document

  if (!isSupported) {
    const element = document.createElement('div')
    element.setAttribute(eventName, 'return;')
    isSupported = typeof element[eventName] === 'function'
  }

  return isSupported
}

function getListeningForDocument(mountAt: Document | Element): any {
  if (!mountAt[topListenersIDKey]) {
    mountAt[topListenersIDKey] = reactTopListenersCounter++
    alreadyListeningTo[mountAt[topListenersIDKey]] = {}
  }

  return alreadyListeningTo[mountAt[topListenersIDKey]]
}

function listenTo(registrationName: string, mountAt: Document | Element) {
  const isListening: any = getListeningForDocument(mountAt)

  const dependencies: TopLevelType[] = registrationNameDependencies[registrationName]

  dependencies.forEach((dependency: TopLevelType) => {
    if (!isListening[dependency]) {
      switch (dependency) {
        case TOP_SCROLL:
          trapCaptureEvent(TOP_SCROLL, mountAt)
          break
        case TOP_FOCUS:
        case TOP_BLUR:
          trapCaptureEvent(TOP_FOCUS, mountAt)
          trapCaptureEvent(TOP_BLUR, mountAt)

          isListening[TOP_FOCUS] = true
          isListening[TOP_BLUR] = true
          break
        case TOP_CANCEL:
        case TOP_CLOSE:
          if (isEventSupported(dependency)) {
            trapCaptureEvent(dependency, mountAt)
          }
          break
        case TOP_INVALID:
        case TOP_SUBMIT:
        case TOP_RESET:
          break
        default:
          const isMediaEvent = mediaEventTypes.indexOf(dependency) !== -1
          if (!isMediaEvent) {
            trapBubbledEvent(dependency, mountAt)
          }
          break
      }
    }
    isListening[dependency] = true
  })
}

function isListeningToAllDependencies(registrationName: string, mountAt: Document | Element) {
  const isListening = getListeningForDocument(mountAt)

  const dependencies: TopLevelType[] = registrationNameDependencies[registrationName]
  dependencies.forEach((dependency: TopLevelType) => {
    if (!isListening[dependency]) {
      return false
    }
  })
  return true
}

export {
  listenTo,
  isListeningToAllDependencies,
}
