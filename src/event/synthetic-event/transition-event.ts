import SyntheticEvent, { addPool } from './index'

class SyntheticTransitionEvent extends SyntheticEvent {
  static Interface = {
    ...SyntheticEvent.Interface,
    relatedTarget: null,
  }
}

export default addPool(SyntheticTransitionEvent)
