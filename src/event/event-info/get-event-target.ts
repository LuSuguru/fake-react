import { AnyNativeEvent } from '../../react-type/event-type'
import { TEXT_NODE } from '../../react-type/html-type'

function getEventTarget(nativeEvent: AnyNativeEvent): Element | Document {
  let target: any = nativeEvent.target || window

  // svg 特殊处理
  if (target.correspondingUseElement) {
    target = target.correspondingUseElement
  }

  // Safari may fire events on text nodes (Node.TEXT_NODE is 3).
  return target.nodeType === TEXT_NODE ? target.parentNode : target
}

export {
  getEventTarget,
}
