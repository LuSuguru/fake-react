import { Fiber } from '../react-fiber/fiber'
import { createStack, pop, StackCursor } from './stack'

const valueCursor: StackCursor<any> = createStack(null)

function popProvider(providerFiber: Fiber): void {
  const currentValue = valueCursor.current

  pop(valueCursor)

  const context = providerFiber.type._context
  context._currentValue = currentValue
}

export {
  popProvider,
}
