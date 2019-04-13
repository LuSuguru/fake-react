import { injection as EventPluginHubInjection } from '../event/plugin-hub'
import { setComponentTree } from '../event/plugin-utils'
import { getFiberCurrentPropsFromNode, getInstanceFromNode, getNodeFromInstance } from './dom/dom-component-tree'




EventPluginHubInjection.injectEventPluginOrder([
  'ResponderEventPlugin',
  'SimpleEventPlugin',
  'EnterLeaveEventPlugin',
  'ChangeEventPlugin',
  'SelectEventPlugin',
  'BeforeInputEventPlugin',
])

setComponentTree(
  getFiberCurrentPropsFromNode,
  getInstanceFromNode,
  getNodeFromInstance,
)

EventPluginHubInjection.injectEventPluginsByName({
  SimpleEventPlugin,
  EnterLeaveEventPlugin,
  ChangeEventPlugin,
  SelectEventPlugin,
  BeforeInputEventPlugin,
})
