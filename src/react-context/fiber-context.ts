import { ExpirationTime } from '../react-fiber/expiration-time'
import { Fiber } from '../react-fiber/fiber'
import { markWorkInProgressReceivedUpdate } from '../react-work/begin-work'
import { createStack, pop, push, StackCursor } from './stack'

export interface ReactContext<T> {
  $$typeof: string,
  Consumer: ReactContext<T>,
  Provider: ReactProviderType<T>,
  _calculateChangedBits: (a: T, b: T) => number,
  _currentValue: T,
  _threadCount: number,
}

export interface ReactProviderType<T> {
  $$typeof: Symbol | number,
  _context: ReactContext<T>,
}

export interface ContextDependencyList {
  first: ContextDependency<any>,
  expirationTime: ExpirationTime,
}

interface ContextDependency<T> {
  context: ReactContext<T>,
  observedBits: number,
  next: ContextDependency<any>,
}

let currentlyRenderingFiber: Fiber | null = null
let lastContextDependency: ContextDependency<any> = null
let lastContextWithAllBitsObserved: ReactContext<any> = null

const valueCursor: StackCursor<any> = createStack(null)

function popProvider(providerFiber: Fiber): void {
  const currentValue = valueCursor.current

  pop(valueCursor)

  const context = providerFiber.type._context
  context._currentValue = currentValue
}

function pushProvider(providerFiber: Fiber, nextValue: any) {
  const context = providerFiber.type._context
  push(valueCursor, context)

  context._currentValue = nextValue
}

function prepareToReadContext(workInProgress: Fiber, renderExpirationTime: ExpirationTime) {
  currentlyRenderingFiber = workInProgress
  lastContextDependency = null
  lastContextWithAllBitsObserved = null

  const currentDependencies = workInProgress.contextDependencies

  if (currentDependencies !== null && currentDependencies.expirationTime >= renderExpirationTime) {
    markWorkInProgressReceivedUpdate()
  }

  workInProgress.contextDependencies = null
}

export {
  popProvider,
  pushProvider,
  prepareToReadContext,
}
