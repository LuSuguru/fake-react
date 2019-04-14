import SyntheticEvent, { addPool } from './index'
import SyntheticUiEvent from './ui-event'

class SyntheticFocusEvent extends SyntheticEvent {
  static Interface = {
    ...SyntheticUiEvent.Interface,
    relatedTarget: null,
  }
}

export default addPool(SyntheticFocusEvent)
