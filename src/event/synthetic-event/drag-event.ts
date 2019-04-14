import SyntheticEvent, { addPool } from './index'
import SyntheticMouseEvent from './mouse-event'

class SyntheticDragEvent extends SyntheticEvent {
  static Interface = {
    ...SyntheticMouseEvent.Interface,
    dataTransfer: null,
  }
}

export default addPool(SyntheticDragEvent)
