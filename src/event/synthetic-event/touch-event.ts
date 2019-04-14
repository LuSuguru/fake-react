import getEventModifierState from '../event-info/get-event-modifier-state'
import SyntheticEvent, { addPool } from './index'
import SyntheticUiEvent from './ui-event'

class SyntheticTouchEvent extends SyntheticEvent {
  static Interface = {
    ...SyntheticUiEvent.Interface,
    touches: null,
    targetTouches: null,
    changedTouches: null,
    altKey: null,
    metaKey: null,
    ctrlKey: null,
    shiftKey: null,
    getModifierState: getEventModifierState,
  }
}

export default addPool(SyntheticTouchEvent)
