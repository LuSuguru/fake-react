import SyntheticEvent, { addPool } from './index'
import SyntheticMouseEvent from './mouse-event'

class SyntheticPointerEvent extends SyntheticEvent {
  static Interface = {
    ...SyntheticMouseEvent.Interface,
    pointerId: null,
    width: null,
    height: null,
    pressure: null,
    tangentialPressure: null,
    tiltX: null,
    tiltY: null,
    twist: null,
    pointerType: null,
    isPrimary: null,
  }
}

export default addPool(SyntheticPointerEvent)
