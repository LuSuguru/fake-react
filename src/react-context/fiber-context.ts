import { createStack, pop, StackCursor } from './stack'

const contextStackCursor: StackCursor<object> = createStack({})
const didPerFormWorkStackCursor: StackCursor<boolean> = createStack(false)

function popTopLevelContextObject() {
  pop(didPerFormWorkStackCursor)
  pop(contextStackCursor)
}

export {
  popTopLevelContextObject,
}
