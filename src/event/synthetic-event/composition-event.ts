import SyntheticEvent, { addPool } from './index'

class SyntheticCompositionEvent extends SyntheticEvent {
  static Interface = {
    ...SyntheticEvent.Interface,
    data: null,
  }
}

export default addPool(SyntheticCompositionEvent)
