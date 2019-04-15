import { registrationNameDependencies } from '../plugin-registry'

let reactTopListenersCounter: number = 0
const alreadyListeningTo = {}

const topListenersIDKey = '_reactListenersID' + ('' + Math.random()).slice(2)

function getListeningForDocument(mountAt: Document | Element): any {
  if (!mountAt[topListenersIDKey]) {
    mountAt[topListenersIDKey] = reactTopListenersCounter++
    alreadyListeningTo[mountAt[topListenersIDKey]] = {}
  }

  return alreadyListeningTo[mountAt[topListenersIDKey]]
}

function listenTo(registrationName: string, mountAt: Document | Element) {
  const isListening: any = getListeningForDocument(mountAt)

  const dependencies: string[] = registrationNameDependencies[registrationName]
  dependencies.forEach((dependency: string) => {
    if (isListening[dependency]) {

    }

    isListening[dependency] = true
  })
}

function isListeningToAllDependencies(registrationName: string, mountAt: Document | Element) {
  const isListening = getListeningForDocument(mountAt)

  const dependencies: any[] = registrationNameDependencies[registrationName]
  dependencies.forEach((dependency: string) => {
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
