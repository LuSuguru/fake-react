interface StackCursor<T> { current: T }

const valueStack: any[] = []
let index: number = -1

function createStack<T>(defaultValue: T): StackCursor<T> {
  return { current: defaultValue }
}

function isEmpty(): boolean {
  return index === -1
}

function pop<T>(cursor: StackCursor<T>) {
  cursor.current = valueStack[index]
  valueStack[index] = null

  index--
}

function push<T>(cursor: StackCursor<T>, value: T) {
  index++
  valueStack[index] = cursor.current
  cursor.current = value
}

export {
  StackCursor,
  createStack,
  isEmpty,
  pop,
  push,
}
