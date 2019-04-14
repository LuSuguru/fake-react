import SyntheticEvent, { addPool } from './index'

class SyntheticAnimationEvent extends SyntheticEvent {
  static Interface = {
    ...SyntheticEvent.Interface,
    relatedTarget: null,
  }
}

export default addPool(SyntheticAnimationEvent)
