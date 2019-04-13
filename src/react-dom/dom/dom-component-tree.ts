import { Fiber } from '../../react-fiber/fiber'
import { HostComponent, HostText } from '../../react-type/tag-type'

const randomKey = Math.random().toString(36).slice(2)

const internalInstanceKey = '__reactInternalInstance$' + randomKey
const internalEventHandlersKey = '__reactEventHandlers$' + randomKey

function precacheFiberNode(hostInst: Fiber, node: Element | Text) {
  node[internalInstanceKey] = hostInst
}

function updateFiberProps(node: Element, props: any) {
  node[internalEventHandlersKey] = props
}

function getInstanceFromNode(node: Element): Fiber {
  const inst = node[internalInstanceKey]
  if (inst && (inst.tag === HostComponent || inst.tag === HostText)) {
    return inst
  }
  return null
}

function getNodeFromInstance(inst: Fiber): Element {
  if (inst.tag === HostComponent || inst.tag === HostText) {
    return inst.stateNode
  }
}

function getFiberCurrentPropsFromNode(node: Element): any {
  return node[internalEventHandlersKey] || null
}

export {
  precacheFiberNode,
  updateFiberProps,
  getInstanceFromNode,
  getNodeFromInstance,
  getFiberCurrentPropsFromNode,
}
