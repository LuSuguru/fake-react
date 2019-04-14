import { injection as EventPluginHubInjection } from '../event/plugin-hub'
import { setComponentTree } from '../event/plugin-utils'
import { getFiberCurrentPropsFromNode, getInstanceFromNode, getNodeFromInstance } from './dom/dom-component-tree'

import EnterLeaveEventPlugin from '../event/dom/enter-leave-enent-plugin'
import SimpleEventPlugin from '../event/dom/simple-event-plugin'


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
