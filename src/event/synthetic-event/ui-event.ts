import SyntheticEvent, { addPool } from './index'

class SyntheticUiEvent extends SyntheticEvent {
  static Interface = {
    ...SyntheticEvent.Interface,
    view: null,
    detail: null,
  }
}

export default addPool(SyntheticUiEvent)
