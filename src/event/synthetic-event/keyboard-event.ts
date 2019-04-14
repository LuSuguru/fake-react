import getEventCharCode from '../event-info/get-event-char-code'
import getEventKey from '../event-info/get-event-key'
import getEventModifierState from '../event-info/get-event-modifier-state'
import SyntheticEvent, { addPool } from './index'
import SyntheticUiEvent from './ui-event'

class SyntheticKeyboardEvent extends SyntheticEvent {
  static Interface = {
    ...SyntheticUiEvent.Interface,
    key: getEventKey,
    location: null,
    ctrlKey: null,
    shiftKey: null,
    altKey: null,
    metaKey: null,
    repeat: null,
    locale: null,
    getModifierState: getEventModifierState,
    charCode(event: KeyboardEvent) {
      if (event.type === 'keypress') {
        return getEventCharCode(event)
      }
      return 0
    },

    keyCode(event: KeyboardEvent) {
      if (event.type === 'keydown' || event.type === 'keyup') {
        return event.keyCode
      }
      return 0
    },
    which(event: KeyboardEvent) {
      if (event.type === 'keypress') {
        return getEventCharCode(event)
      }
      if (event.type === 'keydown' || event.type === 'keyup') {
        return event.keyCode
      }
      return 0
    },
  }
}

export default addPool(SyntheticKeyboardEvent)
