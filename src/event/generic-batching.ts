import { needsStateRestore, restoreStateIfNeeded } from './controlled-component'
import { BookKeeping } from './dom/dom-event-listener'

let _batchedUpdatesImpl: Function = () => null
let _interactiveUpdatesImpl: Function = () => null
let _flushInteractiveUpdatesImpl: Function = () => null

let isBatching: boolean = false

function setBatchingImplementation(batchedUpdatesImpl: Function, interactiveUpdatesImpl: Function, flushInteractiveUpdatesImpl: Function) {
  _batchedUpdatesImpl = batchedUpdatesImpl
  _interactiveUpdatesImpl = interactiveUpdatesImpl
  _flushInteractiveUpdatesImpl = flushInteractiveUpdatesImpl
}

function interactiveUpdates(fn: Function, a: any, b: any) {
  return _interactiveUpdatesImpl(fn, a, b)
}

function flushInteractiveUpdates() {
  return _flushInteractiveUpdatesImpl()
}

function batchedUpdates(fn: Function, bookKeeping: BookKeeping) {
  if (isBatching) {
    return fn(bookKeeping)
  }

  isBatching = true

  try {
    return _batchedUpdatesImpl(fn, bookKeeping)
  } finally {
    isBatching = false

    const controlledComponentsHavePendingUpdates = needsStateRestore()
    if (controlledComponentsHavePendingUpdates) {
      _flushInteractiveUpdatesImpl()
      restoreStateIfNeeded()
    }
  }
}

export {
  setBatchingImplementation,
  batchedUpdates,
  interactiveUpdates,
  flushInteractiveUpdates,
}
