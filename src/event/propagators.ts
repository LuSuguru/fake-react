import { Fiber } from '../react-fiber/fiber'
import { forEachAccumulated } from '../utils/lib'
import SyntheticEvent from './synthetic-event'
import { traverseEnterLeave, traverseTwoPhase } from './tree-traversal'

function accumulateDirectionalDispatches() {
  // 待实现
}

function accumulateDispatches() {
  // 待实现
}

function accumulateTwoPhaseDispatches(events: SyntheticEvent) {
  function callback(event: SyntheticEvent) {
    if (event && event.dispatchConfig.phasedRegistrationNames) {
      traverseTwoPhase(event._targetInst, accumulateDirectionalDispatches, event) // 捕获和冒泡
    }
  }

  forEachAccumulated(events, callback)
}

export function accumulateEnterLeaveDispatches(leave: SyntheticEvent, enter: SyntheticEvent, from: Fiber, to: Fiber) {
  traverseEnterLeave(from, to, accumulateDispatches, leave, enter)
}


export {
  accumulateTwoPhaseDispatches,
}
