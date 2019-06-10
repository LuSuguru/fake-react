import SyntheticEvent, { addPool } from './index'
import SyntheticMouseEvent from './mouse-event'

class SyntheticWheelEvent extends SyntheticEvent {
  static Interface = {
    ...SyntheticMouseEvent.Interface,
    deltaX(event: any) {
      return 'deltaX' in event
        ? event.deltaX
        : 'wheelDeltaX' in event
          ? -event.wheelDeltaX
          : 0
    },
    deltaY(event: any) {
      return 'deltaY' in event
        ? event.deltaY
        : 'wheelDeltaY' in event
          ? -event.wheelDeltaY
          : 'wheelDelta' in event
            ? -event.wheelDelta
            : 0
    },

    deltaZ: null,
    deltaMode: null,
  }
}

export default addPool(SyntheticWheelEvent)
