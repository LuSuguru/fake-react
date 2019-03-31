import { Container, HostContext } from '../react-dom/dom-component'
import { Fiber } from '../react-fiber/fiber'
import { COMMENT_NODE, DOCUMENT_FRAGMENT_NODE, DOCUMENT_NODE } from '../react-type/html-type'
import { getChildNamespace } from '../utils/dom-namespaces'
import { createStack, pop, push, StackCursor } from './stack'

declare class NoContext { }
const NO_CONTEXT: NoContext = {}

const contextStackCursor: StackCursor<HostContext | NoContext> = createStack(NO_CONTEXT)
const contextFiberStackCursor: StackCursor<Fiber | NoContext> = createStack(NO_CONTEXT)
const rootInstanceStackCursor: StackCursor<Container | NoContext> = createStack(NO_CONTEXT)

function getRootHostContext(rootContainerInstance: any): HostContext {
  const { nodeType, parentNode, documentElement } = rootContainerInstance
  let namespace: string = ''

  switch (nodeType) {
    case DOCUMENT_NODE:
    case DOCUMENT_FRAGMENT_NODE: {
      const root = documentElement

      namespace = root ? root.namespaceURI : getChildNamespace(null, '')
      break
    }
    default: {
      const container: any = nodeType === COMMENT_NODE ? rootContainerInstance. : rootContainerInstance
      const ownNamespace = container.namespaceURI || null
      const type = container.tagName

      namespace = getChildNamespace(ownNamespace, type)
      break
    }
  }
  return namespace
}

function getChildHostContext(parentHostContext: any, type: string) {
  return getChildNamespace(parentHostContext, type)
}

function getRootHostContainer(): Container | NoContext {
  return rootInstanceStackCursor.current
}

function pushHostContainer(fiber: Fiber, nextRootInstance: Container) {
  push(rootInstanceStackCursor, nextRootInstance)
  push(contextFiberStackCursor, fiber)

  push(contextStackCursor, NO_CONTEXT)
  const nextRootContext = getRootHostContext(nextRootInstance)
  pop(contextStackCursor)
  push(contextStackCursor, nextRootContext)
}

function popHostContainer() {
  pop(contextStackCursor)
  pop(contextFiberStackCursor)
  pop(rootInstanceStackCursor)
}

function getHostContext(): HostContext | NoContext {
  return contextStackCursor.current
}

function pushHostContext(fiber: Fiber) {
  const context = contextStackCursor.current
  const nextContext = getChildHostContext(context, fiber.type)

  if (context === nextContext) {
    return
  }

  push(contextStackCursor, nextContext)
  push(contextFiberStackCursor, fiber)
}

function popHostContext(fiber: Fiber) {
  if (contextFiberStackCursor.current !== fiber) {
    return
  }

  pop(contextFiberStackCursor)
  pop(contextStackCursor)
}

export {
  getRootHostContext,
  getChildHostContext,
  getRootHostContainer,
  pushHostContainer,
  popHostContainer,
  getHostContext,
  pushHostContext,
  popHostContext,
}








