import SyntheticEvent, { addPool } from './index'

class SyntheticClipboardEvent extends SyntheticEvent {
  static Interface = {
    ...SyntheticEvent.Interface,
    relatedTarget: null,
  }
}

export default addPool(SyntheticClipboardEvent)
