import { ExpirationTime } from '../react-fiber/expiration-time'
import { Fiber } from '../react-fiber/fiber'
import { ClassComponent, ContextProvider } from '../react-type/tag-type'
import Update, { ForceUpdate } from '../react-update/update'
import { enqueueUpdate } from '../react-update/update-queue'
import { markWorkInProgressReceivedUpdate } from '../react-work/begin-work'
import { isFunction } from '../utils/getType'
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
  $$typeof: string,
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

function scheduleWorkOnParentPath(parent: Fiber, renderExpirationTime: ExpirationTime) {
  let node: Fiber = parent
  while (node !== null) {
    const { alternate } = node
    if (node.childExpirationTime < renderExpirationTime) {
      node.childExpirationTime = renderExpirationTime
      if (alternate !== null && alternate.childExpirationTime < renderExpirationTime) {
        alternate.childExpirationTime = renderExpirationTime
      }
    } else if (alternate !== null && alternate.childExpirationTime < renderExpirationTime) {
      alternate.childExpirationTime = renderExpirationTime
    } else {
      break
    }
    node = node.return
  }
}

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

function calculateChangedBits<T>(context: ReactContext<T>, newValue: T, oldValue: T) {
  if (Object.is(oldValue, newValue)) {
    return 0
  } else {
    const { _calculateChangedBits } = context
    const changedBits = isFunction(_calculateChangedBits) ? _calculateChangedBits(oldValue, newValue) : 1073741823

    return changedBits | 0
  }
}

function propagateContextChange(workInProgress: Fiber, context: ReactContext<any>, changedBits: number, renderExpirationTime: ExpirationTime) {
  let fiber: Fiber = workInProgress.child
  if (fiber !== null) {
    fiber.return = workInProgress
  }

  while (fiber != null) {
    let nextFiber: Fiber = fiber.child

    const list = fiber.contextDependencies
    if (list !== null) {

      let dependency: ContextDependency<any> = list.first
      while (dependency !== null) {
        if (dependency.context === context && (dependency.observedBits & changedBits) !== 0) {
          if (fiber.tag === ClassComponent) {
            const update = new Update(renderExpirationTime, ForceUpdate)
            enqueueUpdate(fiber, update)
          }

          if (fiber.expirationTime < renderExpirationTime) {
            fiber.expirationTime = renderExpirationTime
          }

          const { alternate } = fiber
          if (alternate !== null && alternate.effectTag < renderExpirationTime) {
            fiber.expirationTime = renderExpirationTime
          }

          scheduleWorkOnParentPath(fiber.return, renderExpirationTime)

          if (list.expirationTime < renderExpirationTime) {
            list.expirationTime = renderExpirationTime
          }

          break
        }
        dependency = dependency.next
      }
    } else if (fiber.tag === ContextProvider) {
      nextFiber = fiber.type === workInProgress.type ? null : nextFiber
    }

    if (nextFiber !== null) {
      nextFiber.return = fiber
    } else {
      nextFiber = fiber
      while (nextFiber !== null) {
        if (nextFiber === workInProgress) {
          nextFiber = null
          break
        }
        const { sibling } = nextFiber
        if (sibling !== null) {
          sibling.return = nextFiber.return
          nextFiber = sibling
          break
        }
        nextFiber = nextFiber.return
      }
    }
    fiber = nextFiber
  }
}

export {
  popProvider,
  pushProvider,
  prepareToReadContext,
  calculateChangedBits,
  propagateContextChange,
}
