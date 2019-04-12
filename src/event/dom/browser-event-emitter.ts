import { registrationNameDependencies } from '../plugin-registry'

let reactTopListenersCounter: number = 0
const alreadyListeningTo = {}

const topListenersIDKey = '_reactListenersID' + ('' + Math.random()).slice(2)
function getListeningForDocument(mountAt: Document | Element): boolean {
  if (!mountAt[topListenersIDKey]) {
    mountAt[topListenersIDKey] = reactTopListenersCounter++
    alreadyListeningTo[mountAt[topListenersIDKey]] = {}
  }

  return alreadyListeningTo[mountAt[topListenersIDKey]]
}

function listenTo(registrationName: string, mountAt: Document | Element) {
  const isListening: boolean = getListeningForDocument(mountAt)
  const dependencies: any[] = registrationNameDependencies[registrationName]





}

export {
  listenTo,
}
