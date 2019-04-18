import { Fiber } from '../react-fiber/fiber'
import { accumulateInto, forEachAccumulated } from '../utils/lib'
import { getListener } from './plugin-hub'
import SyntheticEvent from './synthetic-event'
import { traverseEnterLeave, traverseTwoPhase } from './tree-traversal'

type Phases = 'bubbled' | 'captured'

function listenAtPhase(inst: Fiber, event: SyntheticEvent, phase: Phases) {
  const registrationName = event.dispatchConfig.phasedRegistrationNames[phase]
  return getListener(inst, registrationName)
}

function accumulateDirectionalDispatches(inst: Fiber, phase: Phases, event: SyntheticEvent) {
  const listener = listenAtPhase(inst, event, phase)

  if (listener) {
    if (listener) {
      event._dispatchListeners = accumulateInto(event._dispatchListeners, listener)
      event._dispatchInstances = accumulateInto(event._dispatchInstances, inst)
    }
  }
}

function accumulateDispatches(inst: Fiber, _phase: Phases, event: SyntheticEvent) {
  if (inst && event && event.dispatchConfig.registrationName) {
    const registrationName = event.dispatchConfig.registrationName
    const listener = getListener(inst, registrationName)

    if (listener) {
      event._dispatchListeners = accumulateInto(event._dispatchListeners, listener)
      event._dispatchInstances = accumulateInto(event._dispatchInstances, inst)
    }
  }
}

function accumulateTwoPhaseDispatches(events: SyntheticEvent) {
  function callback(event: SyntheticEvent) {
    if (event && event.dispatchConfig.phasedRegistrationNames) {
      traverseTwoPhase(event._targetInst, accumulateDirectionalDispatches, event) // 捕获和冒泡
    }
  }

  forEachAccumulated(events, callback)
}

function accumulateEnterLeaveDispatches(leave: SyntheticEvent, enter: SyntheticEvent, from: Fiber, to: Fiber) {
  traverseEnterLeave(from, to, accumulateDispatches, leave, enter)
}


export {
  accumulateTwoPhaseDispatches,
  accumulateEnterLeaveDispatches,
}
