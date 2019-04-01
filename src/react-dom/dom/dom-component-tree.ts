import { Fiber } from '../../react-fiber/fiber'

const randomKey = Math.random().toString(36).slice(2)

const internalInstanceKey = '__reactInternalInstance$' + randomKey
const internalEventHandlersKey = '__reactEventHandlers$' + randomKey

export function precacheFiberNode(hostInst: Fiber, node: object) {
  node[internalInstanceKey] = hostInst
}

export function updateFiberProps(node: Element, props: any) {
  node[internalEventHandlersKey] = props
}
