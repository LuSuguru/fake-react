interface ValueTracker {
  getValue(): string,
  setValue(value: string): void,
  stopTracking(): void,
}
interface WrapperState { _valueTracker?: ValueTracker }
type ElementWithValueTracker = HTMLInputElement & WrapperState

function isCheckable(elem: HTMLInputElement) {
  const type = elem.type
  const nodeName = elem.nodeName
  return (
    nodeName &&
    nodeName.toLowerCase() === 'input' &&
    (type === 'checkbox' || type === 'radio')
  )
}

function getValueFromNode(node: HTMLInputElement): string {
  let value = ''
  if (!node) {
    return value
  }

  if (isCheckable(node)) {
    value = node.checked ? 'true' : 'false'
  } else {
    value = node.value
  }

  return value
}

function trackValueOnNode(node: any): ValueTracker {
  const valueField = isCheckable(node) ? 'checked' : 'value'
  const descriptor = Object.getOwnPropertyDescriptor(
    node.constructor.prototype,
    valueField,
  )

  let currentValue = '' + node[valueField]

  if (
    node.hasOwnProperty(valueField) ||
    typeof descriptor === 'undefined' ||
    typeof descriptor.get !== 'function' ||
    typeof descriptor.set !== 'function'
  ) {
    return
  }

  const { get, set } = descriptor
  Object.defineProperty(node, valueField, {
    configurable: true,
    get() {
      return get.call(this)
    },
    set(value) {
      currentValue = '' + value
      set.call(this, value)
    },
  })

  Object.defineProperty(node, valueField, {
    enumerable: descriptor.enumerable,
  })

  const tracker = {
    getValue() {
      return currentValue
    },
    setValue(value) {
      currentValue = '' + value
    },
    stopTracking() {
      node._valueTracker = null
      delete node[valueField]
    },
  }
  return tracker
}

function track(node: ElementWithValueTracker) {
  if (node._valueTracker) {
    return
  }

  node._valueTracker = trackValueOnNode(node)
}

function updateValueIfChanged(node: ElementWithValueTracker) {
  if (!node) {
    return false
  }

  const tracker = node._valueTracker

  if (!tracker) {
    return true
  }

  const lastValue = tracker.getValue()
  const nextValue = getValueFromNode(node)
  if (nextValue !== lastValue) {
    tracker.setValue(nextValue)
    return true
  }
  return false
}

function stopTracking(node: ElementWithValueTracker) {
  const tracker = node._valueTracker
  if (tracker) {
    tracker.stopTracking()
  }
}

export {
  track,
  updateValueIfChanged,
  stopTracking,
}
