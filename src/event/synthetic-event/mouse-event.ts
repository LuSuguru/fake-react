import { AnyNativeEvent } from '../../react-type/event-type'
import getEventModifierState from '../event-info/get-event-modifier-state'
import SyntheticEvent, { addPool } from './index'
import SyntheticUiEvent from './ui-event'


let previousScreenX: number = 0
let previousScreenY: number = 0

let isMovementXSet: boolean = false
let isMovementYSet: boolean = false

class SyntheticMouseEvent extends SyntheticEvent {
  static Interface = {
    ...SyntheticUiEvent.Interface,
    screenX: null,
    screenY: null,
    clientX: null,
    clientY: null,
    pageX: null,
    pageY: null,
    ctrlKey: null,
    shiftKey: null,
    altKey: null,
    metaKey: null,
    getModifierState: getEventModifierState,
    button: null,
    buttons: null,
    relatedTarget(event: MouseEvent) {
      return (
        event.relatedTarget ||
        (event.fromElement === event.srcElement
          ? event.toElement
          : event.fromElement)
      )
    },
    movementX(event: any) {
      if ('movementX' in event) {
        return event.movementX
      }

      const screenX = previousScreenX
      previousScreenX = event.screenX

      if (!isMovementXSet) {
        isMovementXSet = true
        return 0
      }

      return event.type === 'mousemove' ? event.screenX - screenX : 0
    },
    movementY(event: any) {
      if ('movementY' in event) {
        return event.movementY
      }

      const screenY = previousScreenY
      previousScreenY = event.screenY

      if (!isMovementYSet) {
        isMovementYSet = true
        return 0
      }

      return event.type === 'mousemove' ? event.screenY - screenY : 0
    },
  }
}

export default addPool(SyntheticMouseEvent)
